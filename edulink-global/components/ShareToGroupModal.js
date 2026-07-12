import { useState, useEffect } from 'react'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

export default function ShareToGroupModal({ file, onClose }) {
  const { user } = useUser()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    const { data } = await supabase
      .from('group_chats')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setGroups(data || [])
    setLoading(false)
  }

  const share = async () => {
    if (!selectedGroup) return
    setSharing(true)
    try {
      const res = await fetch('/api/share-to-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup.id,
          user_id: user.id,
          file_id: file.id,
          message,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        setTimeout(() => onClose(), 1500)
      }
    } catch {}
    setSharing(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 26, maxWidth: 420, width: '100%' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>Shared to {selectedGroup?.name}!</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>📤 Share to Group Chat</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            {/* File preview */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{file.title || file.name}</div>
                {file.label && <div style={{ fontSize: 11, color: '#60a5fa' }}>{file.label}</div>}
              </div>
            </div>

            {/* Group picker */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Select Group</label>
              {loading ? (
                <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>Loading groups...</div>
              ) : groups.length === 0 ? (
                <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>No groups available. Create one in Community first.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {groups.map(group => (
                    <div key={group.id} onClick={() => setSelectedGroup(group)}
                      style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: selectedGroup?.id === group.id ? 'rgba(16,185,129,0.12)' : 'var(--surface2)', border: `1px solid ${selectedGroup?.id === group.id ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s' }}>
                      <span style={{ fontSize: 22 }}>{group.avatar || '👥'}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: selectedGroup?.id === group.id ? '#10b981' : '#f1f5f9' }}>{group.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{Array.isArray(group.members) ? group.members.length : 0} members{group.subject ? ` · ${group.subject}` : ''}</div>
                      </div>
                      {selectedGroup?.id === group.id && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional message */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Message (optional)</label>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Here's the past paper for Power Systems..." style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={share} disabled={!selectedGroup || sharing} style={{ flex: 2, padding: '11px', borderRadius: 10, background: selectedGroup && !sharing ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', color: selectedGroup ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {sharing ? '⏳ Sharing...' : '📤 Share to Group'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}