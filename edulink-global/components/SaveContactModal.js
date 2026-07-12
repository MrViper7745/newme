import { useState } from 'react'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

export default function SaveContactModal({ contactUser, onClose, onSaved }) {
  const { user } = useUser()
  const [savedAs, setSavedAs] = useState(contactUser?.name || contactUser?.username || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    if (!savedAs.trim() || saving) return
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('user_contacts').upsert({
      user_id: user.id,
      contact_user_id: contactUser.id,
      saved_as: savedAs.trim(),
      contact_username: contactUser.username,
    }, { onConflict: 'user_id,contact_user_id' })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved?.({ ...contactUser, saved_as: savedAs.trim() })
    onClose?.()
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
        <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17, marginBottom: 6 }}>💾 Save Contact</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Saving <strong style={{ color: '#60a5fa' }}>@{contactUser?.username}</strong> — choose what name to save them under. This is only visible to you.
        </div>

        {/* Contact preview */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(contactUser?.name || contactUser?.username || '?')[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{contactUser?.name || 'User'}</div>
            <div style={{ fontSize: 11, color: '#60a5fa' }}>@{contactUser?.username}</div>
            {contactUser?.field && <div style={{ fontSize: 10, color: '#64748b' }}>{contactUser.field}</div>}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Save as</label>
          <input
            value={savedAs}
            onChange={e => setSavedAs(e.target.value)}
            placeholder="e.g. John from class, Lab partner, Siya..."
            maxLength={50}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.3)', color: '#e2e8f0', outline: 'none' }}
            autoFocus
          />
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 5 }}>You can write anything — their real name, a nickname, or how you know them</div>
        </div>

        {error && <div style={{ marginBottom: 12, fontSize: 12, color: '#ef4444' }}>❌ {error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={!savedAs.trim() || saving} style={{ flex: 2, padding: '10px', borderRadius: 9, background: savedAs.trim() && !saving ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: savedAs.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? '⏳ Saving...' : '💾 Save Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}