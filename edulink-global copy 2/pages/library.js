import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const FILE_ICON = { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈', zip: '🗜️', mp4: '🎬', mp3: '🎵', epub: '📚', txt: '📋' }
const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#64748b' }
const LABEL_COLOR = {
  'Past Exam Paper': '#ef4444',
  'Memo / Marking Guide': '#10b981',
  'Lecture Slides': '#2563eb',
  'Study Notes': '#8b5cf6',
  'Textbook / Chapter': '#f59e0b',
  'Tutorial / Worksheet': '#06b6d4',
  'Supplementary Exam': '#f97316',
  'Assignment': '#ec4899',
}

async function streamChat (messages, onChunk, onDone, onError) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { onDone(full); return }
        try { const p = JSON.parse(d); if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function Library () {
  const { user, profile } = useUser()
  const router = useRouter()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterLabel, setFilterLabel] = useState('all')
  const [filterDomain, setFilterDomain] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [selectedFile, setSelectedFile] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [toast, setToast] = useState(null)

  // PDF viewer
  const [showPdf, setShowPdf] = useState(false)

  // AI panel
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStream, setAiStream] = useState('')
  const [relatedResources, setRelatedResources] = useState(null)
  const [loadingResources, setLoadingResources] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const aiBottomRef = useRef(null)
  const saveTimeout = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) loadFiles() }, [user])
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages, aiStream])

  // Auto-save session when messages change
  useEffect(() => {
    if (!user || !selectedFile || aiMessages.length < 2) return
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveSession(), 2000)
  }, [aiMessages])

  // Bridge: receive files from extension via localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const raw = localStorage.getItem('edulinkFiles')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed.length > 0 && user) {
            syncLocalToSupabase(parsed)
            localStorage.removeItem('edulinkFiles')
          }
        } catch {}
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [user])

  // Also listen for postMessage from extension
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'EDULINK_SAVE_FILES' && e.data.files) {
        syncLocalToSupabase(e.data.files)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [user])

  const syncLocalToSupabase = async (localFiles) => {
    if (!user || !localFiles.length) return
    const toSave = localFiles.filter(f => f.isRelevant || f.isAcademic || f.priority === 'high')
    if (!toSave.length) return

    const { data: existing } = await supabase.from('library_files').select('url').eq('user_id', user.id)
    const existingUrls = new Set((existing || []).map(e => e.url))

    const newFiles = toSave
      .filter(f => !existingUrls.has(f.url))
      .map(f => ({
        user_id: user.id,
        url: f.url,
        name: f.name || f.text || 'file',
        title: f.text || f.name || 'file',
        ext: f.ext || 'pdf',
        label: f.label || 'Academic Document',
        priority: f.priority || 'medium',
        is_relevant: f.isRelevant || false,
        is_academic: f.isAcademic || false,
        domain: f.domain || '',
        page_title: f.pageTitle || f.pageTitle || '',
        relevance_reason: f.relevanceReason || null,
        saved_at: f.savedAt || new Date().toISOString(),
      }))

    if (newFiles.length) {
      await supabase.from('library_files').insert(newFiles)
      loadFiles()
      showToast(`✅ ${newFiles.length} files synced to your library!`)
    }
  }

  const loadFiles = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('library_files')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  const deleteFile = async (id) => {
    await supabase.from('library_files').delete().eq('id', id)
    setFiles(p => p.filter(f => f.id !== id))
    if (selectedFile?.id === id) setSelectedFile(null)
    showToast('Removed from library')
  }

  // ── OPEN FILE WITH AI ──────────────────────────────────────────
  const openFile = async (file) => {
    setSelectedFile(file)
    setShowPdf(false)
    setRelatedResources(null)

    // Update last opened
    await supabase.from('library_files').update({ last_opened: new Date().toISOString() }).eq('id', file.id)

    // Load existing session
    const { data: session } = await supabase
      .from('library_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_id', file.id)
      .single()

    if (session?.messages?.length > 0) {
      setAiMessages(session.messages)
      showToast('📚 Previous session restored')
    } else {
      setAiMessages([{
        role: 'assistant',
        content: `📄 I've opened **${file.title || file.name}** for you.\n\n${file.label ? `This looks like a **${file.label}**.` : ''} ${file.relevance_reason ? `It matches: ${file.relevance_reason}.` : ''}\n\nI can help you with:\n• **Explaining** what this document contains\n• **Answering every question** in this exam paper with full working\n• **Breaking down** difficult concepts step by step\n• **Finding YouTube videos** and other resources on any topic\n• **Quizzing you** to test your understanding\n\nWhat would you like to do?`,
      }])
    }
  }

  const saveSession = async () => {
    if (!user || !selectedFile || aiMessages.length < 2) return
    await supabase.from('library_sessions').upsert({
      user_id: user.id,
      file_id: selectedFile.id,
      file_title: selectedFile.title || selectedFile.name,
      messages: aiMessages,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,file_id' })
  }

  // ── EXTRACT TEXT FROM PDF URL ──────────────────────────────────
  const extractPdfText = async (url) => {
    if (!url || url === '#') return null
    try {
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) return null
      const blob = await res.blob()
      // For text extraction, we'll use a basic approach
      const text = await blob.text()
      // Try to extract readable text from PDF binary
      const matches = text.match(/BT\s*(.*?)\s*ET/gs) || []
      const extracted = matches
        .map(m => m.replace(/BT|ET/g, '').replace(/Tf|Td|TD|Tm|Tj|TJ|T\*|\[|\]|>>/g, ' '))
        .join(' ').replace(/\s+/g, ' ').slice(0, 8000)
      return extracted.length > 100 ? extracted : null
    } catch { return null }
  }

  // ── AI CHAT ────────────────────────────────────────────────────
  const sendMessage = async (quick) => {
    const msg = quick || aiInput.trim()
    if (!msg || aiLoading) return
    setAiInput(''); setAiLoading(true); setAiStream('')

    const newMessages = [...aiMessages, { role: 'user', content: msg }]
    setAiMessages(newMessages)

    // Build context from file
    const fileContext = selectedFile ? `
Document: "${selectedFile.title || selectedFile.name}"
Type: ${selectedFile.label || selectedFile.ext?.toUpperCase()}
Source: ${selectedFile.domain || 'university website'}
URL: ${selectedFile.url || 'not available'}
Field: ${profile?.field || 'Engineering'}
Student modules: ${profile?.skills?.join(', ') || 'not specified'}
${selectedFile.content_text ? `Document content (extracted):\n${selectedFile.content_text.slice(0, 4000)}` : ''}
` : ''

    const systemPrompt = `You are an expert academic AI tutor with deep knowledge in all subjects. You help university students understand their course materials, exam papers, and academic documents.

${fileContext}

Your capabilities and rules:
- Answer ALL academic questions fully and completely — past exam papers, calculations, essays, code, proofs, everything
- Show complete step-by-step working for mathematical and scientific problems
- For exam questions, provide model answers with marking guidance
- When a student struggles, try different explanations (analogies, examples, diagrams described in text)
- Proactively suggest finding YouTube videos or other resources when a concept is difficult
- Be encouraging, patient, and thorough
- Never refuse to help with academic content — your purpose is to help students learn and pass their exams
- If asked about any concept related to the document or course, explain it fully
- For programming questions, provide complete working code
- For engineering problems, show all calculations with units
- Remember previous messages in this session`

    await streamChat(
      [{ role: 'system', content: systemPrompt }, ...newMessages],
      chunk => setAiStream(chunk),
      full => {
        const finalMsgs = [...newMessages, { role: 'assistant', content: full }]
        setAiMessages(finalMsgs)
        setAiStream(''); setAiLoading(false)
        // Auto-find resources if AI mentions struggling
        if (full.toLowerCase().includes("i'll find") || full.toLowerCase().includes('youtube') || full.toLowerCase().includes("let me find resources") || msg.toLowerCase().includes("don't understand") || msg.toLowerCase().includes("confused")) {
          setTimeout(() => findResources(msg), 500)
        }
      },
      err => { showToast('❌ ' + err); setAiLoading(false) }
    )
  }

  const findResources = async (topic) => {
    setLoadingResources(true); setRelatedResources(null)
    let full = ''
    await streamChat([{
      role: 'user',
      content: `Find the best free resources to help a ${profile?.field || 'Engineering'} student understand: "${topic}"
Context: Document is "${selectedFile?.title || selectedFile?.name}", year level: university.

Return JSON ONLY:
{
  "youtube_searches": [
    {"query": "specific YouTube search 1", "why": "what this covers"},
    {"query": "specific YouTube search 2", "why": "what this covers"},
    {"query": "specific YouTube search 3", "why": "what this covers"}
  ],
  "websites": [
    {"name": "Site name", "url": "https://direct-url.com", "desc": "Why this helps"},
    {"name": "Site name 2", "url": "https://url2.com", "desc": "Why this helps"}
  ],
  "pdf_searches": ["search term for free PDFs"],
  "key_concepts": ["concept 1 to revise", "concept 2"],
  "tip": "One specific study tip for this topic"
}`
    }],
      c => { full = c },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
          setRelatedResources(JSON.parse(clean.slice(s, e + 1)))
        } catch {}
        setLoadingResources(false)
      },
      () => setLoadingResources(false)
    )
  }

  // ── FILTER / SORT ──────────────────────────────────────────────
  const domains = [...new Set(files.map(f => f.domain).filter(Boolean))]
  const labels = [...new Set(files.map(f => f.label).filter(Boolean))]

  let display = files
  if (search) display = display.filter(f => (f.title + f.name + f.domain + f.label + f.url).toLowerCase().includes(search.toLowerCase()))
  if (filterPriority !== 'all') display = display.filter(f => f.priority === filterPriority)
  if (filterLabel !== 'all') display = display.filter(f => f.label === filterLabel)
  if (filterDomain !== 'all') display = display.filter(f => f.domain === filterDomain)
  if (sortBy === 'name') display = [...display].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  if (sortBy === 'priority') display = [...display].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))

  const stats = {
    total: files.length,
    high: files.filter(f => f.priority === 'high').length,
    relevant: files.filter(f => f.is_relevant).length,
    domains: domains.length,
    exams: files.filter(f => f.label === 'Past Exam Paper').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1300, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📚 EduLink Library</h1>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
              Your personal academic file library — collected from your university websites. Open any file and the AI tutor will help you understand it completely.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadFiles} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
            <button onClick={() => router.push('/settings?tab=extension')} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🧩 Extension</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { l: 'Total Files', v: stats.total, c: '#2563eb' },
            { l: 'High Priority', v: stats.high, c: '#ef4444' },
            { l: 'Course Match', v: stats.relevant, c: '#10b981' },
            { l: 'Past Exams', v: stats.exams, c: '#f59e0b' },
            { l: 'Websites', v: stats.domains, c: '#8b5cf6' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            Loading your library...
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>Your library is empty</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 28px' }}>
              Install the EduLink browser extension, visit your university website, browse to your exam/past papers page, and click <strong style={{ color: '#f1f5f9' }}>Scan Whole Website</strong> to collect all course materials automatically.
            </div>
            <button onClick={() => router.push('/settings')} style={{ padding: '12px 28px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              🧩 Set Up Extension →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedFile ? '1fr 460px' : '1fr', gap: 24, alignItems: 'start' }}>

            {/* Files panel */}
            <div>
              {/* Controls */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input type="text" placeholder="🔍 Search files..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 180, padding: '9px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                  <option value="all">All Websites</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                  <option value="date">Recent</option>
                  <option value="priority">Priority</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `All (${files.length})`, color: '#2563eb' },
                  { id: 'high', label: `🔴 High Priority (${stats.high})`, color: '#ef4444' },
                ].map(f => (
                  <button key={f.id} onClick={() => setFilterPriority(f.id)} style={{ padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterPriority === f.id ? `${f.color}18` : 'var(--surface)', color: filterPriority === f.id ? f.color : '#64748b', border: `1px solid ${filterPriority === f.id ? f.color + '40' : 'var(--border)'}` }}>{f.label}</button>
                ))}
                {labels.slice(0, 5).map(label => (
                  <button key={label} onClick={() => setFilterLabel(filterLabel === label ? 'all' : label)} style={{ padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterLabel === label ? `${LABEL_COLOR[label] || '#2563eb'}15` : 'var(--surface)', color: filterLabel === label ? (LABEL_COLOR[label] || '#60a5fa') : '#64748b', border: `1px solid ${filterLabel === label ? (LABEL_COLOR[label] || '#2563eb') + '40' : 'var(--border)'}` }}>{label}</button>
                ))}
              </div>

              {/* File grid */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedFile ? 'repeat(auto-fill,minmax(220px,1fr))' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                {display.map(file => (
                  <div key={file.id} style={{
                    background: 'var(--surface)',
                    border: `2px solid ${selectedFile?.id === file.id ? '#2563eb' : file.priority === 'high' ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                    borderRadius: 14, padding: 18, transition: 'all 0.15s', cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 26 }}>{FILE_ICON[file.ext] || '📁'}</span>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {file.priority === 'high' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700 }}>🔴 High</span>}
                        {file.is_relevant && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>📚 Match</span>}
                        {file.label && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${LABEL_COLOR[file.label] || '#64748b'}12`, color: LABEL_COLOR[file.label] || '#94a3b8', fontWeight: 700 }}>{file.label}</span>}
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {file.title || file.name}
                    </div>

                    {file.domain && <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>🌐 {file.domain}</div>}

                    <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
                      <button onClick={() => openFile(file)} style={{ flex: 1, padding: '7px 8px', borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        🤖 Open + AI
                      </button>
                      {file.url && file.url !== '#' && (
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 10, fontWeight: 600, textDecoration: 'none' }} title="Download">⬇</a>
                      )}
                      <button onClick={() => deleteFile(file.id)} style={{ padding: '7px 8px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI + PDF Panel */}
            {selectedFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, overflow: 'hidden', height: 760, position: 'sticky', top: 100 }}>

                {/* Panel header */}
                <div style={{ padding: '13px 16px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', borderBottom: '1px solid rgba(124,58,237,0.2)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>🤖 AI Tutor</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={saveSession} title="Save session" style={{ padding: '4px 9px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>💾 Save</button>
                      <button onClick={() => setShowPdf(!showPdf)} style={{ padding: '4px 9px', borderRadius: 6, background: showPdf ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: showPdf ? '#60a5fa' : '#94a3b8', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {showPdf ? '💬 Chat' : '👁 View File'}
                      </button>
                      <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>×</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {FILE_ICON[selectedFile.ext] || '📁'} {selectedFile.title || selectedFile.name}
                  </div>
                  {selectedFile.label && (
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${LABEL_COLOR[selectedFile.label] || '#64748b'}15`, color: LABEL_COLOR[selectedFile.label] || '#94a3b8', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                      {selectedFile.label}
                    </span>
                  )}
                </div>

                {/* PDF Viewer */}
                {showPdf ? (
                  <div style={{ flex: 1, background: '#f0f0f0', overflow: 'hidden' }}>
                    {selectedFile.url && selectedFile.url !== '#' ? (
                      <iframe
                        src={selectedFile.url}
                        title={selectedFile.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#64748b' }}>
                        <div style={{ fontSize: 36 }}>📄</div>
                        <div style={{ fontSize: 13 }}>Direct preview not available</div>
                        {selectedFile.url && selectedFile.url !== '#' && (
                          <a href={selectedFile.url} target="_blank" rel="noreferrer" style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                            Open in New Tab →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* AI CHAT */
                  <>
                    {/* Quick actions */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
                      {[
                        'What is this about?',
                        'Solve all questions',
                        'Explain question 1',
                        "I don't understand",
                        'Find YouTube videos',
                        'Quiz me',
                        'Give me a summary',
                        'Key formulas',
                      ].map(q => (
                        <button key={q} onClick={() => sendMessage(q)} disabled={aiLoading} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 9, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', whiteSpace: 'nowrap', opacity: aiLoading ? 0.5 : 1 }}>{q}</button>
                      ))}
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {aiMessages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>{msg.role === 'user' ? 'You' : '🤖 AI Tutor'}</div>
                          <div style={{
                            padding: '9px 12px',
                            borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                            background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)',
                            border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                            color: '#e2e8f0', fontSize: 12, lineHeight: 1.7,
                            maxWidth: '95%', whiteSpace: 'pre-wrap',
                          }}
                            dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
                                .replace(/\n/g, '<br/>')
                                .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
                            }}
                          />
                        </div>
                      ))}

                      {(aiLoading || aiStream) && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>🤖 AI Tutor</div>
                          <div style={{ padding: '9px 12px', borderRadius: '12px 12px 12px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 12, lineHeight: 1.7, maxWidth: '95%', whiteSpace: 'pre-wrap' }}>
                            {aiStream || <span style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span>}
                          </div>
                        </div>
                      )}

                      {/* Related resources */}
                      {(loadingResources || relatedResources) && (
                        <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 12 }}>
                          <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 12, marginBottom: 8 }}>🔍 Learning Resources</div>
                          {loadingResources ? (
                            <div style={{ color: '#64748b', fontSize: 11 }}>Finding resources...</div>
                          ) : relatedResources && (
                            <>
                              {relatedResources.youtube_searches?.map((yt, i) => (
                                <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(yt.query)}`} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '6px 9px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 4, textDecoration: 'none' }}>
                                  <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>🎬 {yt.query}</div>
                                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{yt.why}</div>
                                </a>
                              ))}
                              {relatedResources.websites?.map((site, i) => (
                                <a key={i} href={site.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '6px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 4, textDecoration: 'none' }}>
                                  <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>{site.name} →</div>
                                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{site.desc}</div>
                                </a>
                              ))}
                              {relatedResources.tip && <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 }}>💡 {relatedResources.tip}</div>}
                            </>
                          )}
                        </div>
                      )}

                      <div ref={aiBottomRef} />
                    </div>

                    {/* Bottom toolbar */}
                    <div style={{ padding: '7px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => findResources(aiMessages[aiMessages.length - 2]?.content || selectedFile?.title || '')} disabled={loadingResources} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: loadingResources ? 0.6 : 1 }}>
                        🔍 Resources
                      </button>
                      <button onClick={() => sendMessage('Give me a 5-question quiz based on this document')} disabled={aiLoading} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        📝 Quiz
                      </button>
                      <button onClick={() => sendMessage('Solve all the exam questions in this document with full working')} disabled={aiLoading} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        ✍️ Solve All
                      </button>
                    </div>

                    {/* Input */}
                    <div style={{ padding: '9px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, flexShrink: 0 }}>
                      <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !aiLoading) sendMessage() }} disabled={aiLoading}
                        placeholder="Ask anything — questions, explanations, concepts..."
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 9, fontSize: 12, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', color: '#e2e8f0', outline: 'none' }} />
                      <button onClick={() => sendMessage()} disabled={!aiInput.trim() || aiLoading} style={{ padding: '10px 13px', borderRadius: 9, background: aiInput.trim() && !aiLoading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface)', color: aiInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↑</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}
      `}</style>
    </div>
  )
}