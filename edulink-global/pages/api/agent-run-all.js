import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Protect with a simple secret so only your cron job can trigger it
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.AGENT_CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: users } = await supabase.from('profiles').select('id')
  if (!users?.length) return res.status(200).json({ processed: 0 })

  let processed = 0
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  for (const u of users) {
    try {
      await fetch(`${baseUrl}/api/agent-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id }),
      })
      processed++
    } catch (e) {
      console.error(`Agent failed for user ${u.id}:`, e.message)
    }
  }

  return res.status(200).json({ processed, total: users.length })
}