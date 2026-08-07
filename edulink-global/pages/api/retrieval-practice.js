// pages/api/retrieval-practice.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sessions } = await supabase.from('library_sessions').select('file_id,updated_at,conversation').eq('user_id', user_id)
    .or(`updated_at.lte.${threeDaysAgo},updated_at.lte.${oneWeekAgo},updated_at.lte.${twoWeeksAgo}`)
    .order('updated_at', { ascending: true }).limit(5)
  return res.status(200).json({ sessions: sessions || [], due_count: sessions?.length || 0 })
}