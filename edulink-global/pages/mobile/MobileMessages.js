import { useState, useEffect, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

export default function MobileMessages() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const msgEndRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => { if (user) loadContacts() }, [user])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!activeContact) return
    loadMessages(activeContact.id)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`dms_${user.id}_${activeContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const m = payload.new
        if ((m.sender_id === user.id && m.receiver_id === activeContact.id) || (m.sender_id === activeContact.id && m.receiver_id === user.id)) {
          setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        }
      })
      .subscribe()
    channelRef.current = ch
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [activeContact?.id])

  const loadContacts = async () => {
    const { data } = await supabase.from('user_contacts').select('*, contact:profiles!contact_id(id,name,username,avatar_url)').eq('user_id', user.id).order('created_at', { ascending: false })
    setContacts(data || [])
  }

  const loadMessages = async (contactId) => {
    const { data } = await supabase.from('direct_messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(50)
    setMessages(data || [])
    await supabase.from('direct_messages').update({ read: true }).eq('receiver_id', user.id).eq('sender_id', contactId).eq('read', false)
  }

  const doSearch = async (q) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase.from('profiles').select('id,name,username,avatar_url,field').ilike('username', `%${q}%`).neq('id', user.id).limit(8)
    setSearchResults(data || [])
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchUser), 350)
    return () => clearTimeout(t)
  }, [searchUser])

  const saveContact = async (p) => {
    await supabase.from('user_contacts').upsert({ user_id: user.id, contact_id: p.id }, { onConflict: 'user_id,contact_id' })
    setActiveContact(p)
    setSearchUser('')
    setSearchResults([])
    await loadContacts()
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !activeContact) return
    const content = input.trim()
    setInput('')
    setSending(true)
    haptic.tap()
    const temp = { id: `temp_${Date.now()}`, sender_id: user.id, receiver_id: activeContact.id, content, created_at: new Date().toISOString(), read: false, _temp: true }
    setMessages(prev => [...prev, temp])
    try {
      const { data } = await supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: activeContact.id, content, read: false }).select().single()
      if (data) setMessages(prev => prev.map(m => m.id === temp.id ? data : m))
    } catch { setMessages(prev => prev.filter(m => m.id !== temp.id)) }
    setSending(false)
  }

  if (activeContact) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => setActiveContact(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {activeContact.avatar_url ? <img src={activeContact.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (activeContact.name || '?')[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeContact.name || 'Student'}</div>
            {activeContact.username && <div style={{ fontSize: 10, color: '#60a5fa' }}>@{activeContact.username}</div>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, WebkitOverflowScrolling: 'touch' }}>
          {messages.map((m, i) => {
            const isMe = m.sender_id === user.id
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '78%' }}>
                  <div style={{ padding: '9px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: isMe ? 'none' : '1px solid var(--border)', color: isMe ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.5, opacity: m._temp ? 0.7 : 1 }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                    {timeAgo(m.created_at)}{isMe && (m._temp ? ' · sending' : m.read ? ' · ✓✓' : ' · ✓')}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={msgEndRef} />
        </div>

        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${activeContact.name || 'student'}...`}
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
    <MobileLayout title="✉️ Messages">
      <PullToRefresh onRefresh={loadContacts}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search by @username..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
          </div>

          {searchResults.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              {searchResults.map(p => (
                <div key={p.id} onClick={() => { haptic.tap(); saveContact(p) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {(p.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name || 'Student'}</div>
                    {p.username && <div style={{ fontSize: 11, color: '#60a5fa' }}>@{p.username}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Message →</span>
                </div>
              ))}
            </div>
          )}

          {contacts.length === 0 && !searchUser ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✉️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No messages yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>Search by @username to find and message other students</div>
            </div>
          ) : (
            contacts.map(c => {
              const p = c.contact
              if (!p) return null
              return (
                <div key={c.id} onClick={() => { haptic.tap(); setActiveContact(p) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.nickname || p.name || 'Student'}</div>
                    {p.username && <div style={{ fontSize: 11, color: '#60a5fa' }}>@{p.username}</div>}
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: 16 }}>→</span>
                </div>
              )
            })
          )}
        </div>
      </PullToRefresh>
    </MobileLayout>
  )
}