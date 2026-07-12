import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id, username } = req.body
  if (!user_id || !username) return res.status(400).json({ error: 'user_id and username required' })

  const clean = username.trim().toLowerCase()

  // Check availability again server-side
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', clean)
    .neq('id', user_id)
    .limit(1)

  if (existing?.length) return res.status(409).json({ error: 'Username already taken' })

  const { error } = await supabase
    .from('profiles')
    .update({ username: clean, username_set: true })
    .eq('id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, username: clean })
}