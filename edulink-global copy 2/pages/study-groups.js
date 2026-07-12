import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS, FIELDS } from '../data/globalData'

export default function StudyGroups() {
  const { user, profile } = useUser()
  const [groups, setGroups] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ name: '', subject: '', region: 'all', description: '' })
  const bottomRef = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { fetchGroups() }, [])
  useEffect(() => { if (user) fetchMyGroups() }, [user])
  useEffect(() => { if (activeGroup) { fetchMessages(activeGroup.id); subscribeToMessages(activeGroup.id) } }, [activeGroup])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchGroups = async () => {
    const { data } = await supabase.from('study_groups').select('*').order('created_at', { ascending: false })
    setGroups(data || [])
  }

  const fetchMyGroups = async () => {
    const { data } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    setMyGroups(data?.map(d => d.group_id) || [])
  }

  const fetchMessages = async (groupId) => {
    const { data } = await supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(50)
    setMessages(data || [])
  }

  let channel = null
  const subscribeToMessages = (groupId) => {
    if (channel) supabase.removeChannel(channel)
    channel = supabase.channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
  }

  const joinGroup = async (groupId) => {
    if (!user) { showToast('Sign in to join groups'); return }
    await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id })
    setMyGroups(prev => [...prev, groupId])
    showToast('✅ Joined group!')
  }

  const leaveGroup = async (groupId) => {
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    setMyGroups(prev => prev.filter(id => id !== groupId))
    if (activeGroup?.id === groupId) setActiveGroup(null)
    showToast('Left group')
  }

  const createGroup = async () => {
    if (!form.name) { showToast('Group name is required'); return }
    const { data, error } = await supabase.from('study_groups').insert({ ...form, created_by: user.id }).select().single()
    if (error) { showToast('❌ Failed: ' + error.message); return }
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id })
    setMyGroups(prev => [...prev, data.id])
    setShowCreate(false)
    setForm({ name: '', subject: '', region: 'all', description: '' })
    fetchGroups()
    showToast('✅ Study group created!')
  }

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeGroup) return
    const msg = input.trim()
    setInput('')
    await supabase.from('group_messages').insert({ group_id: activeGroup.id, user_id: user.id, content: msg })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>👥 Study Groups</h1>
            <p style={{ color: '#64748b' }}>Join communities of students studying the same subjects worldwide</p>
          </div>
          {user && <button onClick={() => setShowCreate(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Create Group</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeGroup ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Groups list */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: activeGroup ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {groups.map(group => {
                const isMember = myGroups.includes(group.id)
                const isActive = activeGroup?.id === group.id
                const regionInfo = WORLD_REGIONS.find(r => r.id === group.region)
                return (
                  <div key={group.id} className="card-glow" style={{
                    background: isActive ? 'rgba(37,99,235,0.1)' : 'var(--surface)',
                    border: `1px solid ${isActive ? '#2563eb' : 'var(--border)'}`,
                    borderRadius: 14, padding: 18,
                  }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 4 }}>{group.name}</div>
                    <div style={{ color: '#60a5fa', fontSize: 12, marginBottom: 4 }}>{group.subject}</div>
                    {group.description && <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>{group.description}</p>}
                    {regionInfo && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{regionInfo.flag} {regionInfo.name}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isMember ? (
                        <>
                          <button onClick={() => setActiveGroup(isActive ? null : group)} style={{
                            flex: 1, padding: '7px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            background: isActive ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(37,99,235,0.12)',
                            color: isActive ? '#fff' : '#60a5fa', border: 'none',
                          }}>💬 {isActive ? 'Close Chat' : 'Open Chat'}</button>
                          <button onClick={() => leaveGroup(group.id)} style={{ padding: '7px 12px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Leave</button>
                        </>
                      ) : (
                        <button onClick={() => joinGroup(group.id)} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Join Group</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chat panel */}
          {activeGroup && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', height: 500 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>
                💬 {activeGroup.name}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && <div style={{ color: '#374151', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No messages yet. Say hello! 👋</div>}
                {messages.map((msg, i) => {
                  const isMe = msg.user_id === user?.id
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        padding: '8px 13px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)',
                        border: !isMe ? '1px solid var(--border)' : 'none',
                        color: '#e2e8f0', fontSize: 13, maxWidth: '80%',
                      }}>{msg.content}</div>
                      <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>{new Date(msg.created_at).toLocaleTimeString()}</div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              {user ? (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..." style={{ flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  <button onClick={sendMessage} style={{ padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Send</button>
                </div>
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>Sign in to send messages</div>
              )}
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 460 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 20 }}>Create Study Group</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'name', label: 'Group Name', placeholder: 'Machine Learning Study Circle' },
                  { key: 'subject', label: 'Subject / Topic', placeholder: 'Artificial Intelligence' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</label>
                    <input value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Region</label>
                  <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                    <option value="all">🌐 All Regions</option>
                    {WORLD_REGIONS.map(r => <option key={r.id} value={r.id}>{r.flag} {r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="What will this group focus on?"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={createGroup} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Create Group</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}