// Call this endpoint weekly via Vercel Cron or an external scheduler
// Add to vercel.json: { "crons": [{ "path": "/api/weekly-summary", "schedule": "0 8 * * 1" }] }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end()

  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.AGENT_CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get all users who have email notifications enabled
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email:id, notifications_email')
    .eq('notifications_email', true)
    .limit(500)

  if (!profiles?.length) return res.status(200).json({ sent: 0 })

  let sent = 0
  for (const profile of profiles) {
    try {
      // Get user's email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      // Gather weekly stats
      const [sessionsRes, practiceRes, convsRes, langRes, insightsRes] = await Promise.all([
        supabase.from('study_sessions').select('id').eq('user_id', profile.id).gte('session_date', weekAgo.split('T')[0]).eq('completed', true),
        supabase.from('practice_attempts').select('id').eq('user_id', profile.id).gte('created_at', weekAgo).eq('completed', true),
        supabase.from('bot_conversations').select('id').eq('user_id', profile.id).gte('created_at', weekAgo),
        supabase.from('language_progress').select('streak').eq('user_id', profile.id).order('streak', { ascending: false }).limit(1),
        supabase.from('agent_insights').select('title').eq('user_id', profile.id).eq('dismissed', false).order('priority').limit(3),
      ])

      const streak = langRes.data?.[0]?.streak || 0
      const sessions = sessionsRes.data?.length || 0
      const practice = practiceRes.data?.length || 0
      const conversations = convsRes.data?.length || 0

      // Only send if user has been active
      if (sessions + practice + conversations === 0) continue

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-notification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: `📊 Your EduLink week in review, ${profile.name?.split(' ')[0] || 'Student'}`,
          type: 'weekly_summary',
          data: { name: profile.name?.split(' ')[0], sessions, practice, conversations, streak, insights: insightsRes.data || [] },
        }),
      })
      sent++
      // Rate limit
      await new Promise(r => setTimeout(r, 100))
    } catch {}
  }

  return res.status(200).json({ sent, total: profiles.length })
}