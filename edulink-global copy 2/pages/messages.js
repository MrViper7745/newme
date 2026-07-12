 import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const EMOJIS = ['😊','👍','🎉','❤️','🔥','💯','🙏','😂','🤔','👋','✅','⭐','🚀','💪','📚','🙌','💡','🎯']

export default function Messages() {
  const { user, profile } = useUser()
  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [toast, setToast] = useState(null)
  const [searchThread, setSearchThread] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const activeThreadRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { activeThreadRef.current = activeThread }, [activeThread])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    if (!user) return
    fetchThreads()
    setupSubscription()
    // On mobile, hide sidebar when a thread is selected
    const handleResize = () => {
      if (window.innerWidth >= 768) setShowSidebar(true)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user])

  useEffect(() => {
    if (activeThread) {
      fetchMessages(activeThread)
      // On mobile, hide sidebar when thread opens
      if (window.innerWidth < 768) setShowSidebar(false)
    }
  }, [activeThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const setupSubscription = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        fetchThreads()
        if (activeThreadRef.current) fetchMessages(activeThreadRef.current)
      })
      .subscribe()
  }

  const fetchThreads = async () => {
    setLoadingThreads(true)
    const { data } = await supabase
      .from('message_threads')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setThreads(data || [])
    setLoadingThreads(false)
  }

  const fetchMessages = async (thread) => {
    const otherId = getOtherId(thread)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    // Mark as read
    await supabase.from('messages').update({ read: true }).eq('receiver_id', user.id).eq('sender_id', otherId)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeThread) return
    const otherId = getOtherId(activeThread)
    const content = input.trim()
    setInput('')
    setShowEmoji(false)
    inputRef.current?.focus()
    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: otherId, content })
    await supabase.from('message_threads').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', activeThread.id)
    fetchMessages(activeThread)
    fetchThreads()
  }

  const startNewThread = async () => {
    const recipientId = newRecipientId.trim()
    if (!recipientId) { showToast('Paste a user ID'); return }
    if (recipientId === user.id) { showToast('You cannot message yourself'); return }
    const existing = threads.find(t =>
      (t.participant_1 === user.id && t.participant_2 === recipientId) ||
      (t.participant_1 === recipientId && t.participant_2 === user.id)
    )
    if (existing) { setActiveThread(existing); setShowNew(false); setNewRecipientId(''); return }
    const { data, error } = await supabase.from('message_threads').insert({
      participant_1: user.id, participant_2: recipientId,
      last_message: '', last_message_at: new Date().toISOString(),
    }).select().single()
    if (error) { showToast('❌ Could not start conversation. Check the user ID.'); return }
    setThreads(prev => [data, ...prev])
    setActiveThread(data)
    setShowNew(false)
    setNewRecipientId('')
    showToast('✅ Conversation started!')
  }

  const getOtherId = (thread) => thread.participant_1 === user.id ? thread.participant_2 : thread.participant_1

  const formatTime = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return d.toLocaleDateString('en', { weekday: 'short' })
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
  }

  const formatMessageTime = (iso) => new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })

  const filteredThreads = threads.filter(t => {
    const otherId = getOtherId(t)
    return otherId.toLowerCase().includes(searchThread.toLowerCase()) ||
      (t.last_message || '').toLowerCase().includes(searchThread.toLowerCase())
  })

  const avatarLetter = (id) => id?.[0]?.toUpperCase() || '?'
  const avatarColor = (id) => {
    const colors = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']
    return colors[id?.charCodeAt(0) % colors.length] || '#2563eb'
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Navbar />
      <div style={{ fontSize: 48 }}>💬</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Sign in to access messages</div>
      <div style={{ fontSize: 13, color: '#64748b' }}>Connect with students and employers worldwide</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{
        flex: 1, display: 'flex',
        marginTop: 72,
        height: 'calc(100vh - 72px)',
        overflow: 'hidden',
      }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: showSidebar ? (window.innerWidth < 768 ? '100%' : 300) : 0,
          minWidth: showSidebar ? (window.innerWidth < 768 ? '100%' : 300) : 0,
          maxWidth: window.innerWidth < 768 ? '100%' : 300,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface)',
          position: window.innerWidth < 768 ? 'absolute' : 'relative',
          top: window.innerWidth < 768 ? 72 : 0,
          left: 0, bottom: 0,
          zIndex: window.innerWidth < 768 ? 20 : 1,
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>💬 Messages</div>
              <button onClick={() => setShowNew(true)} style={{
                padding: '6px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>+ New</button>
            </div>
            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search conversations..."
              value={searchThread}
              onChange={e => setSearchThread(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 12,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: '#e2e8f0', outline: 'none',
              }}
            />
          </div>

          {/* My ID */}
          <div style={{ padding: '8px 14px', background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
              Your User ID — share to receive messages
            </div>
            <div
              onClick={() => { navigator.clipboard.writeText(user.id); showToast('✅ User ID copied!') }}
              style={{
                fontSize: 10, color: '#60a5fa', fontFamily: 'monospace',
                cursor: 'pointer', wordBreak: 'break-all',
                padding: '4px 8px', background: 'rgba(37,99,235,0.08)', borderRadius: 5,
                border: '1px solid rgba(37,99,235,0.15)',
              }}
              title="Click to copy"
            >
              {user.id} 📋
            </div>
          </div>

          {/* Thread list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingThreads ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#374151', fontSize: 12 }}>Loading...</div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                {searchThread ? 'No conversations match' : 'No conversations yet'}
                <br />
                <span style={{ fontSize: 12, color: '#374151' }}>Click + New to start one</span>
              </div>
            ) : filteredThreads.map(thread => {
              const isActive = activeThread?.id === thread.id
              const otherId = getOtherId(thread)
              const color = avatarColor(otherId)
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isActive ? 'rgba(37,99,235,0.12)' : 'transparent',
                    transition: 'background 0.15s',
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {avatarLetter(otherId)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <div style={{ fontWeight: 600, color: isActive ? '#e2e8f0' : '#94a3b8', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                        User {otherId.slice(0, 8)}...
                      </div>
                      <div style={{ fontSize: 10, color: '#374151', flexShrink: 0 }}>{formatTime(thread.last_message_at)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {thread.last_message || 'No messages yet'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          {activeThread ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {/* Back button on mobile */}
                <button
                  onClick={() => { setShowSidebar(true); setActiveThread(null) }}
                  style={{
                    display: window.innerWidth < 768 ? 'flex' : 'none',
                    background: 'none', border: 'none', color: '#60a5fa',
                    cursor: 'pointer', fontSize: 20, padding: '2px 6px', alignItems: 'center',
                  }}>←</button>

                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: avatarColor(getOtherId(activeThread)),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {avatarLetter(getOtherId(activeThread))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>
                    User {getOtherId(activeThread).slice(0, 12)}...
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981' }}>● Online</div>
                </div>

                {/* Desktop sidebar toggle */}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  style={{
                    display: window.innerWidth >= 768 ? 'flex' : 'none',
                    background: 'none', border: 'none', color: '#64748b',
                    cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                    alignItems: 'center', borderRadius: 6,
                  }}
                >{showSidebar ? '◀' : '▶'}</button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#374151', marginTop: 60, fontSize: 13 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
                    Start the conversation!
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id
                  const showTime = i === messages.length - 1 || messages[i + 1]?.sender_id !== msg.sender_id
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)',
                        border: !isMe ? '1px solid var(--border)' : 'none',
                        color: '#e2e8f0', fontSize: 14, lineHeight: 1.6,
                        maxWidth: '72%', wordBreak: 'break-word',
                        boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                      }}>{msg.content}</div>
                      {showTime && (
                        <div style={{ fontSize: 10, color: '#374151', marginTop: 3, padding: '0 4px' }}>
                          {isMe ? 'You' : 'Them'} · {formatMessageTime(msg.created_at)}
                          {isMe && <span style={{ marginLeft: 4 }}>✓✓</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                {/* Emoji picker */}
                {showEmoji && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10,
                    padding: '10px 12px', background: 'var(--surface2)',
                    borderRadius: 12, border: '1px solid var(--border)',
                  }}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => { setInput(p => p + e); inputRef.current?.focus() }}
                        style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: 4, transition: 'transform 0.1s' }}
                      >{e}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <button onClick={() => setShowEmoji(!showEmoji)} style={{
                    padding: '10px', borderRadius: 10, fontSize: 18,
                    background: showEmoji ? 'rgba(37,99,235,0.12)' : 'var(--surface2)',
                    border: `1px solid ${showEmoji ? '#2563eb' : 'var(--border)'}`,
                    cursor: 'pointer', flexShrink: 0,
                  }}>😊</button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 14,
                      background: 'var(--bg)', border: '1px solid rgba(37,99,235,0.4)',
                      color: '#e2e8f0', outline: 'none', resize: 'none',
                      maxHeight: 120, lineHeight: 1.5,
                      fontFamily: 'inherit',
                    }}
                    onInput={e => {
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim()} style={{
                    padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)',
                    color: input.trim() ? '#fff' : '#64748b',
                    border: `1px solid ${input.trim() ? 'transparent' : 'var(--border)'}`,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}>↑</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: '#64748b' }}>
              <div style={{ fontSize: 60 }}>💬</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Your Messages</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.7, color: '#64748b' }}>
                Select a conversation from the sidebar, or start a new one by sharing your User ID.
              </div>
              <button onClick={() => setShowNew(true)} style={{
                marginTop: 4, padding: '12px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>+ Start New Conversation</button>
            </div>
          )}
        </div>
      </div>

      {/* New message modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 6 }}>New Conversation</div>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Paste the recipient's EduLink User ID. They can find their ID on the Messages page.
            </p>
            <div
              onClick={() => { navigator.clipboard.writeText(user.id); showToast('✅ Copied!') }}
              style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>Your ID (click to copy)</div>
              <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user.id}</div>
            </div>
            <input
              value={newRecipientId}
              onChange={e => setNewRecipientId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startNewThread()}
              placeholder="Paste recipient's user ID here..."
              style={{ width: '100%', padding: '11px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowNew(false); setNewRecipientId('') }} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={startNewThread} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Start Conversation →</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

