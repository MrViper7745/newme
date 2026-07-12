import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, name, field, institution, country, avatar_url')
    .ilike('username', username.trim().toLowerCase())
    .single()

  if (error || !data) return res.status(404).json({ error: 'User not found' })
  return res.status(200).json({ user: data })
}