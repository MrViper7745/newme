import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id, current_file_id, module_label } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  // Find other files in the same module/label the student has interacted with
  const { data: relatedFiles } = await supabase
    .from('library_files')
    .select('id, title, label, last_opened')
    .eq('user_id', user_id)
    .neq('id', current_file_id || '')
    .eq('label', module_label || '')
    .not('last_opened', 'is', null)
    .order('last_opened', { ascending: false })
    .limit(3)

  if (!relatedFiles?.length) return res.status(200).json({ sessions: [] })

  // Pull short summaries from their recent sessions
  const fileIds = relatedFiles.map(f => f.id)
  const { data: sessions } = await supabase
    .from('library_sessions')
    .select('file_id, file_title, messages')
    .eq('user_id', user_id)
    .in('file_id', fileIds)

  const summarized = (sessions || []).map(s => ({
    file_title: s.file_title,
    last_topics: (s.messages || [])
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content),
  }))

  return res.status(200).json({ sessions: summarized })
}