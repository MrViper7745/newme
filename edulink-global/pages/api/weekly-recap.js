// pages/api/weekly-recap.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const secret = req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [sessRes, chalRes, convsRes, langRes] = await Promise.all([
    supabase.from('study_sessions').select('id').eq('user_id', user_id).gte('session_date', weekAgo.split('T')[0]).eq('completed', true),
    supabase.from('challenge_attempts').select('id,passed,percentage').eq('user_id', user_id).gte('completed_at', weekAgo).eq('completed', true),
    supabase.from('bot_conversations').select('id').eq('user_id', user_id).gte('created_at', weekAgo),
    supabase.from('language_progress').select('streak').eq('user_id', user_id).order('streak', { ascending: false }).limit(1),
  ])
  const challenges = chalRes.data || []
  return res.status(200).json({
    sessions: sessRes.data?.length || 0,
    challenges: challenges.length,
    challengesPassed: challenges.filter(c => c.passed).length,
    avgScore: challenges.length ? Math.round(challenges.reduce((s, c) => s + (c.percentage || 0), 0) / challenges.length) : 0,
    conversations: convsRes.data?.length || 0,
    streak: langRes.data?.[0]?.streak || 0,
  })
}