import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import MathRenderer from '../components/MathRenderer'

const FORMAT_OPTIONS = [
  { id: 'chat', label: '💬 Chat' },
  { id: 'docx', label: '📄 Word' },
  { id: 'pdf', label: '📋 PDF' },
  { id: 'txt', label: '📝 TXT' },
  { id: 'md', label: '📑 MD' },
]

const SUGGESTED_PROMPTS = [
  { icon: '📄', text: 'Write my CV summary', cat: 'Career' },
  { icon: '📝', text: 'Write a cover letter for a software internship', cat: 'Career' },
  { icon: '💼', text: 'Find internships in South Africa for engineers', cat: 'Jobs' },
  { icon: '🎓', text: 'What scholarships can I apply for?', cat: 'Funding' },
  { icon: '🎙️', text: 'Help me prepare for a technical interview', cat: 'Interview' },
  { icon: '🌍', text: 'How do I get a work visa for Germany?', cat: 'Abroad' },
  { icon: '💰', text: 'What salary should I ask for as a graduate?', cat: 'Salary' },
  { icon: '🤖', text: 'Explain a difficult concept to me', cat: 'Study' },
]

export default function Assistant() {
  const { user, profile } = useUser()

  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [convSearch, setConvSearch] = useState('')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [toast, setToast] = useState(null)

  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadedContent, setUploadedContent] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [outputFormat, setOutputFormat] = useState('chat')
  const [downloading, setDownloading] = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const messagesAreaRef = useRef(null)

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => { if (user) loadConversations() }, [user])

  const loadConversations = async () => {
    setLoadingConvs(true)
    const { data } = await supabase
      .from('bot_conversations')
      .select('id, title, created_at, updated_at, preview')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setConversations(data || [])
    setLoadingConvs(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
  }, [input])

  const startNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setUploadedFile(null)
    setUploadedContent(null)
    setOutputFormat('chat')
    setInput('')
    setStreamText('')
  }

  const loadConversation = async (conv) => {
    setActiveConvId(conv.id)
    const { data } = await supabase
      .from('bot_conversations')
      .select('messages')
      .eq('id', conv.id)
      .single()
    setMessages(data?.messages || [])
    setUploadedFile(null)
    setUploadedContent(null)
  }

  const deleteConversation = async (id, e) => {
    e.stopPropagation()
    await supabase.from('bot_conversations').delete().eq('id', id)
    setConversations(p => p.filter(c => c.id !== id))
    if (activeConvId === id) startNewConversation()
    showToast('🗑 Deleted')
  }

  const saveConversation = async (msgs, convId) => {
    if (!user || msgs.length < 2) return convId
    const firstUserMsg = msgs.find(m => m.role === 'user')?.content || 'New conversation'
    const title = firstUserMsg.length > 55 ? firstUserMsg.slice(0, 55) + '...' : firstUserMsg
    const preview = msgs.find(m => m.role === 'assistant')?.content?.slice(0, 120) || ''
    const now = new Date().toISOString()
    if (convId) {
      await supabase.from('bot_conversations').update({ messages: msgs, preview, updated_at: now }).eq('id', convId)
      setConversations(p => p.map(c => c.id === convId ? { ...c, preview, updated_at: now } : c))
      return convId
    } else {
      const { data } = await supabase.from('bot_conversations').insert({ user_id: user.id, title, messages: msgs, preview, created_at: now, updated_at: now }).select().single()
      if (data) { setConversations(p => [data, ...p]); setActiveConvId(data.id); return data.id }
    }
    return null
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true); setUploadedFile(file)
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const formData = new FormData(); formData.append('file', file)
        const res = await fetch('/api/extract-pdf-upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.text) {
          setUploadedContent({ type: 'pdf', content: data.text, name: file.name, pages: data.pages })
          showToast(`✅ Read ${file.name} — ${data.pages || '?'} pages`)
        } else {
          setUploadedContent({ type: 'pdf', content: `[File: ${file.name} — could not extract text]`, name: file.name })
          showToast('⚠️ PDF attached but text could not be extracted')
        }
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = e => {
          setUploadedContent({ type: 'image', content: e.target.result, name: file.name })
          showToast(`✅ Image attached: ${file.name}`)
        }
        reader.readAsDataURL(file)
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text()
        setUploadedContent({ type: 'text', content: text.slice(0, 15000), name: file.name })
        showToast(`✅ Read ${file.name}`)
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const formData = new FormData(); formData.append('file', file)
        const res = await fetch('/api/extract-docx', { method: 'POST', body: formData }).catch(() => null)
        if (res?.ok) {
          const data = await res.json()
          setUploadedContent({ type: 'text', content: data.text || `[File: ${file.name}]`, name: file.name })
          showToast(`✅ Read ${file.name}`)
        } else {
          setUploadedContent({ type: 'text', content: `[Word document: ${file.name}]`, name: file.name })
          showToast(`📎 Attached: ${file.name}`)
        }
      } else {
        setUploadedContent({ type: 'text', content: `[File: ${file.name}]`, name: file.name })
        showToast(`📎 Attached: ${file.name}`)
      }
    } catch (e) {
      showToast('❌ Could not read file: ' + e.message)
      setUploadedContent({ type: 'text', content: `[File: ${file.name}]`, name: file.name })
    }
    setUploading(false)
  }

  const handleDrop = e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file) }

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const safeFilename = str => (str || 'Answer').replace(/[^a-z0-9]/gi, '_').slice(0, 40)

  const downloadResponse = async (content, format, title) => {
    setDownloading(true)
    try {
      if (format === 'txt') {
        triggerDownload(new Blob([content], { type: 'text/plain' }), `EduBot_${safeFilename(title)}.txt`)
        showToast('✅ Downloaded')
      } else if (format === 'md') {
        triggerDownload(new Blob([content], { type: 'text/markdown' }), `EduBot_${safeFilename(title)}.md`)
        showToast('✅ Downloaded')
      } else if (format === 'docx') {
        showToast('📄 Generating Word document...')
        const res = await fetch('/api/generate-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, title: title || 'EduBot Answer' }) })
        if (res.ok) { triggerDownload(await res.blob(), `EduBot_${safeFilename(title)}.docx`); showToast('✅ Word document downloaded!') }
        else showToast('❌ Could not generate Word document')
      } else if (format === 'pdf') {
        showToast('📋 Generating PDF...')
        const res = await fetch('/api/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, title: title || 'EduBot Answer' }) })
        if (res.ok) { triggerDownload(await res.blob(), `EduBot_${safeFilename(title)}.html`); showToast('✅ Downloaded — open and print → Save as PDF') }
        else showToast('❌ Could not generate PDF')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    setDownloading(false)
  }

  const sendMessage = async (quickText) => {
    const msg = quickText || input.trim()
    if ((!msg && !uploadedContent) || loading) return
    setInput(''); setLoading(true); setStreamText('')

    let detectedFormat = outputFormat
    const lower = msg.toLowerCase()
    if (lower.includes('docx') || lower.includes('word doc') || lower.includes('as a word')) detectedFormat = 'docx'
    else if (lower.includes(' pdf') || lower.includes('as a pdf')) detectedFormat = 'pdf'
    else if (lower.includes('text file') || lower.includes('.txt')) detectedFormat = 'txt'
    else if (lower.includes('markdown') || lower.includes('.md')) detectedFormat = 'md'

    const displayContent = msg + (uploadedContent ? `\n\n📎 ${uploadedContent.name}` : '')
    const newMessages = [...messages, { role: 'user', content: displayContent }]
    setMessages(newMessages)

    const userCtx = profile ? `Student: ${profile.name || 'Student'}, studying ${profile.field || 'not specified'} at ${profile.institution || 'university'} in ${profile.country || 'South Africa'}.` : ''
    const fileCtx = uploadedContent ? `\nThe user has uploaded: "${uploadedContent.name}"\nContent:\n"""\n${uploadedContent.content?.slice(0, 10000)}\n"""` : ''
    const formatCtx = detectedFormat !== 'chat' ? `\nThe user wants the answer as a ${detectedFormat.toUpperCase()} file. Write in a professional document style with clear headings (##), bullet points, and full detail.` : ''

    const systemPrompt = `You are EduBot, an expert AI assistant for university students from EduLink Global. You help with career guidance, CV writing, cover letters, internships, scholarships, academic questions, and exam help.

${userCtx}${fileCtx}${formatCtx}

MATH FORMATTING — follow exactly:
- Squared: x^2, Cubed: x^3 (never write in words)
- Fractions: \\frac{numerator}{denominator}
- Square root: \\sqrt{x}
- Display equations: $$ equation $$
- Inline math: $ equation $
- \\times (×), \\div (÷), \\pm (±), \\leq (≤), \\geq (≥)
- Greek: \\alpha \\beta \\theta \\pi \\sigma \\omega \\Delta \\mu \\lambda
- Full step-by-step working: **Step 1:** etc.
- Units in [brackets]: F = 10 [N]
- End with **Answer: ...**

RULES: Be warm, specific, and practical. Reference uploaded file content directly. Never refuse reasonable questions.`

    let fullResponse = ''
    let currentConvId = activeConvId

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, ...newMessages.map(m => ({ role: m.role, content: m.content }))] }),
      })
      if (!res.ok) { showToast('❌ Server error: ' + res.status); setLoading(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') {
            const finalMsgs = [...newMessages, { role: 'assistant', content: fullResponse, format: detectedFormat }]
            setMessages(finalMsgs)
            setStreamText(''); setLoading(false)
            currentConvId = await saveConversation(finalMsgs, currentConvId)
            setUploadedFile(null); setUploadedContent(null)
            return
          }
          try { const p = JSON.parse(d); if (p.text) { fullResponse += p.text; setStreamText(fullResponse) } } catch {}
        }
      }
    } catch (e) { showToast('❌ ' + e.message); setLoading(false) }
  }

  const groupConversations = (convs) => {
    const now = new Date()
    const today = [], yesterday = [], thisWeek = [], older = []
    convs.forEach(c => {
      const diff = Math.floor((now - new Date(c.updated_at)) / (1000 * 60 * 60 * 24))
      if (diff === 0) today.push(c)
      else if (diff === 1) yesterday.push(c)
      else if (diff <= 7) thisWeek.push(c)
      else older.push(c)
    })
    return { today, yesterday, thisWeek, older }
  }

  const filteredConvs = conversations.filter(c => !convSearch || c.title?.toLowerCase().includes(convSearch.toLowerCase()))
  const groups = groupConversations(filteredConvs)
  const groupLabels = { today: 'Today', yesterday: 'Yesterday', thisWeek: 'This Week', older: 'Older' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', paddingTop: 60, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <div style={{ width: showSidebar ? 280 : 0, flexShrink: 0, transition: 'width 0.25s', overflow: 'hidden', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          {showSidebar && (
            <>
              <div style={{ padding: '14px 12px 10px', flexShrink: 0 }}>
                <button onClick={startNewConversation} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✏️ New Chat</button>
              </div>
              <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
                <input value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Search conversations..." style={{ width: '100%', padding: '7px 11px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
                {loadingConvs ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 12 }}>Loading...</div>
                ) : filteredConvs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>No conversations yet.<br />Start a new chat above.</div>
                ) : (
                  Object.entries(groups).map(([key, convs]) =>
                    convs.length === 0 ? null : (
                      <div key={key}>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 6px 4px' }}>{groupLabels[key]}</div>
                        {convs.map(conv => (
                          <div key={conv.id} onClick={() => loadConversation(conv)}
                            style={{ padding: '9px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 2, background: activeConvId === conv.id ? 'rgba(37,99,235,0.15)' : 'transparent', border: `1px solid ${activeConvId === conv.id ? 'rgba(37,99,235,0.3)' : 'transparent'}`, transition: 'all 0.1s', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}
                            onMouseEnter={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: activeConvId === conv.id ? '#60a5fa' : '#f1f5f9', fontWeight: activeConvId === conv.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                                {conv.title || 'Conversation'}
                              </div>
                              {conv.preview && <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>{conv.preview}</div>}
                            </div>
                            <button onClick={e => deleteConversation(conv.id, e)} style={{ background: 'none', border: 'none', color: 'transparent', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0 2px' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* ── MAIN CHAT ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={() => setShowSidebar(s => !s)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6 }}>☰</button>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>EduBot AI</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Career & Academic Assistant · Upload any file · Get answers in any format</div>
            </div>
            {/* Format selector */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#64748b', marginRight: 2 }}>Output:</span>
              {FORMAT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => setOutputFormat(f.id)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: outputFormat === f.id ? 'rgba(37,99,235,0.2)' : 'var(--surface)', color: outputFormat === f.id ? '#60a5fa' : '#64748b', border: `1px solid ${outputFormat === f.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, transition: 'all 0.1s' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── MESSAGES — scrollable area ─────────────────── */}
          <div
            ref={messagesAreaRef}
            style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >

            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
                    Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm EduBot
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
                    Your personal AI for career and academic help.<br />Upload any file · Ask anything · Get answers in any format.
                  </div>
                </div>

                {/* Drop zone */}
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed rgba(37,99,235,0.3)', borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 24, color: '#64748b', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.6)'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
                  <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Drop any file here or click to upload</div>
                  <div style={{ fontSize: 11 }}>PDF, Word, TXT, image — I'll read it and help you with it</div>
                </div>

                {/* Suggested prompts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                  {SUGGESTED_PROMPTS.map(p => (
                    <button key={p.text} onClick={() => sendMessage(p.text)} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; e.currentTarget.style.background = 'rgba(37,99,235,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 5 }}>{p.icon}</div>
                      <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{p.text}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{p.cat}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ maxWidth: 800, margin: '0 auto 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginBottom: 2 }}>🤖</div>
                  )}
                  <div style={{ maxWidth: 'min(85%,680px)' }}>
                    <MathRenderer
                      content={msg.content}
                      style={{ padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 14, lineHeight: 1.8 }}
                    />
                    {msg.role === 'assistant' && msg.format && msg.format !== 'chat' && (
                      <button onClick={() => downloadResponse(msg.content, msg.format, messages.find(m => m.role === 'user')?.content?.slice(0, 60) || 'Answer')} disabled={downloading}
                        style={{ marginTop: 6, padding: '5px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {downloading ? '⏳ Downloading...' : `⬇ Download as ${msg.format.toUpperCase()}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {(loading || streamText) && (
              <div style={{ maxWidth: 800, margin: '0 auto 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                  {streamText
                    ? <MathRenderer content={streamText} style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 14, lineHeight: 1.8, maxWidth: 'min(85%,680px)' }} />
                    : (
                      <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <span style={{ display: 'flex', gap: 5 }}>
                          {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: `bounce 1s ${i*0.18}s ease-in-out infinite` }} />)}
                        </span>
                      </div>
                    )
                  }
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── FILE INDICATOR ────────────────────────────── */}
          {uploadedFile && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'rgba(16,185,129,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading
                  ? <><span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #10b981', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> Reading {uploadedFile.name}...</>
                  : <>📎 {uploadedFile.name}{uploadedContent?.pages ? ` (${uploadedContent.pages} pages)` : ''}</>
                }
              </div>
              <button onClick={() => { setUploadedFile(null); setUploadedContent(null) }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          )}

          {/* ── FORMAT REMINDER ───────────────────────────── */}
          {outputFormat !== 'chat' && (
            <div style={{ padding: '6px 16px', background: 'rgba(37,99,235,0.06)', borderTop: '1px solid rgba(37,99,235,0.15)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#60a5fa' }}>
                📎 Next response will include a download button for <strong>{FORMAT_OPTIONS.find(f => f.id === outputFormat)?.label}</strong>
              </div>
            </div>
          )}

          {/* ── INPUT — STICKY AT BOTTOM, NEVER SCROLLS AWAY ── */}
          <div style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--bg)',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            boxShadow: '0 -6px 20px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 800, margin: '0 auto' }}>
              <button onClick={() => fileInputRef.current?.click()} title="Attach a file"
                style={{ padding: '10px', borderRadius: 10, background: uploadedFile ? 'rgba(16,185,129,0.12)' : 'var(--surface)', border: `1px solid ${uploadedFile ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, color: uploadedFile ? '#10b981' : '#64748b', cursor: 'pointer', fontSize: 16, flexShrink: 0, transition: 'all 0.15s' }}>
                📎
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp" onChange={e => handleFileUpload(e.target.files[0])} style={{ display: 'none' }} />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !loading) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={loading}
                placeholder={
                  uploadedFile
                    ? `Ask me anything about ${uploadedFile.name}...`
                    : outputFormat !== 'chat'
                    ? `Ask anything — response will download as ${outputFormat.toUpperCase()}...`
                    : 'Ask anything — or say "give me the answer as a Word doc"...'
                }
                rows={1}
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 14,
                  background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)',
                  color: '#e2e8f0', outline: 'none', resize: 'none',
                  lineHeight: 1.5, fontFamily: 'inherit', maxHeight: 140,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.3)'}
              />

              <button onClick={() => sendMessage()} disabled={(!input.trim() && !uploadedContent) || loading}
                style={{ padding: '11px 16px', borderRadius: 10, background: (input.trim() || uploadedContent) && !loading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface)', color: (input.trim() || uploadedContent) ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#374151', marginTop: 6, textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line · Drag & drop files
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes bounce { 0%,100% { transform: translateY(0); opacity: .3 } 50% { transform: translateY(-5px); opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}