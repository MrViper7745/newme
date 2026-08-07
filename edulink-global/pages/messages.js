import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'
import withMobile from '../components/withMobile'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import UsernameSetup from '../components/UsernameSetup'
import SaveContactModal from '../components/SaveContactModal'

const MobileMessages = dynamic(() => import('./mobile/MobileMessages'), { ssr: false })

export default function MessagesPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileMessages />
  return <Messages />
}

 function Messages() {

  const { user, profile } = useUser()

  const [showUsernameSetup, setShowUsernameSetup] = useState(false)
  const [myUsername, setMyUsername] = useState(profile?.username || null)
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveTarget, setSaveTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState('contacts') // 'contacts' | 'search'

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const searchTimeout = useRef(null)

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => {
    if (!profile) return
    setMyUsername(profile.username)
    if (!profile.username_set) setShowUsernameSetup(true)
    loadContacts()
  }, [profile])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeContact || !user) return
    loadMessages(activeContact)

    // Real-time subscription
    const channel = supabase
      .channel(`messages_${[user.id, activeContact.contact_user_id].sort().join('_')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        if (
          (payload.new.sender_id === user.id && payload.new.receiver_id === activeContact.contact_user_id) ||
          (payload.new.sender_id === activeContact.contact_user_id && payload.new.receiver_id === user.id)
        ) {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeContact?.contact_user_id])

  const loadContacts = async () => {
    const { data } = await supabase
      .from('user_contacts')
      .select('*, contact_profile:contact_user_id(username, name, field, institution)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setContacts(data || [])
  }

  const loadMessages = async (contact) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !activeContact || sending) return
    setInput(''); setSending(true)

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: activeContact.contact_user_id,
      content: text,
    })

    if (error) showToast('❌ Could not send: ' + error.message)
    setSending(false)
    inputRef.current?.focus()
  }

  const handleSearch = (val) => {
    setSearchQuery(val)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch('/api/find-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val.replace('@', '') }),
      })
      const data = await res.json()
      setSearchResults(data.user ? [data.user] : [])
      setSearching(false)
    }, 400)
  }

  const openContact = (contact) => {
    setActiveContact(contact)
    setMessages([])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const groupMessages = (msgs) => {
    const groups = []
    let currentDate = null
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toDateString()
      if (date !== currentDate) { groups.push({ type: 'date', date }); currentDate = date }
      groups.push({ type: 'message', ...msg })
    })
    return groups
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {showUsernameSetup && (
        <UsernameSetup onComplete={(u) => { setMyUsername(u); setShowUsernameSetup(false); showToast(`✅ Username @${u} set!`) }} />
      )}
      {showSaveModal && saveTarget && (
        <SaveContactModal contactUser={saveTarget} onClose={() => { setShowSaveModal(false); setSaveTarget(null) }} onSaved={() => { loadContacts(); showToast('✅ Contact saved!') }} />
      )}

      <div style={{ flex: 1, display: 'flex', paddingTop: 64, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: showSidebar ? 300 : 0, flexShrink: 0, transition: 'width 0.25s', overflow: 'hidden', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          {showSidebar && (
            <>
              {/* My username badge */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {myUsername ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {(profile?.name || myUsername)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{profile?.name || 'You'}</div>
                      <div style={{ fontSize: 12, color: '#60a5fa' }}>@{myUsername}</div>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(`@${myUsername}`).then(() => showToast('📋 Username copied!'))} title="Copy username" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>📋</button>
                  </div>
                ) : (
                  <button onClick={() => setShowUsernameSetup(true)} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    👤 Set your username
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {[{ id: 'contacts', label: '💬 Chats' }, { id: 'search', label: '🔍 Find Users' }].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', color: activeTab === tab.id ? '#60a5fa' : '#64748b', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}` }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contacts tab */}
              {activeTab === 'contacts' && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>No contacts yet</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6 }}>Switch to "Find Users" to search for people by their username</div>
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <div key={contact.id} onClick={() => openContact(contact)}
                        style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', background: activeContact?.id === contact.id ? 'rgba(37,99,235,0.12)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (activeContact?.id !== contact.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (activeContact?.id !== contact.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {contact.saved_as[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.saved_as}</div>
                          <div style={{ fontSize: 11, color: '#60a5fa' }}>@{contact.contact_username || contact.contact_profile?.username}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Search tab */}
              {activeTab === 'search' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14 }}>@</span>
                      <input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by username..."
                        style={{ width: '100%', padding: '9px 11px 9px 26px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}
                      />
                      {searching && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', border: '2px solid #60a5fa', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>Enter the exact username to find a user</div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
                    {searchResults.map(result => (
                      <div key={result.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {(result.name || result.username)[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{result.name || 'User'}</div>
                            <div style={{ fontSize: 12, color: '#60a5fa' }}>@{result.username}</div>
                            {result.field && <div style={{ fontSize: 11, color: '#64748b' }}>{result.field}{result.institution ? ` · ${result.institution}` : ''}</div>}
                          </div>
                        </div>
                        <button
                          onClick={() => { setSaveTarget(result); setShowSaveModal(true) }}
                          style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          💾 Save Contact & Message
                        </button>
                      </div>
                    ))}

                    {searchQuery && !searching && searchResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 12 }}>
                        No user found with username @{searchQuery.replace('@', '')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Chat header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setShowSidebar(s => !s)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, padding: 4 }}>☰</button>
            {activeContact ? (
              <>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {activeContact.saved_as[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{activeContact.saved_as}</div>
                  <div style={{ fontSize: 11, color: '#60a5fa' }}>@{activeContact.contact_username || activeContact.contact_profile?.username}</div>
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>💬 Messages</div>
            )}
          </div>

          {/* Messages */}
          {activeContact ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                    <div style={{ fontSize: 14 }}>Say hi to <strong style={{ color: '#f1f5f9' }}>{activeContact.saved_as}</strong>!</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>This is the start of your conversation</div>
                  </div>
                )}

                {groupMessages(messages).map((item, i) => (
                  item.type === 'date' ? (
                    <div key={i} style={{ textAlign: 'center', margin: '16px 0 8px', fontSize: 11, color: '#64748b' }}>
                      <span style={{ background: 'var(--surface)', padding: '3px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>{item.date}</span>
                    </div>
                  ) : (
                    <div key={item.id} style={{ display: 'flex', justifyContent: item.sender_id === user.id ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                      {item.sender_id !== user.id && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0, marginRight: 7, alignSelf: 'flex-end' }}>
                          {activeContact.saved_as[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ maxWidth: '72%' }}>
                        <div style={{ padding: '9px 13px', borderRadius: item.sender_id === user.id ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: item.sender_id === user.id ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: item.sender_id !== user.id ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word' }}>
                          {item.content}
                        </div>
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textAlign: item.sender_id === user.id ? 'right' : 'left' }}>
                          {formatTime(item.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--bg)' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !sending) sendMessage() }}
                  placeholder={`Message ${activeContact.saved_as}...`}
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', color: '#e2e8f0', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(37,99,235,0.3)'}
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending}
                  style={{ padding: '11px 16px', borderRadius: 10, background: input.trim() && !sending ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', color: input.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>↑</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: '#64748b' }}>
              <div style={{ fontSize: 52 }}>💬</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Your Messages</div>
              <div style={{ fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
                Select a conversation from the sidebar, or search for a user by their username to start chatting.
              </div>
              {!myUsername && (
                <button onClick={() => setShowUsernameSetup(true)} style={{ marginTop: 8, padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  👤 Set your username first
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

