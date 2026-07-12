import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })

  // Validate format
  const clean = username.trim().toLowerCase()
  if (clean.length < 3) return res.status(200).json({ available: false, reason: 'Username must be at least 3 characters' })
  if (clean.length > 24) return res.status(200).json({ available: false, reason: 'Username must be 24 characters or less' })
  if (!/^[a-z0-9_.-]+$/.test(clean)) return res.status(200).json({ available: false, reason: 'Only letters, numbers, underscores, dots, and hyphens allowed' })
  if (/^[._-]|[._-]$/.test(clean)) return res.status(200).json({ available: false, reason: 'Cannot start or end with a special character' })

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', clean)
    .limit(1)

  return res.status(200).json({ available: !data?.length, clean })
}