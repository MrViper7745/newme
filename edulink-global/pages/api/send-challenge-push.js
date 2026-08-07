import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { challenge_id } = req.body

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challenge_id)
    .single()

  if (!challenge) return res.status(404).json({ error: 'Challenge not found' })

  // Get all users with push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id')

  if (!subs?.length) return res.status(200).json({ sent: 0 })

  const uniqueUsers = [...new Set(subs.map(s => s.user_id))]
  const endsAt = new Date(challenge.ends_at)
  const minsLeft = Math.round((endsAt - new Date()) / 60000)

  let sent = 0
  for (const user_id of uniqueUsers) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AGENT_CRON_SECRET}`,
        },
        body: JSON.stringify({
          user_id,
          title: `🔥 New Challenge: ${challenge.title}`,
          body: `${challenge.difficulty} difficulty · ${challenge.total_questions} questions · ${minsLeft} minutes to complete · Earn points!`,
          url: '/challenges',
        }),
      })
      sent++
    } catch {}
  }

  return res.status(200).json({ sent, total: uniqueUsers.length })
}