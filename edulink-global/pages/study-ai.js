import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'

import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import MathRenderer from '../components/MathRenderer'

const MobileStudyAI = dynamic(() => import('./mobile/MobileStudyAI'), { ssr: false })

export default function StudyAIPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileStudyAI />
  return <StudyAI />
}

const streamFromAPI = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { onError(`Server error: ${res.status}`); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
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
    const arrStart = clean.indexOf('['), arrEnd = clean.lastIndexOf(']')
    const objStart = clean.indexOf('{'), objEnd = clean.lastIndexOf('}')
    if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) return JSON.parse(clean.slice(arrStart, arrEnd + 1))
    if (objStart !== -1) return JSON.parse(clean.slice(objStart, objEnd + 1))
    return null
  } catch { return null }
}

const TOOLS = [
  { id: 'summarise', icon: '📋', label: 'Summarise', desc: 'Key points, definitions, formulas', color: '#2563eb', tip: 'Best for: lecture notes, chapters' },
  { id: 'flashcards', icon: '🃏', label: 'Flashcards', desc: 'Interactive Q&A cards — tap to flip', color: '#7c3aed', tip: 'Best for: vocabulary, concepts' },
  { id: 'quiz', icon: '🧠', label: 'Quiz', desc: 'Multiple choice with explanations', color: '#10b981', tip: 'Best for: testing your understanding' },
  { id: 'examquestions', icon: '📄', label: 'Exam Questions', desc: 'Real question paper format + answers', color: '#ef4444', tip: 'Best for: exam preparation' },
  { id: 'mindmap', icon: '🗺️', label: 'Mind Map', desc: 'Visual hierarchical structure', color: '#f59e0b', tip: 'Best for: understanding relationships' },
  { id: 'timeline', icon: '⏱️', label: 'Timeline', desc: 'Steps, sequences and processes', color: '#06b6d4', tip: 'Best for: processes, procedures' },
  { id: 'glossary', icon: '📖', label: 'Glossary', desc: 'All key terms defined with formulas', color: '#8b5cf6', tip: 'Best for: technical subjects' },
  { id: 'chat', icon: '💬', label: 'AI Tutor', desc: 'Ask anything — full step-by-step working', color: '#ec4899', tip: 'Best for: specific questions' },
]

const CHAR_LIMIT = 12000

 function StudyAI() {
  
  const { user, profile } = useUser()

  const [inputText, setInputText] = useState('')
  const [subject, setSubject] = useState('')
  const [activeTool, setActiveTool] = useState(null)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')

  const [uploadedFiles, setUploadedFiles] = useState([])
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const [result, setResult] = useState(null)
  const [resultType, setResultType] = useState(null)

  const [flashcards, setFlashcards] = useState([])
  const [fcIndex, setFcIndex] = useState(0)
  const [fcFlipped, setFcFlipped] = useState(false)
  const [fcCompleted, setFcCompleted] = useState(new Set())

  const [quizItems, setQuizItems] = useState([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizSelected, setQuizSelected] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)
  const [quizReview, setQuizReview] = useState([])

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatBottomRef = useRef(null)
  const chatInputRef = useRef(null)

  const showToast = (msg, type = 'info', dur = 3000) => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(null), dur)
  }

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages, streamText])

  const getContent = () => {
    if (uploadedFiles.length > 0 && uploadedFiles[activeFileIndex]?.content) return uploadedFiles[activeFileIndex].content
    return inputText.trim()
  }

  const processFile = async (file) => {
    const name = file.name; const type = file.type
    try {
      if (type === 'application/pdf' || name.endsWith('.pdf')) {
        const formData = new FormData(); formData.append('file', file)
        const res = await fetch('/api/extract-pdf-upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          if (data.text) return { name, content: data.text.slice(0, CHAR_LIMIT), pages: data.pages, type: 'pdf', size: file.size }
        }
        return { name, content: `[PDF: ${name} — could not extract text]`, pages: 0, type: 'pdf', size: file.size, error: true }
      }
      if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
        const text = await file.text()
        return { name, content: text.slice(0, CHAR_LIMIT), type: 'text', size: file.size }
      }
      if (name.endsWith('.docx') || name.endsWith('.doc')) {
        const formData = new FormData(); formData.append('file', file)
        const res = await fetch('/api/extract-docx', { method: 'POST', body: formData }).catch(() => null)
        if (res?.ok) { const data = await res.json(); if (data.text) return { name, content: data.text.slice(0, CHAR_LIMIT), type: 'docx', size: file.size } }
        return { name, content: `[Word: ${name}]`, type: 'docx', size: file.size, error: true }
      }
      try { const text = await file.text(); if (text.length > 20) return { name, content: text.slice(0, CHAR_LIMIT), type: 'text', size: file.size } } catch {}
      return { name, content: `[File: ${name}]`, type: 'unknown', size: file.size, error: true }
    } catch (e) { return { name, content: `[File: ${name} — error: ${e.message}]`, type: 'error', size: file.size, error: true } }
  }

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, 5)
    if (!files.length) return
    setUploading(true)
    const processed = []
    for (const file of files) { const r = await processFile(file); if (r) processed.push(r) }
    setUploadedFiles(prev => { const combined = [...prev, ...processed].slice(0, 5); setActiveFileIndex(combined.length - 1); return combined })
    const ok = processed.filter(f => !f.error).length, err = processed.filter(f => f.error).length
    if (ok > 0) showToast(`✅ Loaded ${ok} file${ok > 1 ? 's' : ''}${err > 0 ? ` (${err} could not be read)` : ''}`, 'success')
    else showToast('⚠️ Could not extract text — files may be scanned images', 'warning')
    setUploading(false)
  }

  const removeFile = (index) => {
    setUploadedFiles(prev => { const next = prev.filter((_, i) => i !== index); setActiveFileIndex(Math.min(activeFileIndex, Math.max(0, next.length - 1))); return next })
  }

  const handleDragOver = e => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }
  const handleDrop = e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }

  const runTool = async (toolId) => {
    const content = getContent()
    if (!content && toolId !== 'chat') { showToast('⚠️ Add study material first — paste text, upload a PDF, or type a topic', 'warning'); return }
    setActiveTool(toolId); setLoading(true); setStreamText(''); setResult(null); setResultType(null)
    setFlashcards([]); setFcIndex(0); setFcFlipped(false); setFcCompleted(new Set())
    setQuizItems([]); setQuizIndex(0); setQuizSelected(null); setQuizScore(0); setQuizDone(false); setQuizReview([])

    if (toolId === 'chat') {
      if (chatMessages.length === 0) {
        setChatMessages([{ role: 'assistant', content: `👋 Hi! I'm your AI tutor${subject ? ` for **${subject}**` : ''}.\n\n${content ? `I can see your study material. ` : ''}I'll show full step-by-step working for all calculations and format equations properly.\n\nWhat would you like help with?` }])
      }
      setLoading(false)
      setTimeout(() => chatInputRef.current?.focus(), 100)
      return
    }

    const fileInfo = uploadedFiles[activeFileIndex] ? `\nFile: "${uploadedFiles[activeFileIndex].name}"${uploadedFiles[activeFileIndex].pages ? ` (${uploadedFiles[activeFileIndex].pages} pages)` : ''}` : ''

    await streamFromAPI(
      { tool: toolId, content, subject, fileInfo },
      chunk => setStreamText(chunk),
      full => {
        setStreamText(''); setLoading(false)
        if (toolId === 'flashcards' || toolId === 'quiz') {
          const parsed = safeParseJSON(full)
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            if (toolId === 'flashcards') { setFlashcards(parsed); setResultType('flashcards') }
            else { setQuizItems(parsed); setResultType('quiz') }
          } else { setResult(full); setResultType('text'); showToast('ℹ️ Could not parse into interactive format — showing as text', 'info') }
        } else { setResult(full); setResultType('text') }
      },
      err => { showToast('❌ ' + err, 'error'); setLoading(false); setStreamText('') }
    )
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || loading) return
    setChatInput('')
    const content = getContent()
    const newMessages = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages); setLoading(true); setStreamText('')
    await streamFromAPI(
      { tool: 'chat', content, subject, messages: newMessages },
      chunk => setStreamText(chunk),
      full => { setChatMessages(prev => [...prev, { role: 'assistant', content: full }]); setStreamText(''); setLoading(false) },
      err => { showToast('❌ ' + err, 'error'); setLoading(false) }
    )
  }

  const selectAnswer = (letter) => {
    if (quizSelected !== null) return
    setQuizSelected(letter)
    const correct = quizItems[quizIndex]?.answer
    const isCorrect = letter === correct
    if (isCorrect) setQuizScore(s => s + 1)
    setQuizReview(prev => [...prev, { q: quizItems[quizIndex]?.q, selected: letter, correct, isCorrect, explanation: quizItems[quizIndex]?.explanation || '' }])
  }

  const nextQuestion = () => {
    if (quizIndex < quizItems.length - 1) { setQuizIndex(i => i + 1); setQuizSelected(null) }
    else setQuizDone(true)
  }

  const downloadResult = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeTool}_${(subject || 'study').replace(/\s+/g, '_')}.txt`; a.click()
    URL.revokeObjectURL(url)
    showToast('✅ Downloaded!', 'success')
  }

  const charCount = getContent().length
  const wordCount = getContent().split(/\s+/).filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '100px 16px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📚 Study AI</h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Upload a PDF, drop files, or paste notes — then choose a tool. All equations are formatted correctly with full working shown.</p>
        </div>

        {/* Input section */}
        <div ref={dropZoneRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          style={{ background: isDragging ? 'rgba(37,99,235,0.04)' : 'var(--surface)', border: `2px solid ${isDragging ? '#2563eb' : 'var(--border)'}`, borderRadius: 16, padding: 20, marginBottom: 24, transition: 'all 0.15s' }}>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="📖 Subject / Module (e.g. Power Systems III)"
              style={{ flex: 1, minWidth: 200, padding: '9px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              {uploading ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #60a5fa', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> Reading...</> : '📎 Upload Files'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.doc,.docx" multiple onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </div>

          {uploadedFiles.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} onClick={() => setActiveFileIndex(i)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', background: activeFileIndex === i ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${activeFileIndex === i ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, transition: 'all 0.1s' }}>
                    <span style={{ fontSize: 12 }}>{f.type === 'pdf' ? '📄' : f.type === 'docx' ? '📝' : '📋'}</span>
                    <span style={{ fontSize: 11, color: activeFileIndex === i ? '#60a5fa' : '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    {f.pages > 0 && <span style={{ fontSize: 9, color: '#64748b' }}>({f.pages}p)</span>}
                    {f.error && <span style={{ fontSize: 9, color: '#ef4444' }}>⚠️</span>}
                    <button onClick={e => { e.stopPropagation(); removeFile(i) }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {uploadedFiles.length < 5 && <button onClick={() => fileInputRef.current?.click()} style={{ padding: '5px 10px', borderRadius: 8, background: 'none', border: '1px dashed rgba(37,99,235,0.3)', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>+ Add file</button>}
              </div>
              {uploadedFiles[activeFileIndex] && !uploadedFiles[activeFileIndex].error && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 11, color: '#10b981' }}>
                  ✅ Using: <strong>{uploadedFiles[activeFileIndex].name}</strong> — {uploadedFiles[activeFileIndex].content?.length?.toLocaleString()} chars extracted
                </div>
              )}
            </div>
          )}

          {uploadedFiles.length === 0 && !inputText && (
            <div style={{ border: '2px dashed rgba(37,99,235,0.2)', borderRadius: 10, padding: '16px', textAlign: 'center', marginBottom: 12, color: '#64748b', fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
              Drag & drop PDF, Word, or text files here — or click Upload Files above
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <textarea value={inputText} onChange={e => setInputText(e.target.value.slice(0, CHAR_LIMIT))}
              placeholder={uploadedFiles.length > 0 ? 'Or add extra notes here to combine with your uploaded file...' : 'Paste your lecture notes, textbook content, or any study material here...\n\nTip: You can also drag & drop files directly onto this area!'}
              rows={uploadedFiles.length > 0 ? 4 : 8}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', minHeight: uploadedFiles.length > 0 ? 80 : 160 }} />
            <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: charCount > CHAR_LIMIT * 0.9 ? '#f59e0b' : '#64748b' }}>
              {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
            </div>
          </div>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {charCount > 0 ? `${charCount.toLocaleString()} chars · ~${wordCount.toLocaleString()} words` : 'No content yet — add text or upload a file'}
            </div>
            {inputText && <button onClick={() => setInputText('')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: '#64748b', cursor: 'pointer' }}>Clear text</button>}
          </div>
        </div>

        {/* Tool selector */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>
            Choose a Tool <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>{charCount > 0 ? `(${charCount.toLocaleString()} chars ready)` : '(add content above first)'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: 10 }}>
            {TOOLS.map(tool => (
              <button key={tool.id} onClick={() => runTool(tool.id)} disabled={loading}
                style={{ padding: '14px 12px', borderRadius: 12, background: activeTool === tool.id ? `${tool.color}20` : 'var(--surface)', border: `1.5px solid ${activeTool === tool.id ? tool.color + '70' : 'var(--border)'}`, color: activeTool === tool.id ? tool.color : '#94a3b8', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && activeTool !== tool.id ? 0.45 : 1, textAlign: 'left', transition: 'all 0.15s', position: 'relative' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = tool.color + '70'; e.currentTarget.style.background = tool.color + '15'; e.currentTarget.style.color = tool.color } }}
                onMouseLeave={e => { if (activeTool !== tool.id) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = '#94a3b8' } }}
              >
                {loading && activeTool === tool.id && <div style={{ position: 'absolute', top: 8, right: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${tool.color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /></div>}
                <div style={{ fontSize: 24, marginBottom: 7 }}>{tool.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3, lineHeight: 1.2 }}>{tool.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4, marginBottom: 4 }}>{tool.desc}</div>
                <div style={{ fontSize: 9, color: '#374151', fontStyle: 'italic' }}>{tool.tip}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Loading / streaming */}
        {loading && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>{TOOLS.find(t => t.id === activeTool)?.icon} Generating {TOOLS.find(t => t.id === activeTool)?.label}...</span>
            </div>
            {streamText && <MathRenderer content={streamText} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.85 }} />}
          </div>
        )}

        {/* Text result */}
        {!loading && result && resultType === 'text' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                {TOOLS.find(t => t.id === activeTool)?.icon} {TOOLS.find(t => t.id === activeTool)?.label}
                {subject && <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>— {subject}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(result); showToast('📋 Copied!', 'success') }} style={{ padding: '6px 13px', borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>📋 Copy</button>
                <button onClick={downloadResult} style={{ padding: '6px 13px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>⬇ Download</button>
                <button onClick={() => runTool(activeTool)} style={{ padding: '6px 13px', borderRadius: 7, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 11, cursor: 'pointer' }}>🔄 Regenerate</button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <MathRenderer content={result} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.9 }} />
            </div>
          </div>
        )}

        {/* Flashcards */}
        {!loading && resultType === 'flashcards' && flashcards.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>🃏 Flashcards {subject ? `— ${subject}` : ''}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{fcIndex + 1} / {flashcards.length}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>{fcCompleted.size} ✓</span>
                <button onClick={() => runTool('flashcards')} style={{ padding: '4px 10px', borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>🔄 New set</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
              {flashcards.map((_, i) => (
                <div key={i} onClick={() => { setFcIndex(i); setFcFlipped(false) }} style={{ flex: 1, height: 5, borderRadius: 3, background: fcCompleted.has(i) ? '#10b981' : i === fcIndex ? '#7c3aed' : 'var(--border)', cursor: 'pointer', transition: 'background 0.2s' }} title={`Card ${i + 1}`} />
              ))}
            </div>

            <div onClick={() => { setFcFlipped(f => !f); if (!fcFlipped) setFcCompleted(prev => new Set([...prev, fcIndex])) }}
              style={{ minHeight: 200, background: fcFlipped ? 'rgba(16,185,129,0.08)' : 'rgba(37,99,235,0.08)', border: `1.5px solid ${fcFlipped ? 'rgba(16,185,129,0.35)' : 'rgba(37,99,235,0.35)'}`, borderRadius: 14, padding: 28, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all 0.2s', userSelect: 'none' }}>
              <div style={{ fontSize: 11, color: fcFlipped ? '#10b981' : '#60a5fa', fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                <span>{fcFlipped ? '✅ Answer' : '❓ Question'}</span>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Tap to flip</span>
              </div>
              <MathRenderer content={fcFlipped ? flashcards[fcIndex]?.a : flashcards[fcIndex]?.q} style={{ fontSize: 16, color: '#f1f5f9', lineHeight: 1.7, fontWeight: fcFlipped ? 400 : 600 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setFcIndex(i => Math.max(0, i - 1)); setFcFlipped(false) }} disabled={fcIndex === 0} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', opacity: fcIndex === 0 ? 0.35 : 1 }}>← Previous</button>
              <button onClick={() => setFcFlipped(f => !f)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 700, cursor: 'pointer' }}>🔄 Flip</button>
              <button onClick={() => { setFcIndex(i => Math.min(flashcards.length - 1, i + 1)); setFcFlipped(false) }} disabled={fcIndex === flashcards.length - 1} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', opacity: fcIndex === flashcards.length - 1 ? 0.35 : 1 }}>Next →</button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>All Cards</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                {flashcards.map((card, i) => (
                  <div key={i} onClick={() => { setFcIndex(i); setFcFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    style={{ padding: '10px 12px', borderRadius: 9, background: fcCompleted.has(i) ? 'rgba(16,185,129,0.07)' : 'var(--surface2)', border: `1px solid ${i === fcIndex ? 'rgba(124,58,237,0.4)' : fcCompleted.has(i) ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.1s' }}>
                    <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>Card {i + 1} {fcCompleted.has(i) ? '✓' : ''}</div>
                    <div style={{ fontSize: 11, color: '#f1f5f9', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.q}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quiz */}
        {!loading && resultType === 'quiz' && quizItems.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            {quizDone ? (
              <div>
                <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>{quizScore === quizItems.length ? '🏆' : quizScore >= quizItems.length * 0.7 ? '🎉' : '📚'}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: quizScore === quizItems.length ? '#10b981' : quizScore >= quizItems.length * 0.7 ? '#f59e0b' : '#ef4444', marginBottom: 6 }}>
                    {quizScore}/{quizItems.length} ({Math.round(quizScore / quizItems.length * 100)}%)
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
                    {quizScore === quizItems.length ? '🌟 Perfect score! Outstanding!' : quizScore >= quizItems.length * 0.7 ? '✅ Great job! Keep it up!' : '📖 Keep studying — you\'ll get there!'}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => { setQuizIndex(0); setQuizSelected(null); setQuizScore(0); setQuizDone(false); setQuizReview([]) }} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔄 Retry Quiz</button>
                    <button onClick={() => runTool('quiz')} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🎲 New Quiz</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Review All Questions</div>
                  {quizReview.map((r, i) => (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 10, background: r.isCorrect ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${r.isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Question {i + 1}</div>
                      <MathRenderer content={r.q} style={{ fontSize: 13, color: '#f1f5f9', marginBottom: 8, fontWeight: 600 }} />
                      <div style={{ fontSize: 12, color: r.isCorrect ? '#10b981' : '#ef4444', marginBottom: 4 }}>Your answer: {r.selected} — {r.isCorrect ? '✅ Correct' : `❌ Wrong (correct: ${r.correct})`}</div>
                      {r.explanation && <MathRenderer content={r.explanation} style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }} />}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>🧠 Quiz {subject ? `— ${subject}` : ''}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Q{quizIndex + 1} / {quizItems.length} · Score: {quizScore}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {quizItems.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < quizIndex ? (quizReview[i]?.isCorrect ? '#10b981' : '#ef4444') : i === quizIndex ? '#2563eb' : 'var(--border)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <MathRenderer content={quizItems[quizIndex]?.q} style={{ fontSize: 15, color: '#f1f5f9', lineHeight: 1.7, fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {(quizItems[quizIndex]?.options || []).map((opt, i) => {
                    const letter = opt.match(/^([A-D])\)/)?.[1] || ['A','B','C','D'][i]
                    const isSelected = quizSelected === letter
                    const isCorrect = quizSelected !== null && letter === quizItems[quizIndex]?.answer
                    const isWrong = isSelected && !isCorrect
                    return (
                      <button key={i} onClick={() => selectAnswer(letter)} disabled={quizSelected !== null}
                        style={{ padding: '13px 16px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${isCorrect ? 'rgba(16,185,129,0.6)' : isWrong ? 'rgba(239,68,68,0.6)' : isSelected ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`, background: isCorrect ? 'rgba(16,185,129,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : 'var(--surface2)', color: '#e2e8f0', cursor: quizSelected !== null ? 'default' : 'pointer', fontSize: 13, lineHeight: 1.5, fontWeight: isCorrect || isWrong ? 700 : 400, transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <MathRenderer content={opt} style={{ flex: 1 }} />
                        {isCorrect && <span style={{ color: '#10b981', flexShrink: 0 }}>✅</span>}
                        {isWrong && <span style={{ color: '#ef4444', flexShrink: 0 }}>❌</span>}
                      </button>
                    )
                  })}
                </div>
                {quizSelected && (
                  <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, background: quizSelected === quizItems[quizIndex]?.answer ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${quizSelected === quizItems[quizIndex]?.answer ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: quizSelected === quizItems[quizIndex]?.answer ? '#10b981' : '#ef4444', marginBottom: 8 }}>
                      {quizSelected === quizItems[quizIndex]?.answer ? '✅ Correct!' : `❌ Incorrect — Correct: ${quizItems[quizIndex]?.answer}`}
                    </div>
                    {quizItems[quizIndex]?.explanation && <MathRenderer content={quizItems[quizIndex].explanation} style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }} />}
                    <button onClick={nextQuestion} style={{ marginTop: 12, width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      {quizIndex < quizItems.length - 1 ? 'Next Question →' : '🎉 See Results'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Chat Tutor */}
        {activeTool === 'chat' && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '14px 18px', background: 'rgba(236,72,153,0.08)', borderBottom: '1px solid rgba(236,72,153,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>💬 AI Tutor {subject ? `— ${subject}` : ''}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Full step-by-step working · Proper math notation · Ask anything</div>
              </div>
              <button onClick={() => { setChatMessages([]); showToast('Chat cleared', 'info') }} style={{ padding: '5px 10px', borderRadius: 7, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Clear</button>
            </div>

            <div style={{ maxHeight: 520, minHeight: 200, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{msg.role === 'user' ? 'You' : '🤖 AI Tutor'}</div>
                  <MathRenderer content={msg.content} style={{ padding: '11px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 13, lineHeight: 1.8, maxWidth: '92%' }} />
                </div>
              ))}

              {(loading && activeTool === 'chat' || streamText) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>🤖 AI Tutor</div>
                  {streamText
                    ? <MathRenderer content={streamText} style={{ padding: '11px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.8, maxWidth: '92%' }} />
                    : <div style={{ padding: '11px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface2)', border: '1px solid var(--border)' }}><span style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span></div>
                  }
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {chatMessages.length <= 1 && (
              <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Explain the main concepts', 'Solve question 1 step by step', 'Give me a summary', 'What formulas do I need?', 'Quiz me on this topic'].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); chatInputRef.current?.focus() }}
                    style={{ padding: '5px 11px', borderRadius: 9, fontSize: 11, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', transition: 'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input ref={chatInputRef} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading) sendChat() }} disabled={loading}
                placeholder={`Ask anything about ${subject || 'your subject'}... e.g. "Solve Q3 step by step"`}
                style={{ flex: 1, padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(236,72,153,0.3)', color: '#e2e8f0', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'rgba(236,72,153,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(236,72,153,0.3)'} />
              <button onClick={sendChat} disabled={!chatInput.trim() || loading}
                style={{ padding: '10px 16px', borderRadius: 9, background: chatInput.trim() && !loading ? 'linear-gradient(135deg,#ec4899,#be185d)' : 'var(--surface2)', color: chatInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>↑</button>
            </div>
          </div>
        )}

        {!loading && !result && !['flashcards', 'quiz', 'chat'].includes(resultType) && !activeTool && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>☝️</div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Add your study material above, then pick a tool to get started</div>
          </div>
        )}

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, background: toastType === 'error' ? '#ef4444' : toastType === 'success' ? '#10b981' : toastType === 'warning' ? '#f59e0b' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,100% { transform: translateY(0); opacity: .3 } 50% { transform: translateY(-5px); opacity: 1 } }
      `}</style>
    </div>
  )
}