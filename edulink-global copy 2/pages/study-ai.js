import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

// ─── helpers ────────────────────────────────────────────────────────
const streamFromAPI = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { onDone(full); return }
        try {
          const p = JSON.parse(d)
          if (p.error) { onError(p.error); return }
          if (p.text) { full += p.text; onChunk(full) }
        } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

const safeParseJSON = (text) => {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const arrStart = clean.indexOf('[')
    const arrEnd = clean.lastIndexOf(']')
    const objStart = clean.indexOf('{')
    const objEnd = clean.lastIndexOf('}')
    if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) return JSON.parse(clean.slice(arrStart, arrEnd + 1))
    if (objStart !== -1) return JSON.parse(clean.slice(objStart, objEnd + 1))
    return null
  } catch { return null }
}

const extractText = (file) => new Promise((resolve) => {
  const ext = file.name.split('.').pop().toLowerCase()

  if (['txt', 'md', 'csv', 'json', 'js', 'py', 'html', 'css', 'xml'].includes(ext)) {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsText(file)
    return
  }

  if (ext === 'pdf') {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const binary = e.target.result
        let text = ''
        const streamMatches = binary.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || []
        for (const stream of streamMatches) {
          const content = stream.replace(/stream\r?\n/, '').replace(/\r?\nendstream/, '')
          const readable = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
          if (readable.length > 50) text += readable + '\n'
        }
        if (text.length < 200) {
          const matches = binary.match(/\(([^)]{2,200})\)/g) || []
          text = matches.map(m => m.slice(1, -1)).join(' ')
        }
        if (text.length < 200) {
          text = binary.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
        }
        resolve(text.slice(0, 50000))
      } catch { resolve('') }
    }
    reader.readAsBinaryString(file)
    return
  }

  if (['doc', 'docx'].includes(ext)) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const binary = e.target.result
        let text = binary.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').trim()
        const lines = text.split(/\s{5,}/).filter(chunk => {
          const words = chunk.match(/[a-zA-Z]{3,}/g)
          return words && words.length > 3
        })
        resolve(lines.join('\n').slice(0, 50000))
      } catch { resolve('') }
    }
    reader.readAsBinaryString(file)
    return
  }

  const reader = new FileReader()
  reader.onload = e => resolve(String(e.target.result || ''))
  reader.onerror = () => resolve('')
  reader.readAsText(file)
})

const TABS = [
  { id: 'upload', label: '📂 Upload' },
  { id: 'summary', label: '📋 Summary' },
  { id: 'flashcards', label: '🃏 Flashcards' },
  { id: 'quiz', label: '✅ Quiz' },
  { id: 'exam', label: '📝 Exam' },
  { id: 'mindmap', label: '🧠 Mind Map' },
  { id: 'timeline', label: '📅 Timeline' },
  { id: 'glossary', label: '📖 Glossary' },
  { id: 'chat', label: '💬 Ask AI' },
]

export default function StudyAI() {
  const { user } = useUser()
  const [tab, setTab] = useState('upload')
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [documentText, setDocumentText] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const [summary, setSummary] = useState('')
  const [flashcards, setFlashcards] = useState([])
  const [quizData, setQuizData] = useState([])
  const [examData, setExamData] = useState([])
  const [mindMap, setMindMap] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [glossary, setGlossary] = useState([])

  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  const [cardIndex, setCardIndex] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState(new Set())
  const [glossarySearch, setGlossarySearch] = useState('')

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatStreaming, setChatStreaming] = useState('')
  const chatBottomRef = useRef(null)

  // Keep a ref to activeSession so async callbacks always see latest value
  const activeSessionRef = useRef(null)
  useEffect(() => { activeSessionRef.current = activeSession }, [activeSession])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  useEffect(() => { if (user) fetchSessions() }, [user])
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages, chatStreaming])

  // ── FETCH SESSIONS — only metadata, not full text ──────────────────
  const fetchSessions = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('study_sessions')
      .select('id, title, document_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setSessions(data || [])
  }

  // ── FILE UPLOAD ────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    setFileSize(`${sizeMB} MB`)
    setDocumentName(file.name)
    showToast(`📂 Reading "${file.name}" (${sizeMB} MB)...`)
    try {
      const text = await extractText(file)
      if (!text || text.trim().length < 80) {
        showToast('⚠️ Could not extract enough text. Try copy-pasting the text directly into the box below.')
        setLoading(false)
        return
      }
      setDocumentText(text)
      const words = text.split(/\s+/).filter(Boolean).length
      showToast(`✅ "${file.name}" ready — ${words.toLocaleString()} words extracted`)
    } catch (err) {
      showToast('❌ Could not read file: ' + err.message)
    }
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── SAVE SESSION ──────────────────────────────────────────────────
  const saveSession = async () => {
    if (!user || !documentText) return null
    const current = activeSessionRef.current
    if (current) {
      await supabase.from('study_sessions')
        .update({ document_text: documentText.slice(0, 50000), document_name: documentName })
        .eq('id', current.id)
      return current
    }
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        title: documentName || 'Study Session',
        document_name: documentName,
        document_text: documentText.slice(0, 50000),
      })
      .select()
      .single()
    if (error) { console.error('Save session error:', error); return null }
    setActiveSession(data)
    activeSessionRef.current = data
    fetchSessions()
    return data
  }

  // ── LOAD SESSION — fetch full text on demand ──────────────────────
  const loadSession = async (sessionMeta) => {
    showToast(`📂 Loading "${sessionMeta.title}"...`)
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionMeta.id)
      .single()
    if (error || !data) { showToast('❌ Could not load session'); return }

    setActiveSession(data)
    activeSessionRef.current = data
    setDocumentText(data.document_text || '')
    setDocumentName(data.document_name || data.title)
    setFileSize('')

    // Load saved flashcards
    const { data: cards } = await supabase
      .from('flashcards').select('*').eq('session_id', data.id).order('created_at', { ascending: true })
    setFlashcards(cards?.map(c => ({ front: c.front, back: c.back })) || [])

    // Load saved quiz
    const { data: quizRows } = await supabase
      .from('quizzes').select('*').eq('session_id', data.id)
      .order('created_at', { ascending: false }).limit(1)
    setQuizData(quizRows?.[0]?.questions && Array.isArray(quizRows[0].questions) ? quizRows[0].questions : [])

    // Load saved notes
    const { data: noteRows } = await supabase
      .from('study_notes').select('*').eq('session_id', data.id)
      .order('created_at', { ascending: false }).limit(1)
    setSummary(noteRows?.[0]?.content || '')

    setExamData([]); setMindMap(null); setTimeline([]); setGlossary([])
    setQuizAnswers({}); setQuizSubmitted(false); setChatMessages([])
    setCardIndex(0); setCardFlipped(false); setKnownCards(new Set())
    setTab('upload')
    showToast(`✅ Loaded: "${data.title}"`)
  }

  const deleteSession = async (id) => {
    await supabase.from('study_sessions').delete().eq('id', id)
    if (activeSessionRef.current?.id === id) {
      setActiveSession(null); activeSessionRef.current = null
      setDocumentText(''); setDocumentName('')
    }
    fetchSessions()
  }

  // ── GENERATE ──────────────────────────────────────────────────────
  const generate = async (type) => {
    if (!documentText || documentText.trim().length < 80) {
      showToast('Please upload or paste a document first'); return
    }
    setGenerating(type)
    showToast(`⏳ Generating ${type}... this takes 10-20 seconds`)

    await streamFromAPI(
      { documentText, type },
      (chunk) => { if (type === 'summary') setSummary(chunk) },
      async (full) => {
        // Parse and set state
        if (type === 'summary') {
          setSummary(full)
        } else {
          const parsed = safeParseJSON(full)
          if (parsed) {
            if (type === 'flashcards') { setFlashcards(parsed); setCardIndex(0); setCardFlipped(false); setKnownCards(new Set()) }
            if (type === 'quiz') { setQuizData(parsed); setQuizAnswers({}); setQuizSubmitted(false) }
            if (type === 'exam') setExamData(parsed)
            if (type === 'mindmap') setMindMap(parsed)
            if (type === 'timeline') setTimeline(parsed)
            if (type === 'glossary') setGlossary(parsed)
          } else {
            showToast('⚠️ AI returned unexpected format — try regenerating')
          }
        }

        // Save to Supabase
        if (user) {
          let session = activeSessionRef.current || await saveSession()
          if (session) {
            if (type === 'flashcards') {
              const p = safeParseJSON(full)
              if (p) {
                await supabase.from('flashcards').delete().eq('session_id', session.id)
                await supabase.from('flashcards').insert(p.map(c => ({ ...c, session_id: session.id, user_id: user.id })))
              }
            }
            if (type === 'quiz') {
              const p = safeParseJSON(full)
              if (p) await supabase.from('quizzes').insert({ session_id: session.id, user_id: user.id, questions: p })
            }
            if (type === 'summary') {
              await supabase.from('study_notes').insert({ session_id: session.id, user_id: user.id, content: full })
            }
          }
        }

        setGenerating(null)
        showToast(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} ready!`)
        setTab(type)
      },
      (err) => { showToast('❌ ' + err); setGenerating(null) }
    )
  }

  // ── GENERATE FULL PACK ────────────────────────────────────────────
  const generateFullPack = async () => {
    if (!documentText || documentText.trim().length < 80) {
      showToast('Please upload or paste a document first'); return
    }
    const types = ['summary', 'flashcards', 'quiz', 'exam', 'mindmap', 'timeline', 'glossary']
    for (const type of types) {
      await new Promise(resolve => {
        setGenerating(type)
        streamFromAPI(
          { documentText, type },
          (chunk) => { if (type === 'summary') setSummary(chunk) },
          async (full) => {
            if (type === 'summary') {
              setSummary(full)
            } else {
              const parsed = safeParseJSON(full)
              if (parsed) {
                if (type === 'flashcards') { setFlashcards(parsed); setCardIndex(0); setKnownCards(new Set()) }
                if (type === 'quiz') { setQuizData(parsed); setQuizAnswers({}); setQuizSubmitted(false) }
                if (type === 'exam') setExamData(parsed)
                if (type === 'mindmap') setMindMap(parsed)
                if (type === 'timeline') setTimeline(parsed)
                if (type === 'glossary') setGlossary(parsed)
              }
            }
            if (user) {
              let session = activeSessionRef.current || await saveSession()
              if (session) {
                if (type === 'flashcards') {
                  const p = safeParseJSON(full)
                  if (p) {
                    await supabase.from('flashcards').delete().eq('session_id', session.id)
                    await supabase.from('flashcards').insert(p.map(c => ({ ...c, session_id: session.id, user_id: user.id })))
                  }
                }
                if (type === 'quiz') {
                  const p = safeParseJSON(full)
                  if (p) await supabase.from('quizzes').insert({ session_id: session.id, user_id: user.id, questions: p })
                }
                if (type === 'summary') {
                  await supabase.from('study_notes').insert({ session_id: session.id, user_id: user.id, content: full })
                }
              }
            }
            setGenerating(null)
            resolve()
          },
          () => { setGenerating(null); resolve() }
        )
      })
    }
    showToast('✅ Full study pack generated!')
    setTab('summary')
  }

  // ── QUIZ ──────────────────────────────────────────────────────────
  const submitQuiz = () => {
    let score = 0
    quizData.forEach((q, i) => { if (quizAnswers[i] === q.answer) score++ })
    setQuizScore(score)
    setQuizSubmitted(true)
    showToast(`🎯 ${score}/${quizData.length} correct — ${Math.round((score / quizData.length) * 100)}%`)
  }

  // ── CHAT ──────────────────────────────────────────────────────────
  const sendChat = async (quickText) => {
    const msg = quickText || chatInput.trim()
    if (!msg || !documentText) return
    setChatInput('')
    setChatLoading(true)
    setChatStreaming('')
    const newMessages = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages)
    const systemPrompt = `You are a study assistant helping a student understand a document. Here is the document:\n\n${documentText.slice(0, 8000)}\n\nAnswer questions about this document clearly. Explain concepts, give examples, compare ideas, and help the student understand deeply.`
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...newMessages.map(m => ({ role: m.role, content: m.content }))]
        })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = '', fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') {
            setChatMessages(prev => [...prev, { role: 'assistant', content: fullText }])
            setChatStreaming('')
            setChatLoading(false)
            return
          }
          try { const p = JSON.parse(d); if (p.text) { fullText += p.text; setChatStreaming(fullText) } } catch {}
        }
      }
    } catch { showToast('❌ Chat error') }
    setChatLoading(false)
  }

  const hasDoc = documentText.trim().length > 80
  const wordCount = documentText.split(/\s+/).filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 72, display: 'flex', height: 'calc(100vh - 72px)' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 240, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 8px' }}>
            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15, marginBottom: 2 }}>📚 Study AI</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Upload any document → Learn faster</div>
            <button onClick={() => {
              setActiveSession(null); activeSessionRef.current = null
              setDocumentText(''); setDocumentName(''); setFileSize('')
              setSummary(''); setFlashcards([]); setQuizData([]); setExamData([])
              setMindMap(null); setTimeline([]); setGlossary([]); setChatMessages([]); setTab('upload')
            }} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + New Session
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 10px' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '20px 8px', textAlign: 'center', color: '#374151', fontSize: 11 }}>No sessions yet</div>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s)} style={{
                borderRadius: 9, marginBottom: 5, cursor: 'pointer', padding: '9px 10px',
                background: activeSession?.id === s.id ? 'rgba(37,99,235,0.15)' : 'transparent',
                border: `1px solid ${activeSession?.id === s.id ? 'rgba(37,99,235,0.35)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: '#374151' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 14, padding: '1px 4px' }}>×</button>
              </div>
            ))}
          </div>

          {/* Generate Full Pack */}
          {hasDoc && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: '#374151', marginBottom: 6, textAlign: 'center' }}>
                {generating ? `⏳ ${generating}...` : 'All 7 materials • auto-saved'}
              </div>
              <button onClick={generateFullPack} disabled={!!generating} style={{
                width: '100%', padding: '9px', borderRadius: 9,
                background: generating ? 'var(--surface2)' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
                color: generating ? '#64748b' : '#fff',
                border: 'none', fontWeight: 700, fontSize: 12, cursor: generating ? 'not-allowed' : 'pointer'
              }}>
                ✨ Generate Full Pack
              </button>
            </div>
          )}
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'auto', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { if (t.id !== 'upload' && !hasDoc) { showToast('Upload a document first'); return }; setTab(t.id) }} style={{
                padding: '11px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab === t.id ? 'rgba(37,99,235,0.12)' : 'transparent',
                color: tab === t.id ? '#60a5fa' : '#64748b',
                fontWeight: tab === t.id ? 700 : 500, fontSize: 13,
                borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

            {/* ── UPLOAD TAB ── */}
            {tab === 'upload' && (
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📂 Upload Your Document</h2>
                <p style={{ color: '#64748b', marginBottom: 24 }}>Upload any file — PDF, Word, TXT, Markdown. AI generates a complete study pack.</p>

                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${hasDoc ? '#10b981' : 'var(--border)'}`,
                    borderRadius: 16, padding: '44px 28px', textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                    background: hasDoc ? 'rgba(16,185,129,0.05)' : 'var(--surface)', transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                      <div style={{ color: '#60a5fa', fontWeight: 700 }}>Extracting text...</div>
                    </div>
                  ) : hasDoc ? (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: 17, marginBottom: 4 }}>{documentName}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{wordCount.toLocaleString()} words · {fileSize} · Click to replace</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 52, marginBottom: 16 }}>📂</div>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>Drop any file here or click to browse</div>
                      <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                        PDF · Word (DOC/DOCX) · TXT · Markdown · CSV · Code files<br />
                        <span style={{ color: '#10b981' }}>No strict size limit</span>
                      </div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
                </div>

                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  💡 <strong style={{ color: '#60a5fa' }}>Tip:</strong> For scanned PDFs, copy-paste the text directly into the box below for best results.
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>OR paste your text directly:</div>
                  <textarea
                    value={documentText}
                    onChange={e => { setDocumentText(e.target.value); if (!documentName) setDocumentName('Pasted text') }}
                    placeholder="Paste your notes, textbook content, lecture slides, articles, or any text here..."
                    rows={7}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                  />
                  {documentText && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      {wordCount.toLocaleString()} words · {documentText.length.toLocaleString()} characters
                    </div>
                  )}
                </div>

                {hasDoc && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>✨ Generate Study Materials</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {[
                        { type: 'summary', icon: '📋', label: 'Study Notes', desc: 'Key concepts & structure', color: '#2563eb' },
                        { type: 'flashcards', icon: '🃏', label: 'Flashcards', desc: '15 concept cards', color: '#8b5cf6' },
                        { type: 'quiz', icon: '✅', label: 'Quiz', desc: '12 MCQ questions', color: '#10b981' },
                        { type: 'exam', icon: '📝', label: 'Exam Qs', desc: '8 exam questions', color: '#f59e0b' },
                        { type: 'mindmap', icon: '🧠', label: 'Mind Map', desc: 'Visual concept map', color: '#ef4444' },
                        { type: 'timeline', icon: '📅', label: 'Timeline', desc: 'Events & sequences', color: '#06b6d4' },
                        { type: 'glossary', icon: '📖', label: 'Glossary', desc: 'All key terms defined', color: '#f97316' },
                      ].map(item => (
                        <button key={item.type} onClick={() => generate(item.type)} disabled={!!generating} style={{
                          padding: '14px 12px', borderRadius: 12, cursor: generating ? 'not-allowed' : 'pointer',
                          background: generating === item.type ? `${item.color}20` : 'var(--surface)',
                          border: `1px solid ${generating === item.type ? item.color : 'var(--border)'}`,
                          textAlign: 'left', opacity: generating && generating !== item.type ? 0.45 : 1, transition: 'all 0.2s',
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{generating === item.type ? '⏳' : item.icon}</div>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 2 }}>
                            {generating === item.type ? 'Working...' : item.label}
                          </div>
                          <div style={{ fontSize: 10, color: item.color }}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SUMMARY TAB ── */}
            {tab === 'summary' && (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>📋 AI Study Notes</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {summary && <button onClick={() => { navigator.clipboard.writeText(summary); showToast('📋 Copied!') }} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>📋 Copy</button>}
                    <button onClick={() => generate('summary')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
                      {generating === 'summary' ? '⏳ Generating...' : '🔄 Regenerate'}
                    </button>
                  </div>
                </div>
                {summary ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                    <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.9 }}
                      dangerouslySetInnerHTML={{
                        __html: summary
                          .replace(/## (.*)/g, '<h3 style="color:#60a5fa;font-size:17px;font-weight:800;margin:24px 0 10px;padding-top:8px;border-top:1px solid rgba(96,165,250,0.15)">$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
                          .replace(/^- (.*)/gm, '<div style="display:flex;gap:8px;margin:5px 0;padding-left:4px"><span style="color:#60a5fa;flex-shrink:0;margin-top:2px">•</span><span>$1</span></div>')
                          .replace(/\n\n/g, '<div style="height:8px"></div>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    {generating === 'summary' && <span style={{ display: 'inline-block', width: 2, height: 16, background: '#60a5fa', marginLeft: 4, verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
                  </div>
                ) : (
                  <EmptyState icon="📋" label="No summary yet" buttonLabel={generating === 'summary' ? '⏳ Generating...' : 'Generate Summary'} onClick={() => generate('summary')} disabled={!!generating} />
                )}
              </div>
            )}

            {/* ── FLASHCARDS TAB ── */}
            {tab === 'flashcards' && (
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>🃏 Flashcards</h2>
                    {flashcards.length > 0 && <div style={{ fontSize: 13, color: '#64748b' }}>Card {cardIndex + 1} of {flashcards.length} · {knownCards.size} known · {flashcards.length - knownCards.size} remaining</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setCardIndex(0); setCardFlipped(false); setKnownCards(new Set()) }} style={{ padding: '7px 13px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Reset</button>
                    <button onClick={() => generate('flashcards')} disabled={!!generating} style={{ padding: '7px 13px', borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#2563eb)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 New Set</button>
                  </div>
                </div>

                {flashcards.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 20, flexWrap: 'wrap' }}>
                      {flashcards.map((_, i) => (
                        <div key={i} onClick={() => { setCardIndex(i); setCardFlipped(false) }} style={{
                          flex: 1, minWidth: 8, height: 7, borderRadius: 4, cursor: 'pointer',
                          background: knownCards.has(i) ? '#10b981' : i === cardIndex ? '#2563eb' : 'var(--border)',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>

                    <div onClick={() => setCardFlipped(!cardFlipped)} style={{
                      background: cardFlipped ? 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(6,182,212,0.08))' : 'var(--surface)',
                      border: `2px solid ${cardFlipped ? '#2563eb' : 'var(--border)'}`,
                      borderRadius: 20, padding: '52px 36px', textAlign: 'center', cursor: 'pointer',
                      minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s', marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                        {cardFlipped ? '💡 Answer — tap to go back' : '❓ Question — tap to reveal answer'}
                      </div>
                      <div style={{ fontSize: 19, color: '#f1f5f9', fontWeight: cardFlipped ? 400 : 700, lineHeight: 1.6 }}>
                        {cardFlipped ? flashcards[cardIndex]?.back : flashcards[cardIndex]?.front}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                      <button onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setCardFlipped(false) }} disabled={cardIndex === 0}
                        style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', opacity: cardIndex === 0 ? 0.4 : 1 }}>← Prev</button>
                      {cardFlipped && (
                        <>
                          <button onClick={() => { setKnownCards(p => { const n = new Set(p); n.delete(cardIndex); return n }); setCardIndex(i => Math.min(flashcards.length - 1, i + 1)); setCardFlipped(false) }}
                            style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>😕 Still Learning</button>
                          <button onClick={() => { setKnownCards(p => new Set([...p, cardIndex])); setCardIndex(i => Math.min(flashcards.length - 1, i + 1)); setCardFlipped(false) }}
                            style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 700, cursor: 'pointer' }}>✅ Got It!</button>
                        </>
                      )}
                      <button onClick={() => { setCardIndex(i => Math.min(flashcards.length - 1, i + 1)); setCardFlipped(false) }} disabled={cardIndex === flashcards.length - 1}
                        style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', opacity: cardIndex === flashcards.length - 1 ? 0.4 : 1 }}>Next →</button>
                    </div>

                    {knownCards.size === flashcards.length && (
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '18px 22px', textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                        <div style={{ fontWeight: 700, color: '#10b981', fontSize: 16, marginBottom: 6 }}>All {flashcards.length} cards mastered!</div>
                        <button onClick={() => { setTab('quiz'); if (!quizData.length) generate('quiz') }} style={{ padding: '9px 22px', borderRadius: 9, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Take the Quiz →</button>
                      </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>All {flashcards.length} Cards</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                        {flashcards.map((card, i) => (
                          <div key={i} onClick={() => { setCardIndex(i); setCardFlipped(false); window.scrollTo(0, 0) }} style={{
                            background: knownCards.has(i) ? 'rgba(16,185,129,0.08)' : 'var(--surface)',
                            border: `1px solid ${knownCards.has(i) ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                            borderRadius: 10, padding: 14, cursor: 'pointer',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 5, lineHeight: 1.4 }}>{card.front}</div>
                            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{card.back}</div>
                            {knownCards.has(i) && <div style={{ fontSize: 10, color: '#10b981', marginTop: 5, fontWeight: 700 }}>✅ Known</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState icon="🃏" label="No flashcards yet" buttonLabel={generating === 'flashcards' ? '⏳ Generating...' : 'Generate Flashcards'} onClick={() => generate('flashcards')} disabled={!!generating} color="#8b5cf6" />
                )}
              </div>
            )}

            {/* ── QUIZ TAB ── */}
            {tab === 'quiz' && (
              <div style={{ maxWidth: 740, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>✅ Multiple Choice Quiz</h2>
                  <button onClick={() => generate('quiz')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 New Quiz</button>
                </div>

                {quizSubmitted && (
                  <div style={{ marginBottom: 22, padding: '18px 22px', borderRadius: 14, background: quizScore >= quizData.length * 0.7 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${quizScore >= quizData.length * 0.7 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20 }}>{quizScore >= quizData.length * 0.7 ? '🎉' : '📚'} {quizScore}/{quizData.length} correct</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                        {quizScore === quizData.length ? 'Perfect! Outstanding work!' : quizScore >= quizData.length * 0.7 ? 'Great job! Review the explanations.' : 'Keep studying — review explanations below.'}
                      </div>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: quizScore >= quizData.length * 0.7 ? '#10b981' : '#f59e0b' }}>{Math.round((quizScore / quizData.length) * 100)}%</div>
                  </div>
                )}

                {quizData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {quizData.map((q, i) => {
                      const selected = quizAnswers[i]
                      const isCorrect = selected === q.answer
                      return (
                        <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${quizSubmitted ? (isCorrect ? 'rgba(16,185,129,0.4)' : selected ? 'rgba(239,68,68,0.4)' : 'var(--border)') : 'var(--border)'}`, borderRadius: 14, padding: 20 }}>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, lineHeight: 1.5 }}>{q.question}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {q.options?.map((opt, j) => {
                              const isSelected = selected === opt
                              const isAnswer = opt === q.answer
                              let bg = 'var(--surface2)', border = 'var(--border)', color = '#e2e8f0'
                              if (quizSubmitted) {
                                if (isAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '#10b981'; color = '#10b981' }
                                else if (isSelected) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; color = '#ef4444' }
                              } else if (isSelected) { bg = 'rgba(37,99,235,0.15)'; border = '#2563eb'; color = '#60a5fa' }
                              return (
                                <div key={j} onClick={() => !quizSubmitted && setQuizAnswers(p => ({ ...p, [i]: opt }))} style={{ padding: '10px 14px', borderRadius: 9, cursor: quizSubmitted ? 'default' : 'pointer', background: bg, border: `1px solid ${border}`, color, fontSize: 13, fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s' }}>
                                  {opt}{quizSubmitted && isAnswer && ' ✅'}{quizSubmitted && isSelected && !isAnswer && ' ❌'}
                                </div>
                              )
                            })}
                          </div>
                          {quizSubmitted && q.explanation && (
                            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 9, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                              <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginBottom: 3 }}>💡 EXPLANATION</div>
                              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{q.explanation}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {!quizSubmitted ? (
                      <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < quizData.length} style={{ padding: '13px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', border: 'none', background: Object.keys(quizAnswers).length < quizData.length ? 'var(--surface)' : 'linear-gradient(135deg,#10b981,#059669)', color: Object.keys(quizAnswers).length < quizData.length ? '#64748b' : '#fff' }}>
                        {Object.keys(quizAnswers).length < quizData.length ? `Answer all questions (${Object.keys(quizAnswers).length}/${quizData.length} done)` : 'Submit Quiz →'}
                      </button>
                    ) : (
                      <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(0) }} style={{ padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🔄 Retake Quiz</button>
                    )}
                  </div>
                ) : (
                  <EmptyState icon="✅" label="No quiz yet" buttonLabel={generating === 'quiz' ? '⏳ Generating...' : 'Generate Quiz'} onClick={() => generate('quiz')} disabled={!!generating} color="#10b981" />
                )}
              </div>
            )}

            {/* ── EXAM TAB ── */}
            {tab === 'exam' && (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>📝 Exam Questions</h2>
                  <button onClick={() => generate('exam')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 Regenerate</button>
                </div>
                {examData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {examData.map((q, i) => {
                      const dc = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' }[q.difficulty] || '#64748b'
                      const tc = { 'Short Answer': '#2563eb', 'Essay': '#8b5cf6', 'Application': '#f59e0b', 'Case Study': '#10b981' }[q.type] || '#64748b'
                      return (
                        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 7 }}>
                              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, background: `${tc}18`, color: tc, border: `1px solid ${tc}30`, fontWeight: 700 }}>{q.type}</span>
                              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, background: `${dc}18`, color: dc, border: `1px solid ${dc}30`, fontWeight: 700 }}>{q.difficulty}</span>
                            </div>
                            <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 800 }}>{q.marks} marks</span>
                          </div>
                          <div style={{ padding: '20px 22px' }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>Q{i + 1}</div>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15, lineHeight: 1.6 }}>{q.question}</div>
                            </div>
                            <textarea placeholder="Write your answer here to practice..." rows={q.type === 'Essay' ? 8 : 4}
                              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: 12 }} />
                            {q.model_answer && (
                              <details style={{ borderRadius: 9, overflow: 'hidden' }}>
                                <summary style={{ padding: '10px 14px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 9, cursor: 'pointer', fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>💡 View Model Answer</summary>
                                <div style={{ padding: '14px 16px', background: 'rgba(96,165,250,0.04)', borderRadius: '0 0 9px 9px', fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>{q.model_answer}</div>
                              </details>
                            )}
                            {q.marking_guide && (
                              <details style={{ borderRadius: 9, overflow: 'hidden', marginTop: 8 }}>
                                <summary style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9, cursor: 'pointer', fontSize: 12, color: '#10b981', fontWeight: 700 }}>📊 Marking Guide</summary>
                                <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.04)', borderRadius: '0 0 9px 9px', fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>{q.marking_guide}</div>
                              </details>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState icon="📝" label="No exam questions yet" buttonLabel={generating === 'exam' ? '⏳ Generating...' : 'Generate Exam Questions'} onClick={() => generate('exam')} disabled={!!generating} color="#f59e0b" />
                )}
              </div>
            )}

            {/* ── MIND MAP TAB ── */}
            {tab === 'mindmap' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>🧠 Mind Map</h2>
                  <button onClick={() => generate('mindmap')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 Regenerate</button>
                </div>
                {mindMap ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                      <div style={{ display: 'inline-block', padding: '16px 36px', borderRadius: 50, background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 20, boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}>
                        {mindMap.central}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                      {mindMap.branches?.map((branch, i) => (
                        <div key={i} style={{ background: 'var(--surface)', border: `2px solid ${branch.color}50`, borderRadius: 14, overflow: 'hidden' }}>
                          <div style={{ padding: '14px 18px', background: `${branch.color}18`, borderBottom: `1px solid ${branch.color}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {branch.icon && <span style={{ fontSize: 18 }}>{branch.icon}</span>}
                            <div style={{ fontWeight: 800, color: branch.color, fontSize: 15 }}>{branch.topic}</div>
                          </div>
                          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {branch.subtopics?.map((sub, j) => (
                              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: branch.color, flexShrink: 0, marginTop: 6 }} />
                                <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{sub}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="🧠" label="No mind map yet" buttonLabel={generating === 'mindmap' ? '⏳ Generating...' : 'Generate Mind Map'} onClick={() => generate('mindmap')} disabled={!!generating} color="#ef4444" />
                )}
              </div>
            )}

            {/* ── TIMELINE TAB ── */}
            {tab === 'timeline' && (
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>📅 Timeline & Sequences</h2>
                  <button onClick={() => generate('timeline')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 Regenerate</button>
                </div>
                {timeline.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {timeline.map((item, i) => {
                        const impColor = { high: '#ef4444', medium: '#f59e0b', low: '#64748b' }[item.importance] || '#64748b'
                        return (
                          <div key={i} style={{ paddingLeft: 52, position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 8, top: 14, width: 24, height: 24, borderRadius: '50%', background: impColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, zIndex: 1 }}>{i + 1}</div>
                            <div style={{ background: 'var(--surface)', border: `1px solid ${impColor}30`, borderRadius: 12, padding: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>{item.event}</div>
                                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 6, background: `${impColor}15`, color: impColor, border: `1px solid ${impColor}30`, fontWeight: 700, flexShrink: 0 }}>{item.date}</span>
                              </div>
                              {item.detail && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.detail}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="📅" label="No timeline yet" buttonLabel={generating === 'timeline' ? '⏳ Generating...' : 'Generate Timeline'} onClick={() => generate('timeline')} disabled={!!generating} color="#06b6d4" />
                )}
              </div>
            )}

            {/* ── GLOSSARY TAB ── */}
            {tab === 'glossary' && (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>📖 Glossary</h2>
                  <button onClick={() => generate('glossary')} disabled={!!generating} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>🔄 Regenerate</button>
                </div>
                {glossary.length > 0 ? (
                  <>
                    <input type="text" placeholder="🔍 Search terms..." value={glossarySearch} onChange={e => setGlossarySearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 16 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                      {glossary
                        .filter(g => g.term?.toLowerCase().includes(glossarySearch.toLowerCase()) || g.definition?.toLowerCase().includes(glossarySearch.toLowerCase()))
                        .map((g, i) => (
                          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 8 }}>
                              <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: 14 }}>{g.term}</div>
                              {g.category && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)', flexShrink: 0 }}>{g.category}</span>}
                            </div>
                            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: g.example ? 8 : 0 }}>{g.definition}</div>
                            {g.example && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: '2px solid #64748b' }}>e.g. {g.example}</div>}
                          </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 14, fontSize: 12, color: '#374151', textAlign: 'center' }}>
                      {glossary.filter(g => g.term?.toLowerCase().includes(glossarySearch.toLowerCase())).length} of {glossary.length} terms
                    </div>
                  </>
                ) : (
                  <EmptyState icon="📖" label="No glossary yet" buttonLabel={generating === 'glossary' ? '⏳ Generating...' : 'Generate Glossary'} onClick={() => generate('glossary')} disabled={!!generating} color="#f97316" />
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {tab === 'chat' && (
              <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>💬 Ask AI About Your Document</h2>
                  <p style={{ color: '#64748b', fontSize: 13 }}>Get explanations, examples, comparisons, and deeper analysis</p>
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                  {['Explain the main concept in simple terms', 'Give me a real-world example', 'What are the key differences between these concepts?', 'Summarise in 5 bullet points', 'What exam questions might come from this?', 'Create a simple analogy I can remember'].map(q => (
                    <button key={q} onClick={() => sendChat(q)} disabled={chatLoading} style={{ padding: '5px 11px', borderRadius: 14, fontSize: 11, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', opacity: chatLoading ? 0.5 : 1 }}>{q}</button>
                  ))}
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                  {chatMessages.length === 0 && !chatLoading && (
                    <div style={{ textAlign: 'center', color: '#374151', margin: 'auto', fontSize: 13 }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>Ask anything about your document
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, padding: '0 4px' }}>{msg.role === 'user' ? 'You' : '🤖 Study AI'}</div>
                      <div style={{ padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 13, lineHeight: 1.75, maxWidth: '85%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {(chatLoading || chatStreaming) && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>🤖 Study AI</div>
                      <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.75, maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                        {chatStreaming || <span style={{ display: 'flex', gap: 5 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `bounce 1s ${i * 0.15}s ease-in-out infinite` }} />)}</span>}
                        {chatStreaming && chatLoading && <span style={{ display: 'inline-block', width: 2, height: 14, background: '#60a5fa', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !chatLoading) { e.preventDefault(); sendChat() } }} placeholder="Ask anything about your document..." disabled={chatLoading}
                    style={{ flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.4)', color: '#e2e8f0', outline: 'none' }} />
                  <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: chatInput.trim() && !chatLoading ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', color: chatInput.trim() && !chatLoading ? '#fff' : '#64748b', border: '1px solid var(--border)', cursor: chatInput.trim() ? 'pointer' : 'not-allowed' }}>Send ↑</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:.3} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes blink { 50%{opacity:0} }
      `}</style>
    </div>
  )
}

// ── Reusable empty state ─────────────────────────────────────────────
function EmptyState({ icon, label, buttonLabel, onClick, disabled, color = '#2563eb' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{ marginBottom: 18, fontSize: 15 }}>{label}</div>
      <button onClick={onClick} disabled={disabled} style={{ padding: '11px 28px', borderRadius: 10, background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
        {buttonLabel}
      </button>
    </div>
  )
}