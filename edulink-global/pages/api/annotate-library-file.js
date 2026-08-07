// pages/api/annotate-library-file.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { user_id, file_id, annotation } = req.body
  if (!user_id || !file_id || !annotation) return res.status(400).json({ error: 'Missing fields' })
  const { data: session } = await supabase.from('library_sessions').select('annotations').eq('user_id', user_id).eq('file_id', file_id).single()
  const existing = session?.annotations || []
  const updated = [{ ...annotation, id: `ann_${Date.now()}`, created_at: new Date().toISOString() }, ...existing]
  await supabase.from('library_sessions').upsert({ user_id, file_id, annotations: updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id,file_id' })
  return res.status(200).json({ ok: true, annotations: updated })
}