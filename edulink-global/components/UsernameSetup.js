import { useState, useEffect } from 'react'
import { useUser } from '../lib/useUser'

export default function UsernameSetup({ onComplete }) {
  const { user, profile } = useUser()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [statusMsg, setStatusMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const checkTimeout = { current: null }

  // Pre-fill with name-based suggestion
  useEffect(() => {
    if (profile?.name) {
      const suggestion = profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 20)
      setUsername(suggestion)
    }
  }, [profile])

  const checkUsername = async (val) => {
    if (!val || val.length < 3) { setStatus(null); setStatusMsg(''); return }
    setStatus('checking')
    try {
      const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val }),
      })
      const data = await res.json()
      if (data.available) {
        setStatus('available'); setStatusMsg('✅ Available!')
      } else {
        setStatus('taken'); setStatusMsg(data.reason || '❌ Already taken')
      }
    } catch {
      setStatus(null)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24)
    setUsername(val)
    setStatus(null)
    clearTimeout(checkTimeout.current)
    checkTimeout.current = setTimeout(() => checkUsername(val), 500)
  }

  const save = async () => {
    if (status !== 'available' || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, username }),
      })
      const data = await res.json()
      if (data.success) {
        onComplete?.(data.username)
      } else {
        setStatus('taken'); setStatusMsg(data.error || 'Could not save username')
      }
    } catch (e) {
      setStatusMsg('❌ Error: ' + e.message)
    }
    setSaving(false)
  }

  const statusColor = { available: '#10b981', taken: '#ef4444', checking: '#f59e0b', invalid: '#ef4444' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 20, padding: 36, maxWidth: 440, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Choose your username</div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            Other users will see this when you message them or appear in search. You can only set this once, so choose carefully.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: `1.5px solid ${status ? (statusColor[status] || 'var(--border)') : 'rgba(124,58,237,0.3)'}`, borderRadius: 10, padding: '0 14px', transition: 'border-color 0.2s' }}>
            <span style={{ color: '#64748b', fontSize: 15, flexShrink: 0 }}>@</span>
            <input
              value={username}
              onChange={handleChange}
              placeholder="your_username"
              maxLength={24}
              style={{ flex: 1, padding: '12px 8px', fontSize: 16, background: 'transparent', border: 'none', color: '#f1f5f9', outline: 'none', fontFamily: 'monospace' }}
              onKeyDown={e => { if (e.key === 'Enter' && status === 'available') save() }}
            />
            {status === 'checking' && (
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #f59e0b', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
            )}
          </div>

          {statusMsg && (
            <div style={{ marginTop: 8, fontSize: 12, color: statusColor[status] || '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              {statusMsg}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
            3–24 characters · letters, numbers, underscores, dots, hyphens only
          </div>
        </div>

        {/* Preview */}
        {username.length >= 3 && (
          <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>How others will see you:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {(profile?.name || username)[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{profile?.name || 'Your Name'}</div>
                <div style={{ fontSize: 12, color: '#60a5fa' }}>@{username}</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={save}
          disabled={status !== 'available' || saving}
          style={{ width: '100%', padding: '13px', borderRadius: 11, background: status === 'available' && !saving ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: status === 'available' ? '#fff' : '#64748b', border: 'none', fontWeight: 800, fontSize: 15, cursor: status === 'available' ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
        >
          {saving ? '⏳ Saving...' : status === 'available' ? `Set @${username}` : 'Choose a valid username'}
        </button>

        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#64748b' }}>
          This cannot be changed later — choose wisely!
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}