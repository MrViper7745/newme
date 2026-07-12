import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', '') || '')
  const uid = user?.id || req.body?.user_id

  if (req.method === 'POST') {
    const { file_id, file_title, messages } = req.body
    if (!uid || !file_id) return res.status(400).json({ error: 'Missing params' })
    const { error } = await supabase.from('library_sessions').upsert({
      user_id: uid,
      file_id,
      file_title,
      messages,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,file_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const { file_id } = req.query
    const query = supabase.from('library_sessions').select('*').eq('user_id', uid)
    if (file_id) query.eq('file_id', file_id)
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ sessions: data || [] })
  }

  return res.status(405).end()
}