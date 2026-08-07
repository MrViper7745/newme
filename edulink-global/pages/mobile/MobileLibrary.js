import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import CameraScanner from '../../components/mobile/CameraScanner'
import MobileEduBotBubble from '../../components/mobile/MobileEduBotBubble'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import useHaptic from '../../hooks/useHaptic'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/router'

const LABEL_COLOR = {
  'Past Exam Paper': '#ef4444', 'Memo / Marking Guide': '#10b981',
  'Lecture Slides': '#2563eb', 'Study Notes': '#8b5cf6',
  'Textbook / Chapter': '#f59e0b', 'Tutorial / Worksheet': '#06b6d4',
}

export default function MobileLibrary() {
  const { user } = useUser()
  const router = useRouter()
  const haptic = useHaptic()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFile, setActiveFile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [filterLabel, setFilterLabel] = useState('all')
  const [swipedId, setSwipedId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('library_files').select('*').eq('user_id', user.id).order('saved_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  const openFile = async (file) => {
    haptic.tap()
    setActiveFile(file)
    setMessages([])
    await supabase.from('library_files').update({ last_opened: new Date().toISOString() }).eq('id', file.id)
    const { data: session } = await supabase.from('library_sessions').select('conversation').eq('user_id', user.id).eq('file_id', file.id).single()
    if (session?.conversation?.length > 0) {
      setMessages(session.conversation)
    } else {
      const intro = file.content_text
        ? `📄 I have read your file **${file.title || file.name}**. What would you like to know? I can explain concepts, solve questions, create flashcards, or quiz you.`
        : `📄 I have opened **${file.title || file.name}**. I can see the file but cannot read its text directly. Try uploading a PDF — I can extract the full text from PDFs.`
      setMessages([{ role: 'assistant', content: intro }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !activeFile) return
    const q = input.trim()
    setInput('')
    setSending(true)
    const newMessages = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)

    try {
      const systemPrompt = `You are an expert AI tutor helping a student study the file "${activeFile.title || activeFile.name}" (type: ${activeFile.label || activeFile.ext || 'document'}).${activeFile.content_text ? `\n\nFull file content:\n${activeFile.content_text.slice(0, 8000)}` : ''}\n\nBe thorough, educational, and encouraging. For math use clear notation. For exam questions show full step-by-step working.`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      const withPlaceholder = [...newMessages, { role: 'assistant', content: '' }]
      setMessages(withPlaceholder)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setMessages([...newMessages, { role: 'assistant', content: full }]) } } catch {}
        }
      }
      const finalMessages = [...newMessages, { role: 'assistant', content: full }]
      await supabase.from('library_sessions').upsert({ user_id: user.id, file_id: activeFile.id, conversation: finalMessages, updated_at: new Date().toISOString() }, { onConflict: 'user_id,file_id' })
    } catch {}
    setSending(false)
  }

  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return
    await supabase.from('library_files').delete().eq('id', fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setSwipedId(null)
    showToast('🗑 Deleted')
  }

  const filtered = files.filter(f => {
    const q = search.toLowerCase()
    if (filterLabel !== 'all' && f.label !== filterLabel) return false
    if (q && !f.title?.toLowerCase().includes(q) && !f.name?.toLowerCase().includes(q)) return false
    return true
  })

  const labels = [...new Set(files.map(f => f.label).filter(Boolean))]

  const QUICK_CHIPS = ['What is this about?', 'Solve all questions', 'Summarise key points', 'Quiz me', 'Key formulas', 'Create flashcards']

  // Full-screen AI chat view
  if (activeFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
        {/* Chat header */}
        <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => setActiveFile(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFile.title || activeFile.name}</div>
            {activeFile.label && <div style={{ fontSize: 10, color: LABEL_COLOR[activeFile.label] || 'var(--text3)' }}>{activeFile.label}</div>}
          </div>
          {activeFile.url && (
            <a href={activeFile.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>View file ↗</a>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, WebkitOverflowScrolling: 'touch' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginRight: 8, marginTop: 4 }}>🤖</div>}
              <div style={{ padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.65, maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                {m.content || (sending && i === messages.length - 1 ? '...' : '')}
              </div>
            </div>
          ))}
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, padding: '6px 14px', overflowX: 'auto', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          {QUICK_CHIPS.map((chip, i) => (
            <button key={i} onClick={() => { setInput(chip); }}
              style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface)', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about this file..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 22, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ↑
          </button>
        </div>
      </div>
    )
  }

  return (
    <MobileLayout
      title="📚 Library"
      rightAction={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCamera(true)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📸 Scan</button>
          <button onClick={() => router.push('/upload')} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Upload</button>
        </div>
      }
    >
      <PullToRefresh onRefresh={load}>
        <div style={{ padding: '12px 16px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
          </div>

          {/* Label filter */}
          {labels.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
              {['all', ...labels].map(l => (
                <button key={l} onClick={() => setFilterLabel(l)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: filterLabel === l ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: filterLabel === l ? '#60a5fa' : 'var(--text3)', border: `1px solid ${filterLabel === l ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                  {l === 'all' ? `All (${files.length})` : l}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading library...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No files yet</div>
              <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Scan a document or upload files to start studying</div>
              <button onClick={() => setShowCamera(true)} style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>📸 Scan a Document</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(file => (
                <div key={file.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
                  {/* Swipe actions (revealed behind) */}
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', background: 'var(--surface2)' }}>
                    <button onClick={() => deleteFile(file.id)} style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>🗑 Delete</button>
                  </div>
                  {/* Card */}
                  <div onClick={() => openFile(file)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transform: swipedId === file.id ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 0.25s', WebkitTapHighlightColor: 'transparent' }}
                    onTouchStart={e => { const x = e.touches[0].clientX; e.currentTarget._startX = x }}
                    onTouchEnd={e => {
                      const dx = e.changedTouches[0].clientX - (e.currentTarget._startX || 0)
                      if (dx < -40) setSwipedId(file.id)
                      else if (dx > 20) { setSwipedId(null); openFile(file) }
                    }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${LABEL_COLOR[file.label] || '#64748b'}15`, border: `1px solid ${LABEL_COLOR[file.label] || '#64748b'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {file.ext === 'pdf' ? '📄' : file.ext === 'pptx' || file.ext === 'ppt' ? '📊' : '📝'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{file.title || file.name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {file.label && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: `${LABEL_COLOR[file.label] || '#64748b'}15`, color: LABEL_COLOR[file.label] || 'var(--text3)', fontWeight: 600 }}>{file.label}</span>}
                        {file.priority === 'high' && <span style={{ fontSize: 10, color: '#ef4444' }}>🔴 High</span>}
                        {file.content_text && <span style={{ fontSize: 10, color: '#10b981' }}>📖</span>}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text3)', fontSize: 16, flexShrink: 0 }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      <CameraScanner open={showCamera} onClose={() => setShowCamera(false)} onCapture={({ analysis }) => { setShowCamera(false); load() }} />
      <MobileEduBotBubble />
      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}