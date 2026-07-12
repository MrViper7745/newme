import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'

const QUICK = [
  'Find IT internships in Nigeria',
  'Best scholarships for African students',
  'How to write a CV for UK jobs',
  'Internships in Germany for engineers',
  'Fulbright scholarship requirements',
  'Remote internships worldwide',
]

const generateId = () => Math.random().toString(36).slice(2, 10)

const createNewChat = () => ({
  id: generateId(),
  title: 'New Chat',
  messages: [],
  createdAt: new Date().toISOString(),
})

export default function Assistant() {
  const [chats, setChats] = useState([createNewChat()])
  const [activeChatId, setActiveChatId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [toast, setToast] = useState(null)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const renameRef = useRef(null)

  // Set first chat as active on load
  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id)
    }
  }, [])

  // Load chats from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('edubot_chats')
      const savedActive = localStorage.getItem('edubot_active')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) {
          setChats(parsed)
          setActiveChatId(savedActive || parsed[0].id)
          return
        }
      }
    } catch {}
    const fresh = createNewChat()
    setChats([fresh])
    setActiveChatId(fresh.id)
  }, [])

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      try {
        localStorage.setItem('edubot_chats', JSON.stringify(chats))
      } catch {}
    }
  }, [chats])

  // Save active chat id
  useEffect(() => {
    if (activeChatId) {
      try {
        localStorage.setItem('edubot_active', activeChatId)
      } catch {}
    }
  }, [activeChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, streamingText, activeChatId])

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus()
    }
  }, [renamingId])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const activeChat = chats.find(c => c.id === activeChatId)
  const activeMessages = activeChat?.messages || []

  const updateChat = (id, updater) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, ...updater(c) } : c))
  }

  const newChat = () => {
    const chat = createNewChat()
    setChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setInput('')
    setStreamingText('')
    setLoading(false)
  }

  const deleteChat = (id) => {
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id)
      if (remaining.length === 0) {
        const fresh = createNewChat()
        setActiveChatId(fresh.id)
        return [fresh]
      }
      if (id === activeChatId) {
        setActiveChatId(remaining[0].id)
      }
      return remaining
    })
    showToast('Chat deleted')
  }

  const startRename = (chat) => {
    setRenamingId(chat.id)
    setRenameValue(chat.title)
  }

  const confirmRename = (id) => {
    if (renameValue.trim()) {
      updateChat(id, () => ({ title: renameValue.trim() }))
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const clearAllChats = () => {
    const fresh = createNewChat()
    setChats([fresh])
    setActiveChatId(fresh.id)
    try { localStorage.removeItem('edubot_chats') } catch {}
    showToast('All chats cleared')
  }

  // Auto-title the chat from the first message
  const autoTitle = (chatId, firstMessage) => {
    const title = firstMessage.length > 40
      ? firstMessage.slice(0, 40) + '...'
      : firstMessage
    updateChat(chatId, () => ({ title }))
  }

  const send = async (quickText) => {
    const userInput = quickText || input.trim()
    if (!userInput || loading) return

    setInput('')
    setLoading(true)
    setStreamingText('')

    const currentChatId = activeChatId
    const isFirstMessage = activeMessages.length === 0

    const newUserMsg = { role: 'user', content: userInput }
    const updatedMessages = [...activeMessages, newUserMsg]

    // Add user message to chat
    updateChat(currentChatId, c => ({ messages: [...c.messages, newUserMsg] }))

    // Auto-title from first message
    if (isFirstMessage) {
      autoTitle(currentChatId, userInput)
    }

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          }))
        })
      })

      if (!res.ok) {
        const err = await res.text()
        updateChat(currentChatId, c => ({
          messages: [...c.messages, { role: 'assistant', content: `⚠️ Error: ${err}` }]
        }))
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()

          if (data === '[DONE]') {
            updateChat(currentChatId, c => ({
              messages: [...c.messages, { role: 'assistant', content: fullText }]
            }))
            setStreamingText('')
            setLoading(false)
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              updateChat(currentChatId, c => ({
                messages: [...c.messages, { role: 'assistant', content: `⚠️ ${parsed.error}` }]
              }))
              setStreamingText('')
              setLoading(false)
              return
            }
            if (parsed.text) {
              fullText += parsed.text
              setStreamingText(fullText)
            }
          } catch { }
        }
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        updateChat(currentChatId, c => ({
          messages: [...c.messages, {
            role: 'assistant',
            content: '⚠️ Connection failed. Check GROQ_API_KEY in .env.local'
          }]
        }))
      } else {
        if (streamingText) {
          updateChat(currentChatId, c => ({
            messages: [...c.messages, { role: 'assistant', content: streamingText }]
          }))
        }
      }
    } finally {
      setLoading(false)
      setStreamingText('')
    }
  }

  const stop = () => abortRef.current?.abort()

  const formatTime = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{
        flex: 1,
        display: 'flex',
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        paddingTop: 72,
        height: 'calc(100vh - 72px)',
      }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
        }}>
          <div style={{ padding: '16px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* New Chat button */}
            <button onClick={newChat} style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              color: '#fff', border: 'none', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            }}>
              <span style={{ fontSize: 18 }}>＋</span> New Chat
            </button>

            <div style={{ fontSize: 11, color: '#374151', padding: '6px 4px 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {chats.length} Chat{chats.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Chat list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => { if (renamingId !== chat.id) setActiveChatId(chat.id) }}
                style={{
                  borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                  background: activeChatId === chat.id ? 'rgba(37,99,235,0.15)' : 'transparent',
                  border: `1px solid ${activeChatId === chat.id ? 'rgba(37,99,235,0.35)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {renamingId === chat.id ? (
                  // Rename input
                  <div style={{ padding: '8px 10px' }}>
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename(chat.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={() => confirmRename(chat.id)}
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: 7,
                        background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.5)',
                        color: '#e2e8f0', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  // Chat row
                  <div style={{ padding: '10px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>
                      {chat.messages.length === 0 ? '💬' : '🗨️'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: activeChatId === chat.id ? '#e2e8f0' : '#94a3b8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{chat.title}</div>
                      <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>
                        {chat.messages.length} msg{chat.messages.length !== 1 ? 's' : ''} · {formatTime(chat.createdAt)}
                      </div>
                    </div>

                    {/* Action buttons — show on active */}
                    {activeChatId === chat.id && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); startRename(chat) }}
                          title="Rename"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '2px 5px', borderRadius: 5 }}
                        >✏️</button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                          title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '2px 5px', borderRadius: 5 }}
                        >🗑</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar footer */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <button onClick={clearAllChats} style={{
              width: '100%', padding: '8px', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>🗑 Clear All Chats</button>
          </div>
        </div>

        {/* ── MAIN CHAT AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)',
          }}>
            {/* Sidebar toggle */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 18, padding: '4px 8px', borderRadius: 6,
            }} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              {sidebarOpen ? '◀' : '▶'}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>
                {activeChat?.title || 'EduBot AI'}
              </div>
              <div style={{ fontSize: 11, color: '#374151' }}>
                Groq · llama-3.3-70b-versatile · streaming
              </div>
            </div>

            <button onClick={newChat} style={{
              padding: '7px 16px', borderRadius: 8,
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              color: '#fff', border: 'none', fontWeight: 600,
              fontSize: 13, cursor: 'pointer',
            }}>＋ New Chat</button>
          </div>

          {/* Quick prompts — show only on empty chat */}
          {activeMessages.length === 0 && !loading && (
            <div style={{ padding: '24px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ width: '100%', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 20, marginBottom: 4 }}>EduBot AI</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Ask me anything about internships, scholarships, and career advice worldwide</div>
              </div>
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  padding: '8px 16px', borderRadius: 20, fontSize: 12,
                  cursor: 'pointer', background: 'var(--surface)',
                  border: '1px solid var(--border)', color: '#94a3b8',
                }}>{q}</button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {activeMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, padding: '0 6px' }}>
                  {msg.role === 'user' ? 'You' : '🤖 EduBot'}
                </div>
                <div style={{
                  padding: '11px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg,#1d4ed8,#2563eb)'
                    : 'var(--surface)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: '#e2e8f0', fontSize: 14, lineHeight: 1.75,
                  maxWidth: '80%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Live streaming bubble */}
            {(loading || streamingText) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, paddingLeft: 6 }}>🤖 EduBot</div>
                <div style={{
                  padding: '11px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: '#e2e8f0', fontSize: 14, lineHeight: 1.75,
                  maxWidth: '80%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  minWidth: 60,
                }}>
                  {streamingText ? (
                    <>
                      {streamingText}
                      <span style={{
                        display: 'inline-block', width: 2, height: 14,
                        background: '#60a5fa', marginLeft: 3,
                        verticalAlign: 'middle',
                        animation: 'blink 0.7s step-end infinite',
                      }} />
                    </>
                  ) : (
                    <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#60a5fa', display: 'inline-block',
                          animation: `bounce 1s ${i * 0.15}s ease-in-out infinite`,
                        }} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !loading) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Message EduBot..."
                disabled={loading}
                autoFocus
                style={{
                  flex: 1, padding: '13px 16px', borderRadius: 12, fontSize: 14,
                  background: 'var(--bg)',
                  border: '1px solid rgba(37,99,235,0.4)',
                  color: '#e2e8f0', outline: 'none',
                }}
              />
              {loading ? (
                <button onClick={stop} style={{
                  padding: '13px 18px', borderRadius: 12, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#ef4444', fontWeight: 700, fontSize: 14,
                }}>⏹ Stop</button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim()} style={{
                  padding: '13px 22px', borderRadius: 12,
                  background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: input.trim() ? '#fff' : '#64748b',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 14,
                }}>Send ↑</button>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#374151', marginTop: 8, textAlign: 'center' }}>
              Chats are saved locally in your browser · Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">{toast}</div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}