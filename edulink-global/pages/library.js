import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'
import withMobile from '../components/withMobile'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import PracticeExam from '../components/PracticeExam'
import MathRenderer from '../components/MathRenderer'
import ShareToGroupModal from '../components/ShareToGroupModal'

export default function LibraryPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileLibrary />
  return <Library />
}

const MobileLibrary = dynamic(() => import('./mobile/MobileLibrary'), { ssr: false })

const FILE_ICON = {
  pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊',
  xls: '📈', xlsx: '📈', zip: '🗜️', mp4: '🎬', mp3: '🎵',
  epub: '📚', txt: '📋',
}
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

async function streamChat(messages, onChunk, onDone, onError) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) { onError(`Server error: ${res.status}`); return }
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

 function Library() {
  
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
  const [toast, setToast] = useState(null)
  const [showPdf, setShowPdf] = useState(false)
  const [showPracticeExam, setShowPracticeExam] = useState(false)
  const [shareFile, setShareFile] = useState(null)

  // AI state
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStream, setAiStream] = useState('')
  const [relatedResources, setRelatedResources] = useState(null)
  const [loadingResources, setLoadingResources] = useState(false)
  const [relatedContext, setRelatedContext] = useState(null)

  // Extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)

  // Diagram state
  const [diagramSvg, setDiagramSvg] = useState(null)
  const [loadingDiagram, setLoadingDiagram] = useState(false)

  // Notes state
  const [generatingNotes, setGeneratingNotes] = useState(false)

  const aiBottomRef = useRef(null)
  const saveTimeout = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) loadFiles() }, [user])

  useEffect(() => {
    if (!user) return
    const onFocus = () => setTimeout(() => loadFiles(), 800)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  useEffect(() => {
    if (!user || !selectedFile || aiMessages.length < 2) return
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveSession(), 2000)
  }, [aiMessages])

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiStream, diagramSvg])

  const loadFiles = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('library_files')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
    if (!error) setFiles(data || [])
    setLoading(false)
  }

  const deleteFile = async (id) => {
    await supabase.from('library_files').delete().eq('id', id)
    setFiles(p => p.filter(f => f.id !== id))
    if (selectedFile?.id === id) setSelectedFile(null)
    showToast('🗑 Removed from library')
  }

  const detectAndLogWeakTopic = async (userMsg, aiResponse) => {
    const signals = ["don't understand", 'confused', "doesn't make sense", "i'm lost", "still don't get", "not sure", "can you explain", "what does", "help me understand"]
    if (!signals.some(s => userMsg.toLowerCase().includes(s))) return
    try {
      const res = await fetch('/api/extract-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg + ' ' + aiResponse.slice(0, 300), module: selectedFile?.label || profile?.field }),
      })
      const { topic } = await res.json()
      if (topic) {
        fetch('/api/log-weak-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, topic, module: selectedFile?.label || profile?.field, file_id: selectedFile?.id, trigger_type: 'said_confused' }),
        }).catch(() => {})
      }
    } catch {}
  }

  const openFile = async (file) => {
    setSelectedFile(file)
    setShowPdf(false)
    setRelatedResources(null)
    setExtractError(null)
    setDiagramSvg(null)
    setRelatedContext(null)

    await supabase.from('library_files').update({ last_opened: new Date().toISOString() }).eq('id', file.id)

    const { data: session } = await supabase
      .from('library_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_id', file.id)
      .single()

    const hasExistingSession = session?.messages?.length > 0

    if (hasExistingSession) {
      setAiMessages(session.messages)
      showToast('📚 Previous session restored')
    } else {
      setAiMessages([{
        role: 'assistant',
        content: `📄 I've opened **${file.title || file.name}** for you.\n\n${file.label ? `This looks like a **${file.label}**.` : ''} ${file.relevance_reason ? `It matches: ${file.relevance_reason}.` : ''}\n\n${file.content_text ? '✅ Document content is loaded — I can see the actual paper.' : '⏳ Reading the document now...'}`,
      }])
    }

    if (!file.content_text && file.url && file.url !== '#') {
      setExtracting(true)
      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: file.url }),
        })
        const data = await res.json()
        if (data.text) {
          await supabase.from('library_files').update({ content_text: data.text, content_pages: data.content_pages || null }).eq('id', file.id)
          const updatedFile = { ...file, content_text: data.text, content_pages: data.content_pages }
          setSelectedFile(updatedFile)
          setFiles(prev => prev.map(f => f.id === file.id ? updatedFile : f))
          const ocrNote = data.method === 'ocr' ? `\n\n⚠️ *Scanned document — read via text recognition. Double-check numbers using 👁 View File.*` : ''
          if (!hasExistingSession) {
            setAiMessages(prev => [...prev.slice(0, -1), {
              role: 'assistant',
              content: `📄 I've read **${file.title || file.name}**${data.pages ? ` (${data.pages} pages)` : ''}.${ocrNote}\n\nI can now:\n• **Answer every question** with full step-by-step working\n• **Show equations** in proper notation\n• **Draw a diagram** of any concept\n• **Find topic-specific videos and websites**\n• **Generate revision notes** — click 📝 Notes\n• **Run Practice Exam Mode** with AI marking\n• **Share to a group chat** — click 📤\n\nWhat would you like to do?`,
            }])
          }
        } else {
          setExtractError(data.error || 'Could not read this document')
          if (!hasExistingSession) {
            setAiMessages(prev => [...prev.slice(0, -1), {
              role: 'assistant',
              content: `⚠️ I couldn't extract text from this file (${data.error || 'unknown reason'}).\n\nYou can still **view the file** using 👁 View File, and I can help with general questions about the topic.`,
            }])
          }
        }
      } catch (e) { setExtractError(e.message) }
      setExtracting(false)
    }

    if (file.label) {
      try {
        const res = await fetch('/api/related-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, current_file_id: file.id, module_label: file.label }),
        })
        const data = await res.json()
        setRelatedContext(data.sessions?.length ? data.sessions : null)
      } catch { setRelatedContext(null) }
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

  const exportStudySheet = async () => {
    if (!user || !selectedFile) return
    showToast('📝 Generating study sheet...')
    try {
      const res = await fetch('/api/export-study-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, file_id: selectedFile.id }),
      })
      const data = await res.json()
      if (data.markdown) {
        const blob = new Blob([data.markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(data.title || 'study-sheet').replace(/[^a-z0-9]/gi, '_')}.md`
        a.click()
        URL.revokeObjectURL(url)
        showToast('✅ Study sheet downloaded!')
      } else showToast('❌ ' + (data.error || 'Could not generate'))
    } catch { showToast('❌ Export failed') }
  }

  const generateNotes = async () => {
    if (!selectedFile?.content_text) {
      showToast('⚠️ Open the file first so AI can read it, then try again')
      return
    }
    setGeneratingNotes(true)
    showToast('📝 Generating revision notes...')
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: selectedFile.id, user_id: user.id }),
      })
      const data = await res.json()
      if (data.notes) {
        const blob = new Blob([data.notes], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Notes_${(data.title || 'document').replace(/[^a-z0-9]/gi, '_')}.md`
        a.click()
        URL.revokeObjectURL(url)
        showToast('✅ Revision notes downloaded!')
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: `📝 Revision notes for **${data.title}** have been downloaded as a Markdown file.\n\nYou can open it in Notion, VS Code, or any text editor. Want me to explain any section in more detail?`,
        }])
      } else showToast('❌ ' + (data.error || 'Could not generate notes'))
    } catch (e) { showToast('❌ ' + e.message) }
    setGeneratingNotes(false)
  }

  const sendMessage = async (quick) => {
    const msg = quick || aiInput.trim()
    if (!msg || aiLoading) return
    setAiInput(''); setAiLoading(true); setAiStream(''); setDiagramSvg(null)

    const newMessages = [...aiMessages, { role: 'user', content: msg }]
    setAiMessages(newMessages)

    const hasContent = selectedFile?.content_text && selectedFile.content_text.length > 100
    const relatedContextStr = relatedContext?.length
      ? `\nRELATED STUDY HISTORY:\n${relatedContext.map(s => `- "${s.file_title}": student recently asked about ${s.last_topics?.join('; ')}`).join('\n')}\nReference connections if relevant.`
      : ''
    const pageInfo = selectedFile?.content_pages?.length
      ? `\nDocument has ${selectedFile.content_pages.length} pages. Mention page numbers when identifiable.`
      : ''

    const fileContext = selectedFile ? `
Document: "${selectedFile.title || selectedFile.name}"
Type: ${selectedFile.label || (selectedFile.ext || '').toUpperCase()}
Source: ${selectedFile.domain || 'university website'}
Student field: ${profile?.field || 'Engineering'}
Student modules: ${Array.isArray(profile?.modules) ? profile.modules.join(', ') : 'not specified'}
${relatedContextStr}${pageInfo}
${hasContent
  ? `\nFULL DOCUMENT CONTENT:\n"""\n${selectedFile.content_text.slice(0, 12000)}\n"""`
  : `\nNOTE: Document text could not be extracted. Help with general topic knowledge only.`
}
` : ''

    const systemPrompt = `You are an expert academic AI tutor helping university students master their course materials and exam papers.
${fileContext}
MATH FORMATTING — follow exactly:
- Squared: x^2 (NEVER write in words), Cubed: x^3
- Fractions: \\frac{numerator}{denominator}
- Square root: \\sqrt{x}
- Display equations: $$ equation $$
- Inline math: $ equation $
- \\times \\div \\pm \\leq \\geq \\alpha \\beta \\theta \\pi \\sigma \\omega \\Delta
- Full step-by-step working, label each: **Step 1:** etc.
- Units in [brackets]: F = 10 [N]
- Final answer: **Answer: ...**
RULES: Use document content as ground truth. Quote exact questions. For calculations show every step. Never refuse academic help.`

    await streamChat(
      [{ role: 'system', content: systemPrompt }, ...newMessages],
      chunk => setAiStream(chunk),
      full => {
        const finalMsgs = [...newMessages, { role: 'assistant', content: full }]
        setAiMessages(finalMsgs)
        setAiStream(''); setAiLoading(false)
        detectAndLogWeakTopic(msg, full)
        const triggers = ['youtube', 'video', 'visualize', 'hard to picture', "don't understand", 'confused', 'resources']
        if (triggers.some(w => full.toLowerCase().includes(w) || msg.toLowerCase().includes(w))) {
          setTimeout(() => findResources(msg), 600)
        }
      },
      err => { showToast('❌ ' + err); setAiLoading(false) }
    )
  }

  const findResources = async (topic) => {
    setLoadingResources(true); setRelatedResources(null)

    let topicsToSearch = [topic]
    if (selectedFile?.content_text && selectedFile.content_text.length > 200) {
      try {
        let topicFull = ''
        await streamChat([{
          role: 'user',
          content: `Identify the 3-5 most important specific academic topics in this document.
Title: "${selectedFile?.title || selectedFile?.name}"
Content: """${selectedFile.content_text.slice(0, 4000)}"""
Return JSON ONLY: ["Topic 1", "Topic 2", "Topic 3"]
Each must be specific and searchable (e.g. "Kirchhoff's Current Law" not "Circuits").`,
        }],
          c => { topicFull = c },
          finalFull => {
            try {
              const clean = finalFull.replace(/```json|```/g, '').trim()
              const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
              const parsed = JSON.parse(clean.slice(s, e + 1))
              if (Array.isArray(parsed) && parsed.length > 0) topicsToSearch = parsed.slice(0, 4)
            } catch {}
          },
          () => {}
        )
      } catch {}
    }

    let full = ''
    await streamChat([{
      role: 'user',
      content: `Find the best free learning resources for a ${profile?.field || 'Engineering'} student on:
${topicsToSearch.map((t, i) => `${i + 1}. ${t}`).join('\n')}
Document: "${selectedFile?.title || selectedFile?.name}"
Return JSON ONLY:
{
  "topics_found": ["topic 1", "topic 2"],
  "youtube_searches": [
    {"query": "specific search", "topic": "topic name", "why": "what this covers"}
  ],
  "websites": [
    {"name": "Site", "url": "https://url.com", "topic": "topic", "desc": "why helpful"}
  ],
  "study_tips": [
    {"topic": "topic", "tip": "specific tip"}
  ]
}
Give at least 5 YouTube searches and 3 websites. Each search must be topic-specific.`,
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

  const generateDiagram = async () => {
    const lastUserMsg = [...aiMessages].reverse().find(m => m.role === 'user')
    const lastAiMsg = [...aiMessages].reverse().find(m => m.role === 'assistant')
    const topic = lastUserMsg?.content || selectedFile?.title || 'this concept'
    setLoadingDiagram(true); setDiagramSvg(null)
    try {
      const res = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, context: lastAiMsg?.content || selectedFile?.content_text?.slice(0, 1500) || '' }),
      })
      const data = await res.json()
      if (data.svg) setDiagramSvg(data.svg)
      else showToast('⚠️ Could not generate diagram — ask a specific question first')
    } catch { showToast('❌ Diagram failed') }
    setLoadingDiagram(false)
  }

  // Filter / sort
  const domains = [...new Set(files.map(f => f.domain).filter(Boolean))]
  const labels = [...new Set(files.map(f => f.label).filter(Boolean))]
  let display = files
  if (search) display = display.filter(f => ((f.title || '') + (f.name || '') + (f.domain || '') + (f.label || '')).toLowerCase().includes(search.toLowerCase()))
  if (filterPriority !== 'all') display = display.filter(f => f.priority === filterPriority)
  if (filterLabel !== 'all') display = display.filter(f => f.label === filterLabel)
  if (filterDomain !== 'all') display = display.filter(f => f.domain === filterDomain)
  if (sortBy === 'name') display = [...display].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  if (sortBy === 'priority') display = [...display].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 2) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 2))

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
            <p style={{ color: '#64748b', fontSize: 13 }}>Your personal academic file library. Open any file and the AI tutor helps you master it.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={loadFiles} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
            <button onClick={() => router.push('/settings')} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🧩 Extension</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
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
            <div style={{ fontSize: 14, lineHeight: 1.8, maxWidth: 500, margin: '0 auto 28px', textAlign: 'left' }}>
              <strong style={{ color: '#f1f5f9' }}>How to add files:</strong><br />
              1. Install the EduLink browser extension<br />
              2. Open extension → Profile tab → click <strong style={{ color: '#60a5fa' }}>Read Credentials from EduLink</strong><br />
              3. Visit your university website → <strong style={{ color: '#60a5fa' }}>Scan Whole Website</strong><br />
              4. Select files → <strong style={{ color: '#a78bfa' }}>Save to EduLink</strong><br />
              5. Come back and click 🔄 Refresh
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/settings')} style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🧩 Extension Setup →</button>
              <button onClick={loadFiles} style={{ padding: '11px 24px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>🔄 Refresh</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedFile ? '1fr 460px' : '1fr', gap: 24, alignItems: 'start' }}>

            {/* Files panel */}
            <div>
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
                  <option value="name">Name A–Z</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `All (${files.length})`, color: '#2563eb' },
                  { id: 'high', label: `🔴 High (${stats.high})`, color: '#ef4444' },
                ].map(f => (
                  <button key={f.id} onClick={() => setFilterPriority(f.id)} style={{ padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterPriority === f.id ? `${f.color}18` : 'var(--surface)', color: filterPriority === f.id ? f.color : '#64748b', border: `1px solid ${filterPriority === f.id ? f.color + '40' : 'var(--border)'}` }}>{f.label}</button>
                ))}
                {labels.slice(0, 5).map(label => (
                  <button key={label} onClick={() => setFilterLabel(filterLabel === label ? 'all' : label)} style={{ padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterLabel === label ? `${LABEL_COLOR[label] || '#2563eb'}15` : 'var(--surface)', color: filterLabel === label ? (LABEL_COLOR[label] || '#60a5fa') : '#64748b', border: `1px solid ${filterLabel === label ? (LABEL_COLOR[label] || '#2563eb') + '40' : 'var(--border)'}` }}>{label}</button>
                ))}
                {filterLabel !== 'all' && <button onClick={() => setFilterLabel('all')} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'none', border: '1px solid var(--border)', color: '#64748b' }}>× Clear</button>}
              </div>

              {display.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div>No files match your filters</div>
                  <button onClick={() => { setSearch(''); setFilterLabel('all'); setFilterPriority('all'); setFilterDomain('all') }} style={{ marginTop: 12, padding: '7px 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}>Clear all filters</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: selectedFile ? 'repeat(auto-fill,minmax(200px,1fr))' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                  {display.map(file => (
                    <div key={file.id} style={{ background: 'var(--surface)', border: `2px solid ${selectedFile?.id === file.id ? '#2563eb' : file.priority === 'high' ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`, borderRadius: 14, padding: 16, transition: 'all 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 26 }}>{FILE_ICON[file.ext] || '📁'}</span>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {file.priority === 'high' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700 }}>🔴 High</span>}
                          {file.is_relevant && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>📚 Match</span>}
                          {file.content_text && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 700 }} title="AI can read this file">📖 Readable</span>}
                          {file.label && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${LABEL_COLOR[file.label] || '#64748b'}12`, color: LABEL_COLOR[file.label] || '#94a3b8', fontWeight: 700 }}>{file.label}</span>}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {file.title || file.name}
                      </div>
                      {file.domain && <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>🌐 {file.domain}</div>}
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openFile(file)} style={{ flex: 1, padding: '7px 8px', borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🤖 Open + AI</button>
                        {file.url && file.url !== '#' && (
                          <a href={file.url} target="_blank" rel="noreferrer" style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 10, fontWeight: 600, textDecoration: 'none' }} title="Open file">⬇</a>
                        )}
                        <button onClick={() => setShareFile(file)} title="Share to group chat" style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, cursor: 'pointer' }}>📤</button>
                        <button onClick={() => deleteFile(file.id)} style={{ padding: '7px 8px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }} title="Remove">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Panel */}
            {selectedFile && (
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, overflow: 'hidden', height: 'calc(100vh - 140px)', minHeight: 600, maxHeight: 820, position: 'sticky', top: 100 }}>

                {/* Panel header */}
                <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', borderBottom: '1px solid rgba(124,58,237,0.2)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>🤖 AI Tutor</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={saveSession} title="Save session" style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>💾</button>
                      <button onClick={exportStudySheet} disabled={aiMessages.length < 2} title="Export as study sheet" style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: aiMessages.length < 2 ? 0.4 : 1 }}>📄</button>
                      <button onClick={() => setShowPdf(!showPdf)} title={showPdf ? 'Switch to chat' : 'View file'} style={{ padding: '3px 8px', borderRadius: 6, background: showPdf ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: showPdf ? '#60a5fa' : '#94a3b8', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {showPdf ? '💬' : '👁'}
                      </button>
                      <button onClick={() => setSelectedFile(null)} title="Close" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {FILE_ICON[selectedFile.ext] || '📁'} {selectedFile.title || selectedFile.name}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedFile.label && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${LABEL_COLOR[selectedFile.label] || '#64748b'}15`, color: LABEL_COLOR[selectedFile.label] || '#94a3b8', fontWeight: 700 }}>{selectedFile.label}</span>}
                    {relatedContext?.length > 0 && <span style={{ fontSize: 9, color: '#60a5fa' }}>🔗 {relatedContext.length} related</span>}
                    {extracting && (
                      <span style={{ fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid #f59e0b', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                        Reading...
                      </span>
                    )}
                    {!extracting && selectedFile?.content_text && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>✅ Content loaded</span>}
                    {!extracting && extractError && <span style={{ fontSize: 9, color: '#ef4444' }}>⚠️ Text unavailable</span>}
                  </div>
                </div>

                {showPdf ? (
                  <div style={{ flex: 1, background: '#f0f0f0', overflow: 'hidden' }}>
                    {selectedFile.url && selectedFile.url !== '#'
                      ? <iframe src={selectedFile.url} title={selectedFile.title} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-same-origin allow-scripts allow-forms allow-downloads" />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#64748b' }}><div style={{ fontSize: 36 }}>📄</div><div>Direct preview not available</div></div>
                    }
                  </div>
                ) : (
                  <>
                    {/* Quick action chips */}
                    <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                      {['What is this about?', 'Solve all questions', 'Explain question 1', "I don't understand", 'Quiz me', 'Key formulas', 'Summary'].map(q => (
                        <button key={q} onClick={() => sendMessage(q)} disabled={aiLoading} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 9, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', whiteSpace: 'nowrap', opacity: aiLoading ? 0.5 : 1 }}
                          onMouseEnter={e => { if (!aiLoading) e.currentTarget.style.color = '#f1f5f9' }}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >{q}</button>
                      ))}
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {aiMessages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>{msg.role === 'user' ? 'You' : '🤖 AI Tutor'}</div>
                          <MathRenderer content={msg.content} style={{ padding: '9px 12px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 12, lineHeight: 1.8, maxWidth: '95%' }} />
                        </div>
                      ))}

                      {(aiLoading || aiStream) && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>🤖 AI Tutor</div>
                          {aiStream
                            ? <MathRenderer content={aiStream} style={{ padding: '9px 12px', borderRadius: '12px 12px 12px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 12, lineHeight: 1.8, maxWidth: '95%' }} />
                            : <div style={{ padding: '9px 12px', borderRadius: '12px 12px 12px 4px', background: 'var(--surface2)', border: '1px solid var(--border)' }}><span style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span></div>
                          }
                        </div>
                      )}

                      {(loadingDiagram || diagramSvg) && (
                        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 12 }}>
                          <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 11, marginBottom: 8 }}>📊 Visual Diagram</div>
                          {loadingDiagram
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 11, padding: '16px 0', justifyContent: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #a78bfa', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />Drawing diagram...</div>
                            : <div style={{ background: '#1a1a2e', borderRadius: 8, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: diagramSvg }} />
                          }
                        </div>
                      )}

                      {(loadingResources || relatedResources) && (
                        <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 12 }}>
                          <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 11, marginBottom: 10 }}>🔍 Learning Resources</div>
                          {loadingResources
                            ? <div style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #60a5fa', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />Identifying topics and finding resources...</div>
                            : relatedResources && (
                              <>
                                {relatedResources.topics_found?.length > 0 && (
                                  <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Topics identified</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {relatedResources.topics_found.map((t, i) => <span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>{t}</span>)}
                                    </div>
                                  </div>
                                )}
                                {relatedResources.youtube_searches?.length > 0 && (
                                  <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>🎬 YouTube Videos</div>
                                    {relatedResources.youtube_searches.map((yt, i) => (
                                      <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(yt.query)}`} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '6px 9px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 4, textDecoration: 'none' }}>
                                        {yt.topic && <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>{yt.topic}</div>}
                                        <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>🎬 {yt.query}</div>
                                        {yt.why && <div style={{ fontSize: 9, color: '#94a3b8' }}>{yt.why}</div>}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {relatedResources.websites?.length > 0 && (
                                  <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>🌐 Websites</div>
                                    {relatedResources.websites.map((site, i) => (
                                      <a key={i} href={site.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '6px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 4, textDecoration: 'none' }}>
                                        {site.topic && <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>{site.topic}</div>}
                                        <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>{site.name} →</div>
                                        {site.desc && <div style={{ fontSize: 9, color: '#94a3b8' }}>{site.desc}</div>}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {relatedResources.study_tips?.length > 0 && (
                                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>💡 Study Tips</div>
                                    {relatedResources.study_tips.map((tip, i) => (
                                      <div key={i} style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, lineHeight: 1.5 }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{tip.topic}: </span>{tip.tip}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          }
                        </div>
                      )}

                      <div ref={aiBottomRef} />
                    </div>

                    {/* Toolbar */}
                    <div style={{ padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
                      <button onClick={generateDiagram} disabled={loadingDiagram || aiMessages.length < 2} title="Generate visual diagram" style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: (loadingDiagram || aiMessages.length < 2) ? 0.4 : 1 }}>📊 Diagram</button>
                      <button onClick={() => findResources(aiMessages[aiMessages.length - 2]?.content || selectedFile?.title || '')} disabled={loadingResources} title="Find topic-specific resources" style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: loadingResources ? 0.5 : 1 }}>🔍 Resources</button>
                      <button onClick={() => sendMessage('Give me a 5-question quiz on this document with full worked answers')} disabled={aiLoading} style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>📝 Quiz</button>
                      <button onClick={() => setShowPracticeExam(true)} disabled={!selectedFile?.content_text} title={!selectedFile?.content_text ? 'Requires extracted content' : 'Timed practice with AI marking'} style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', color: '#ec4899', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: !selectedFile?.content_text ? 0.4 : 1 }}>✍️ Practice</button>
                      <button onClick={generateNotes} disabled={generatingNotes || !selectedFile?.content_text} title={!selectedFile?.content_text ? 'Open file first' : 'Generate revision notes'} style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: (!selectedFile?.content_text || generatingNotes) ? 0.4 : 1 }}>
                        {generatingNotes ? '⏳' : '📝'} Notes
                      </button>
                      <button onClick={() => sendMessage('Solve all the exam questions in this document with full step-by-step working and model answers')} disabled={aiLoading} style={{ padding: '5px 9px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✍️ Solve All</button>
                    </div>

                    {/* Input */}
                    <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, flexShrink: 0 }}>
                      <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !aiLoading) sendMessage() }} disabled={aiLoading}
                        placeholder="Ask anything — questions, explanations, concepts..."
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 9, fontSize: 12, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', color: '#e2e8f0', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.3)'}
                      />
                      <button onClick={() => sendMessage()} disabled={!aiInput.trim() || aiLoading} style={{ padding: '10px 13px', borderRadius: 9, background: aiInput.trim() && !aiLoading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface)', color: aiInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↑</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showPracticeExam && selectedFile && (
        <PracticeExam file={selectedFile} user={user} onClose={() => setShowPracticeExam(false)} />
      )}
      {shareFile && (
        <ShareToGroupModal file={shareFile} onClose={() => setShareFile(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,100% { transform: translateY(0); opacity: .3 } 50% { transform: translateY(-5px); opacity: 1 } }
      `}</style>
    </div>
  )
}

