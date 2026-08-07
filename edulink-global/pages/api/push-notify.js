import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Generate VAPID keys once: npx web-push generate-vapid-keys
// Add to .env.local: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@edulinkglobal.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { user_id, title, body, url, icon } = req.body
  if (!user_id || !title) return res.status(400).json({ error: 'Missing fields' })

  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(200).json({ skipped: true, reason: 'VAPID keys not configured' })
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user_id)

  if (!subs?.length) return res.status(200).json({ sent: 0, reason: 'No subscriptions' })

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: url || '/' },
  })

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(JSON.parse(sub.subscription), payload)
      sent++
    } catch (err) {
      if (err.statusCode === 410) {
        // Subscription expired — remove it
        await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription)
      }
    }
  }

  return res.status(200).json({ sent })
}