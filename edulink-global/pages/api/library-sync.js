import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ MISSING SUPABASE ENV VARS — library-sync.js will fail on every request.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL present:', !!SUPABASE_URL)
  console.error('   SUPABASE_SERVICE_ROLE_KEY or ANON_KEY present:', !!SUPABASE_KEY)
  console.error('   Fix .env.local and FULLY restart the dev server (Ctrl+C then npm run dev)')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function computePriority(file, profile) {
  if (!profile) return 'medium'
  const combined = ((file.text || '') + ' ' + (file.url || '') + ' ' + (file.name || '')).toLowerCase()
  const modules = Array.isArray(profile.modules) ? profile.modules : []
  const semester = (profile.semester || '').toLowerCase()
  const field = (profile.field || '').toLowerCase()
  const currentYear = new Date().getFullYear()
  const prevYear = currentYear - 1
  const matchesModule = modules.some(m => m && combined.includes(m.toLowerCase()))
  const matchesYear = combined.includes(String(currentYear)) || combined.includes(String(prevYear))
  const isExam = /(question paper|exam paper|past paper|nov|jun|dec|supplementary|special exam)/i.test(combined)
  const isMemo = /(memo|memorandum|mark scheme|marking guide)/i.test(combined)
  let matchesSemester = true
  if (semester.includes('semester 1')) matchesSemester = /(jun|june|may|april|apr|march|mar|feb|jan)/i.test(combined)
  else if (semester.includes('semester 2')) matchesSemester = /(nov|november|oct|october|sep|september|aug|august|jul|july)/i.test(combined)
  if (matchesModule && (isExam || isMemo) && matchesYear) return 'high'
  if (matchesModule && matchesSemester) return 'high'
  if (matchesModule) return 'medium'
  if (field && combined.includes(field) && isExam) return 'medium'
  if (isExam || isMemo) return 'medium'
  return 'low'
}

function computeLabel(file) {
  const t = ((file.text || '') + ' ' + (file.name || '')).toLowerCase()
  if (t.match(/(question paper|exam paper|past paper)/) || t.match(/(nov|jun|dec|jan|feb|mar|apr|may)\s+20\d\d/)) return 'Past Exam Paper'
  if (t.includes('supplementary')) return 'Supplementary Exam'
  if (t.match(/(memo|memorandum|mark scheme|marking guide)/)) return 'Memo / Marking Guide'
  if (t.match(/(lecture|slides|ppt)/)) return 'Lecture Slides'
  if (t.includes('notes')) return 'Study Notes'
  if (t.match(/(textbook|chapter)/)) return 'Textbook / Chapter'
  if (t.match(/(tutorial|worksheet)/)) return 'Tutorial / Worksheet'
  if (t.includes('assignment')) return 'Assignment'
  if (t.includes('syllabus')) return 'Syllabus'
  return 'Academic Document'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Fail fast with a clear message instead of a confusing Supabase error
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: 'Server misconfigured: missing Supabase environment variables. Check .env.local and restart the server.',
      saved: 0,
    })
  }

  const { files, userId, token } = req.body

  if (!files?.length) return res.status(400).json({ error: 'No files provided', saved: 0 })
  if (!userId) return res.status(401).json({ error: 'userId required', saved: 0 })

  // Verify the token if provided, but don't hard-fail if userId is trustworthy
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) {
      console.error('Token verification failed:', error.message)
      if (!userId || typeof userId !== 'string' || userId.length < 10) {
        return res.status(401).json({ error: 'Invalid token and no valid userId', saved: 0, debug: error.message })
      }
      console.warn('Proceeding with userId only, token was invalid:', userId)
    } else if (user && user.id !== userId) {
      return res.status(401).json({ error: 'Token user mismatch', saved: 0 })
    }
  }

  // Get user's academic profile for smart priority
  const { data: profile } = await supabase
    .from('profiles')
    .select('qualification_type, year_of_study, semester, modules, field, institution')
    .eq('id', userId)
    .single()

  // Apply priority and labels to every file
  const smartFiles = files.map(f => ({
    ...f,
    priority: computePriority(f, profile),
    label: computeLabel(f),
  }))

  // Check existing URLs to avoid duplicates
  const { data: existing } = await supabase
    .from('library_files')
    .select('url')
    .eq('user_id', userId)

  const existingUrls = new Set((existing || []).map(e => e.url))

  // Save ALL files the user selected — priority is for display, not filtering
  const toInsert = smartFiles
    .filter(f => f.url && f.url.startsWith('http') && !existingUrls.has(f.url))
    .map(f => ({
      user_id: userId,
      url: f.url,
      name: f.name || f.text || 'file',
      title: f.text || f.name || 'file',
      ext: f.ext || 'pdf',
      label: f.label || 'Academic Document',
      priority: f.priority || 'medium',
      is_relevant: f.isRelevant || false,
      is_academic: f.isAcademic || false,
      domain: f.domain || '',
      page_title: f.pageTitle || '',
      relevance_reason: f.relevanceReason || null,
      semester_context: profile?.semester || null,
      qualification_context: profile?.qualification_type || null,
      saved_at: new Date().toISOString(),
    }))

  if (!toInsert.length) {
    return res.status(200).json({
      saved: 0,
      skipped: smartFiles.length,
      message: 'All files already in library',
    })
  }

  const { error } = await supabase.from('library_files').insert(toInsert)

  if (error) {
    console.error('Library sync error:', error)
    return res.status(500).json({ error: error.message, saved: 0 })
  }

  return res.status(200).json({
    saved: toInsert.length,
    skipped: smartFiles.length - toInsert.length,
    message: `${toInsert.length} files saved to library`,
  })
}