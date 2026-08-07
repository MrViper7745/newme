import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { user_id, subscription } = req.body
  if (!user_id || !subscription) return res.status(400).json({ error: 'Missing fields' })

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id,
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription),
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' })

  if (error) return res.status(400).json({ error: error.message })
  return res.status(200).json({ ok: true })
}