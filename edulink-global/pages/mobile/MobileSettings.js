import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'
import { useRouter } from 'next/router'

export default function MobileSettings() {
  const { user, profile, signOut } = useUser()
  const router = useRouter()
  const haptic = useHaptic()
  const [theme, setTheme] = useState('dark')
  const [notifs, setNotifs] = useState({ email: true, reminders: true, community: true, messages: true })
  const [location, setLocation] = useState({ city: '', country: '', loading: false, error: null })
  const [toast, setToast] = useState(null)
  const [activeSheet, setActiveSheet] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const t = localStorage.getItem('theme') || 'dark'
    setTheme(t)
    if (profile) {
      setNotifs({ email: profile.notifications_email !== false, reminders: profile.notifications_reminders !== false, community: profile.notifications_community !== false, messages: profile.notifications_messages !== false })
      setLocation(prev => ({ ...prev, city: profile.city || '', country: profile.country || '' }))
    }
  }, [profile])

  const switchTheme = (t) => {
    setTheme(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
    haptic.tap()
    showToast(`✅ Switched to ${t} mode`)
  }

  const detectLocation = () => {
    if (!navigator.geolocation) { showToast('❌ Location not supported'); return }
    setLocation(prev => ({ ...prev, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, { headers: { 'Accept-Language': 'en' } })
        const d = await res.json()
        const city = d.address?.city || d.address?.town || d.address?.village || ''
        const country = d.address?.country || ''
        setLocation({ city, country, loading: false, error: null })
        await supabase.from('profiles').update({ city, country, lat, lng, location_updated_at: new Date().toISOString() }).eq('id', user.id)
        haptic.success()
        showToast(`📍 Location set: ${city}${city && country ? ', ' : ''}${country}`)
      } catch { setLocation(prev => ({ ...prev, loading: false, error: 'Could not determine location' })) }
    }, () => setLocation(prev => ({ ...prev, loading: false, error: 'Permission denied' })))
  }

  const saveNotifs = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ notifications_email: notifs.email, notifications_reminders: notifs.reminders, notifications_community: notifs.community, notifications_messages: notifs.messages }).eq('id', user.id)
    setSaving(false)
    haptic.success()
    showToast('✅ Preferences saved!')
    setActiveSheet(null)
  }

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) { showToast('⚠️ Passwords do not match'); return }
    if (newPassword.length < 8) { showToast('⚠️ Minimum 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else { haptic.success(); showToast('✅ Password updated!'); setNewPassword(''); setConfirmPassword(''); setActiveSheet(null) }
  }

  const Toggle = ({ value, onChange, label, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <button onClick={() => { haptic.tap(); onChange(!value) }}
        style={{ width: 46, height: 26, borderRadius: 13, background: value ? '#2563eb' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </button>
    </div>
  )

  const SETTINGS_ITEMS = [
    { icon: '🎨', label: 'Appearance', desc: `Currently: ${theme} mode`, onPress: () => setActiveSheet('theme') },
    { icon: '📍', label: 'Location', desc: location.city ? `${location.city}${location.country ? ', ' + location.country : ''}` : 'Not set', onPress: () => setActiveSheet('location') },
    { icon: '🔔', label: 'Notifications', desc: 'Email, reminders, community', onPress: () => setActiveSheet('notifications') },
    { icon: '🔑', label: 'Change Password', desc: 'Update your account password', onPress: () => setActiveSheet('password') },
    { icon: '🧩', label: 'Browser Extension', desc: 'Set up file scanning', onPress: () => setActiveSheet('extension') },
    { icon: '📊', label: 'My Analytics', desc: 'Study performance data', onPress: () => router.push('/analytics') },
    { icon: '💳', label: 'Subscription', desc: 'Student plan — active', onPress: () => setActiveSheet('subscription') },
  ]

  return (
    <MobileLayout title="⚙️ Settings">
      <div style={{ padding: '12px 16px' }}>

        {/* User card */}
        {user && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.name || user.email || '?')[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Student'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              {profile?.username && <div style={{ fontSize: 11, color: '#60a5fa' }}>@{profile.username}</div>}
            </div>
          </div>
        )}

        {/* Settings list */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          {SETTINGS_ITEMS.map((item, i) => (
            <div key={i} onClick={item.onPress}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < SETTINGS_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
              onTouchEnd={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                {item.desc && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.desc}</div>}
              </div>
              <span style={{ color: 'var(--text3)', fontSize: 18, flexShrink: 0 }}>›</span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button onClick={async () => { haptic.warning(); await signOut(); router.push('/') }}
          style={{ width: '100%', padding: '13px', borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
          🚪 Sign Out
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>EduLink Global · Student Platform</div>
      </div>

      {/* Theme sheet */}
      <MobileBottomSheet open={activeSheet === 'theme'} onClose={() => setActiveSheet(null)} title="🎨 Appearance" height="40vh">
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ id: 'dark', emoji: '🌙', label: 'Dark', desc: 'Easier on the eyes at night' }, { id: 'light', emoji: '☀️', label: 'Light', desc: 'Better in bright rooms' }].map(t => (
              <div key={t.id} onClick={() => switchTheme(t.id)}
                style={{ padding: '18px 14px', borderRadius: 14, background: theme === t.id ? 'rgba(37,99,235,0.12)' : 'var(--surface2)', border: `2px solid ${theme === t.id ? '#2563eb' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{t.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme === t.id ? '#60a5fa' : 'var(--text)', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </MobileBottomSheet>

      {/* Location sheet */}
      <MobileBottomSheet open={activeSheet === 'location'} onClose={() => setActiveSheet(null)} title="📍 Location" height="55vh">
        <div style={{ padding: '16px' }}>
          {location.city && (
            <div style={{ padding: '12px 16px', borderRadius: 11, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{location.city}{location.city && location.country ? ', ' : ''}{location.country}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Current location</div>
              </div>
            </div>
          )}
          {location.error && <div style={{ padding: '10px', borderRadius: 9, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 14, fontSize: 12, color: '#ef4444' }}>⚠️ {location.error}</div>}
          <button onClick={detectLocation} disabled={location.loading}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: location.loading ? 'var(--surface2)' : 'linear-gradient(135deg,#10b981,#059669)', color: location.loading ? 'var(--text3)' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {location.loading ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Detecting...</> : '📍 Use My Location'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ key: 'city', label: 'City', placeholder: 'e.g. Durban' }, { key: 'country', label: 'Country', placeholder: 'e.g. South Africa' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input value={location[f.key]} onChange={e => setLocation(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
              </div>
            ))}
          </div>
          <button onClick={async () => { await supabase.from('profiles').update({ city: location.city, country: location.country }).eq('id', user.id); haptic.success(); showToast('✅ Saved!'); setActiveSheet(null) }}
            style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 14 }}>
            💾 Save Location
          </button>
        </div>
      </MobileBottomSheet>

      {/* Notifications sheet */}
      <MobileBottomSheet open={activeSheet === 'notifications'} onClose={() => setActiveSheet(null)} title="🔔 Notifications" height="65vh">
        <div style={{ padding: '16px' }}>
          <Toggle value={notifs.email} onChange={v => setNotifs(p => ({ ...p, email: v }))} label="📧 Email notifications" desc="Weekly summaries and important alerts" />
          <Toggle value={notifs.reminders} onChange={v => setNotifs(p => ({ ...p, reminders: v }))} label="⏰ Study reminders" desc="When you haven't studied in a while" />
          <Toggle value={notifs.community} onChange={v => setNotifs(p => ({ ...p, community: v }))} label="🌍 Community activity" desc="Replies and group activity" />
          <Toggle value={notifs.messages} onChange={v => setNotifs(p => ({ ...p, messages: v }))} label="✉️ Direct messages" desc="New message notifications" />
          <button onClick={saveNotifs} disabled={saving}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 20 }}>
            {saving ? '⏳ Saving...' : '💾 Save Preferences'}
          </button>
        </div>
      </MobileBottomSheet>

      {/* Password sheet */}
      <MobileBottomSheet open={activeSheet === 'password'} onClose={() => setActiveSheet(null)} title="🔑 Change Password" height="50vh">
        <div style={{ padding: '16px' }}>
          {[{ label: 'New Password', val: newPassword, set: setNewPassword }, { label: 'Confirm Password', val: confirmPassword, set: setConfirmPassword }].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input type="password" value={f.val} onChange={e => f.set(e.target.value)} placeholder="8+ characters"
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <button onClick={changePassword} disabled={saving || !newPassword || newPassword !== confirmPassword}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: newPassword && newPassword === confirmPassword ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: newPassword && newPassword === confirmPassword ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? '⏳ Updating...' : 'Update Password'}
          </button>
        </div>
      </MobileBottomSheet>

      {/* Extension sheet */}
      <MobileBottomSheet open={activeSheet === 'extension'} onClose={() => setActiveSheet(null)} title="🧩 Browser Extension" height="70vh">
        <div style={{ padding: '16px' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>The EduLink extension lets you scan your university website and save files directly to your library — no manual downloading needed.</p>
          {[1, 2, 3, 4, 5].map((step, i) => {
            const steps = ['Install the EduLink Chrome extension from GitHub', 'Open the extension and go to the Profile tab', 'Tap "Read Credentials from EduLink"', 'Visit your university website and click Scan', 'Select files and tap "Save to EduLink"']
            return (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{step}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingTop: 3 }}>{steps[i]}</div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => { navigator.clipboard.writeText(JSON.stringify({ token: localStorage.getItem('edulink_token'), userId: localStorage.getItem('edulink_user_id') })); showToast('📋 Copied!') }}
              style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              📋 Copy Credentials
            </button>
            <button onClick={() => router.push('/upload')}
              style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              📤 Upload Files
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Subscription sheet */}
      <MobileBottomSheet open={activeSheet === 'subscription'} onClose={() => setActiveSheet(null)} title="💳 Subscription" height="50vh">
        <div style={{ padding: '16px' }}>
          <div style={{ padding: '20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(124,58,237,0.08))', border: '1px solid rgba(37,99,235,0.25)', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Student Plan — Active</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Full access to all EduLink features</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['✅ AI Tutor unlimited', '✅ All career tools', '✅ Daily challenges', '✅ Community groups'].map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)' }}>{f}</div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>
            To manage billing, contact <a href="mailto:support@edulinkglobal.com" style={{ color: '#60a5fa' }}>support@edulinkglobal.com</a>
          </div>
        </div>
      </MobileBottomSheet>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}