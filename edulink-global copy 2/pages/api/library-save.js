import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  let userId = null
  if (token) {
    const { data } = await supabase.auth.getUser(token)
    userId = data?.user?.id
  }

  // ── SAVE FILES ───────────────────────────────────────────────
  if (req.method === 'POST' && req.body?.action === 'save') {
    const { files, domain, pageTitle, userId: bodyUserId } = req.body
    const uid = userId || bodyUserId
    if (!uid) return res.status(401).json({ error: 'Not authenticated' })
    if (!files?.length) return res.status(400).json({ error: 'No files provided' })

    // Deduplicate and only save relevant/academic/high priority files
    const toSave = files.filter(f => f.isRelevant || f.isAcademic || f.priority === 'high')

    if (!toSave.length) return res.status(200).json({ saved: 0, message: 'No priority files to save' })

    // Check existing
    const { data: existing } = await supabase
      .from('library_files')
      .select('url')
      .eq('user_id', uid)

    const existingUrls = new Set((existing || []).map(e => e.url))

    const newFiles = toSave
      .filter(f => !existingUrls.has(f.url))
      .map(f => ({
        user_id: uid,
        url: f.url,
        name: f.name || f.text || 'file',
        title: f.text || f.name || 'file',
        ext: f.ext || 'pdf',
        label: f.label || 'Academic Document',
        priority: f.priority || 'medium',
        is_relevant: f.isRelevant || false,
        is_academic: f.isAcademic || false,
        domain: f.domain || domain,
        page_title: f.pageTitle || pageTitle,
        relevance_reason: f.relevanceReason || null,
        content_text: null, // filled later when user opens it
        saved_at: new Date().toISOString(),
      }))

    if (!newFiles.length) return res.status(200).json({ saved: 0, message: 'All files already saved' })

    const { error } = await supabase.from('library_files').insert(newFiles)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ saved: newFiles.length, total: toSave.length })
  }

  // ── GET FILES ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const uid = userId || req.query.user_id
    if (!uid) return res.status(401).json({ error: 'Not authenticated' })

    const { data, error } = await supabase
      .from('library_files')
      .select('*')
      .eq('user_id', uid)
      .order('saved_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ files: data || [] })
  }

  // ── UPDATE FILE CONTENT ──────────────────────────────────────
  if (req.method === 'POST' && req.body?.action === 'update_content') {
    const { file_id, content_text, userId: bodyUserId } = req.body
    const uid = userId || bodyUserId
    if (!uid || !file_id) return res.status(400).json({ error: 'Missing params' })
    await supabase.from('library_files').update({ content_text }).eq('id', file_id).eq('user_id', uid)
    return res.status(200).json({ ok: true })
  }

  // ── DELETE FILE ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { file_id, userId: bodyUserId } = req.body
    const uid = userId || bodyUserId
    if (!uid || !file_id) return res.status(400).json({ error: 'Missing params' })
    await supabase.from('library_files').delete().eq('id', file_id).eq('user_id', uid)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}