import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'

import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import ThemeToggle from '../components/ThemeToggle'

const MobileSettings = dynamic(() => import('./mobile/MobileSettings'), { ssr: false })

export default function SettingsPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileSettings />
  return <Settings />
}

const SECTIONS = [
  { id: 'account',        label: '👤 Account',         icon: '👤' },
  { id: 'appearance',     label: '🎨 Appearance',       icon: '🎨' },
  { id: 'location',       label: '📍 Location',         icon: '📍' },
  { id: 'notifications',  label: '🔔 Notifications',    icon: '🔔' },
  { id: 'privacy',        label: '🔒 Privacy',          icon: '🔒' },
  { id: 'extension',      label: '🧩 Extension',        icon: '🧩' },
  { id: 'subscription',   label: '💳 Subscription',     icon: '💳' },
  { id: 'danger',         label: '⚠️ Danger Zone',      icon: '⚠️' },
]


 function Settings() {
  
  const { user, profile, signOut } = useUser()
  const router = useRouter()
  const [active, setActive] = useState('account')
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  // Account
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    notifications_email: true,
    notifications_reminders: true,
    notifications_opportunities: true,
    notifications_community: true,
    notifications_messages: true,
  })

  // Location
  const [location, setLocation] = useState({ city: '', country: '', lat: null, lng: null, loading: false, error: null, lastUpdated: null })

  // Privacy
  const [privacy, setPrivacy] = useState({ profile_public: true, show_online: true, allow_messages: true })

  // Username
  const [newUsername, setNewUsername] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(null)

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => {
    if (user) setEmail(user.email || '')
    if (profile) {
      setNotifSettings({
        notifications_email: profile.notifications_email !== false,
        notifications_reminders: profile.notifications_reminders !== false,
        notifications_opportunities: profile.notifications_opportunities !== false,
        notifications_community: profile.notifications_community !== false,
        notifications_messages: profile.notifications_messages !== false,
      })
      setPrivacy({
        profile_public: profile.profile_public !== false,
        show_online: profile.show_online !== false,
        allow_messages: profile.allow_messages !== false,
      })
      if (profile.city || profile.country) {
        setLocation(prev => ({
          ...prev,
          city: profile.city || '',
          country: profile.country || '',
          lat: profile.lat || null,
          lng: profile.lng || null,
          lastUpdated: profile.location_updated_at || null,
        }))
      }
    }
  }, [user, profile])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported by your browser' }))
      return
    }
    setLocation(prev => ({ ...prev, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          // Reverse geocode using OpenStreetMap (free, no API key needed)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, {
            headers: { 'Accept-Language': 'en' }
          })
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || ''
          const country = data.address?.country || ''
          const now = new Date().toISOString()

          setLocation({ city, country, lat, lng, loading: false, error: null, lastUpdated: now })

          // Save to profile
          await supabase.from('profiles').update({ city, country, lat, lng, location_updated_at: now }).eq('id', user.id)
          showToast(`✅ Location updated: ${city}${city && country ? ', ' : ''}${country}`)
        } catch {
          setLocation(prev => ({ ...prev, loading: false, error: 'Could not determine city from your location' }))
        }
      },
      (err) => {
        const msgs = { 1: 'Location permission denied', 2: 'Location unavailable', 3: 'Location request timed out' }
        setLocation(prev => ({ ...prev, loading: false, error: msgs[err.code] || 'Could not get location' }))
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const saveNotifications = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update(notifSettings).eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else showToast('✅ Notification preferences saved!')
  }

  const savePrivacy = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update(privacy).eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else showToast('✅ Privacy settings saved!')
  }

  const changePassword = async () => {
    if (!newPassword) { showToast('⚠️ Enter a new password'); return }
    if (newPassword !== confirmPassword) { showToast('⚠️ Passwords do not match'); return }
    if (newPassword.length < 8) { showToast('⚠️ Password must be at least 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Password updated!'); setNewPassword(''); setConfirmPassword(''); setCurrentPassword('') }
  }

  const checkUsername = async (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setNewUsername(clean)
    if (clean.length < 3) { setUsernameAvailable(null); return }
    if (clean === profile?.username) { setUsernameAvailable('same'); return }
    setCheckingUsername(true)
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', clean).single()
      setUsernameAvailable(data ? false : true)
    } catch { setUsernameAvailable(true) }
    setCheckingUsername(false)
  }

  const setUsername = async () => {
    if (!newUsername || !usernameAvailable) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ username: newUsername, username_set: true }).eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Username set!'); setNewUsername('') }
  }

  const deleteAccount = async () => {
    const confirm1 = window.confirm('This will permanently delete your account and ALL your data. This cannot be undone. Are you sure?')
    if (!confirm1) return
    const confirm2 = window.prompt('Type DELETE to confirm:')
    if (confirm2 !== 'DELETE') return
    showToast('⏳ Deleting account...')
    try {
      await supabase.from('profiles').delete().eq('id', user.id)
      await signOut()
      router.push('/')
    } catch (e) { showToast('❌ ' + e.message) }
  }

  const Toggle = ({ value, onChange, label, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{ width: 46, height: 26, borderRadius: 13, background: value ? '#2563eb' : 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </button>
    </div>
  )

  const Card = ({ children, style }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, ...style }}>{children}</div>
  )

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>{children}</div>
  )

  const Subtitle = ({ children }) => (
    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>{children}</div>
  )

  const Input = ({ label, ...props }) => (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label}</label>}
      <input {...props} style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', ...props.style }} />
    </div>
  )

  const Btn = ({ children, onClick, variant = 'primary', disabled, small }) => {
    const bg = variant === 'primary' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)'
      : variant === 'danger' ? 'rgba(239,68,68,0.1)'
      : 'var(--surface2)'
    const color = variant === 'primary' ? '#fff' : variant === 'danger' ? '#ef4444' : '#94a3b8'
    const border = variant === 'danger' ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--border)'
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ padding: small ? '7px 16px' : '10px 22px', borderRadius: 10, background: disabled ? 'var(--surface2)' : bg, color: disabled ? '#64748b' : color, border, fontWeight: 700, fontSize: small ? 12 : 14, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.1s' }}>
        {children}
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '90px 16px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>⚙️ Settings</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Manage your account, preferences, and EduLink configuration</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Sidebar nav */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 10, position: 'sticky', top: 90 }}>
            {SECTIONS.map(s => (
              <div key={s.id} onClick={() => setActive(s.id)}
                style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: active === s.id ? 700 : 400, color: active === s.id ? '#60a5fa' : '#94a3b8', background: active === s.id ? 'rgba(37,99,235,0.12)' : 'transparent', marginBottom: 2, transition: 'all 0.1s' }}
                onMouseEnter={e => { if (active !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (active !== s.id) e.currentTarget.style.background = 'transparent' }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* Content */}
          <div>

            {/* ── ACCOUNT ── */}
            {active === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card>
                  <SectionTitle>📧 Email Address</SectionTitle>
                  <Subtitle>Your login email. Changing this requires re-verification.</Subtitle>
                  <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  <Btn onClick={async () => {
                    setSaving(true)
                    const { error } = await supabase.auth.updateUser({ email })
                    setSaving(false)
                    if (error) showToast('❌ ' + error.message)
                    else showToast('✅ Verification email sent to new address')
                  }} disabled={saving}>Update Email</Btn>
                </Card>

                <Card>
                  <SectionTitle>🔑 Change Password</SectionTitle>
                  <Subtitle>Use a strong password of at least 8 characters.</Subtitle>
                  <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" />
                  <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                  <Btn onClick={changePassword} disabled={saving || !newPassword || newPassword !== confirmPassword}>Update Password</Btn>
                </Card>

                <Card>
                  <SectionTitle>🔖 Username</SectionTitle>
                  <Subtitle>Your @username is how other students find and message you. {profile?.username ? 'You can change it once.' : 'Set it now.'}</Subtitle>
                  {profile?.username && (
                    <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.3)', fontSize: 15, color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace', marginBottom: 14 }}>
                      @{profile.username}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14 }}>@</span>
                        <input value={newUsername} onChange={e => checkUsername(e.target.value)} placeholder={profile?.username || 'choose_username'} maxLength={20}
                          style={{ width: '100%', padding: '10px 13px 10px 28px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: `1px solid ${usernameAvailable === false ? '#ef4444' : usernameAvailable === true ? '#10b981' : 'var(--border)'}`, color: '#e2e8f0', outline: 'none' }} />
                      </div>
                      {newUsername.length >= 3 && (
                        <div style={{ fontSize: 11, marginTop: 5, color: usernameAvailable === false ? '#ef4444' : usernameAvailable === true ? '#10b981' : '#64748b' }}>
                          {checkingUsername ? '⏳ Checking...' : usernameAvailable === false ? '❌ Already taken' : usernameAvailable === true ? '✅ Available' : usernameAvailable === 'same' ? '↩️ Same as current' : ''}
                        </div>
                      )}
                    </div>
                    <Btn onClick={setUsername} disabled={saving || !usernameAvailable || usernameAvailable === 'same'}>Set Username</Btn>
                  </div>
                </Card>
              </div>
            )}

            {/* ── APPEARANCE ── */}
            {active === 'appearance' && (
              <Card>
                <SectionTitle>🎨 Appearance</SectionTitle>
                <Subtitle>Customise how EduLink looks for you.</Subtitle>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Theme</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { id: 'dark', label: '🌙 Dark', desc: 'Dark background — easier on the eyes at night' },
                      { id: 'light', label: '☀️ Light', desc: 'Light background — better in bright rooms' },
                    ].map(t => {
                      const current = typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark'
                      return (
                        <div key={t.id} onClick={() => { localStorage.setItem('theme', t.id); document.documentElement.setAttribute('data-theme', t.id); showToast(`✅ Switched to ${t.label} mode`) }}
                          style={{ flex: 1, padding: '16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${current === t.id ? '#2563eb' : 'var(--border)'}`, background: current === t.id ? 'rgba(37,99,235,0.1)' : 'var(--surface2)', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 20, marginBottom: 8 }}>{t.id === 'dark' ? '🌙' : '☀️'}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: current === t.id ? '#60a5fa' : '#f1f5f9', marginBottom: 4 }}>{t.id === 'dark' ? 'Dark' : 'Light'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{t.desc}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Sidebar</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn onClick={() => { localStorage.setItem('navbar_collapsed', 'false'); window.location.reload() }} small>Expand Sidebar</Btn>
                    <Btn onClick={() => { localStorage.setItem('navbar_collapsed', 'true'); window.location.reload() }} small variant="secondary">Collapse Sidebar</Btn>
                  </div>
                </div>
              </Card>
            )}

            {/* ── LOCATION ── */}
            {active === 'location' && (
              <Card>
                <SectionTitle>📍 Location Settings</SectionTitle>
                <Subtitle>Your location is used to find nearby opportunities, tutoring centres, and libraries. It is never shared publicly.</Subtitle>

                {location.city && (
                  <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{location.city}{location.city && location.country ? ', ' : ''}{location.country}</div>
                      {location.lat && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Coordinates: {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}</div>}
                      {location.lastUpdated && <div style={{ fontSize: 11, color: '#64748b' }}>Last updated: {new Date(location.lastUpdated).toLocaleDateString()}</div>}
                    </div>
                  </div>
                )}

                {location.error && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                    ⚠️ {location.error}
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <button onClick={detectLocation} disabled={location.loading}
                    style={{ padding: '11px 22px', borderRadius: 10, background: location.loading ? 'var(--surface2)' : 'linear-gradient(135deg,#10b981,#059669)', color: location.loading ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {location.loading ? (
                      <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Detecting location...</>
                    ) : (
                      <>📍 {location.city ? 'Update My Location' : 'Detect My Location'}</>
                    )}
                  </button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Or enter manually</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>City</label>
                      <input value={location.city} onChange={e => setLocation(prev => ({ ...prev, city: e.target.value }))} placeholder="e.g. Durban"
                        style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Country</label>
                      <input value={location.country} onChange={e => setLocation(prev => ({ ...prev, country: e.target.value }))} placeholder="e.g. South Africa"
                        style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    </div>
                  </div>
                </div>

                <Btn onClick={async () => {
                  setSaving(true)
                  const { error } = await supabase.from('profiles').update({ city: location.city, country: location.country, location_updated_at: new Date().toISOString() }).eq('id', user.id)
                  setSaving(false)
                  if (error) showToast('❌ ' + error.message)
                  else showToast('✅ Location saved!')
                }} disabled={saving || (!location.city && !location.country)}>
                  💾 Save Location
                </Btn>

                <div style={{ marginTop: 20, padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  🔒 <strong style={{ color: '#94a3b8' }}>Privacy:</strong> Your exact coordinates are stored securely and used only to find nearby places. Only your city and country are shown on your profile if you choose to display them.
                </div>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {active === 'notifications' && (
              <Card>
                <SectionTitle>🔔 Notification Preferences</SectionTitle>
                <Subtitle>Control what EduLink notifies you about.</Subtitle>
                <Toggle value={notifSettings.notifications_email} onChange={v => setNotifSettings(p => ({ ...p, notifications_email: v }))} label="📧 Email notifications" desc="Weekly summaries and important account alerts" />
                <Toggle value={notifSettings.notifications_reminders} onChange={v => setNotifSettings(p => ({ ...p, notifications_reminders: v }))} label="⏰ Study reminders" desc="When you haven't studied for a while or have an exam coming up" />
                <Toggle value={notifSettings.notifications_opportunities} onChange={v => setNotifSettings(p => ({ ...p, notifications_opportunities: v }))} label="💼 Opportunity alerts" desc="New internships, bursaries, and jobs matching your profile" />
                <Toggle value={notifSettings.notifications_community} onChange={v => setNotifSettings(p => ({ ...p, notifications_community: v }))} label="🌍 Community activity" desc="Replies to your posts, new posts in your groups" />
                <Toggle value={notifSettings.notifications_messages} onChange={v => setNotifSettings(p => ({ ...p, notifications_messages: v }))} label="✉️ Direct messages" desc="Notify when you receive a new direct message" />
                <div style={{ marginTop: 20 }}>
                  <Btn onClick={saveNotifications} disabled={saving}>💾 Save Preferences</Btn>
                </div>
              </Card>
            )}

            {/* ── PRIVACY ── */}
            {active === 'privacy' && (
              <Card>
                <SectionTitle>🔒 Privacy Settings</SectionTitle>
                <Subtitle>Control who can see your information and interact with you.</Subtitle>
                <Toggle value={privacy.profile_public} onChange={v => setPrivacy(p => ({ ...p, profile_public: v }))} label="👤 Public profile" desc="Other students can see your name, bio, and field of study" />
                <Toggle value={privacy.show_online} onChange={v => setPrivacy(p => ({ ...p, show_online: v }))} label="🟢 Show online status" desc="Let other students see when you are active on EduLink" />
                <Toggle value={privacy.allow_messages} onChange={v => setPrivacy(p => ({ ...p, allow_messages: v }))} label="✉️ Allow direct messages" desc="Students who know your @username can send you messages" />
                <div style={{ marginTop: 20 }}>
                  <Btn onClick={savePrivacy} disabled={saving}>💾 Save Privacy Settings</Btn>
                </div>
              </Card>
            )}

            {/* ── EXTENSION ── */}
            {active === 'extension' && (
              <Card>
                <SectionTitle>🧩 Browser Extension</SectionTitle>
                <Subtitle>The EduLink extension lets you scan your university website and save files directly to your library.</Subtitle>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  {[
                    { step: '1', text: 'Install the EduLink Chrome extension from the link below', icon: '⬇️' },
                    { step: '2', text: 'Open the extension and go to the Profile tab', icon: '👤' },
                    { step: '3', text: 'Click "Read Credentials from EduLink" — it reads your login token automatically', icon: '🔑' },
                    { step: '4', text: 'Visit your university website and click "Scan Whole Website"', icon: '🌐' },
                    { step: '5', text: 'Select the files you want, click "Save to EduLink", then refresh your Library', icon: '📚' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.step}</div>
                      <div style={{ flex: 1, padding: '5px 0' }}>
                        <span style={{ fontSize: 14 }}>{s.icon} </span>
                        <span style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>{s.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href="https://github.com/MrViper7745/newme" target="_blank" rel="noreferrer"
                    style={{ padding: '11px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-block' }}>
                    🧩 Get Extension from GitHub
                  </a>
                  <button onClick={() => {
                    const creds = { token: localStorage.getItem('edulink_token'), userId: localStorage.getItem('edulink_user_id'), url: process.env.NEXT_PUBLIC_SUPABASE_URL }
                    navigator.clipboard.writeText(JSON.stringify(creds))
                    showToast('📋 Credentials copied!')
                  }} style={{ padding: '11px 22px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    📋 Copy Credentials
                  </button>
                </div>

                <div style={{ marginTop: 20, padding: '14px', borderRadius: 12, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                  💡 <strong style={{ color: '#60a5fa' }}>Tip:</strong> You can also upload files directly without the extension — go to <button onClick={() => router.push('/upload')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, textDecoration: 'underline' }}>Upload Files</button> in the sidebar.
                </div>
              </Card>
            )}

            {/* ── SUBSCRIPTION ── */}
            {active === 'subscription' && (
              <Card>
                <SectionTitle>💳 Subscription</SectionTitle>
                <Subtitle>Manage your EduLink subscription plan.</Subtitle>

                <div style={{ padding: '20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.1))', border: '1px solid rgba(37,99,235,0.3)', marginBottom: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Student Plan — Active</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Full access to all EduLink features</div>
                  <div style={{ display: 'flex', justify: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center', fontSize: 13, color: '#64748b' }}>
                    <span>✅ AI Tutor unlimited</span>
                    <span>✅ All career tools</span>
                    <span>✅ Challenges & prizes</span>
                    <span>✅ Community groups</span>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
                  To manage billing, cancel, or change your plan, contact support at{' '}
                  <a href="mailto:support@edulinkglobal.com" style={{ color: '#60a5fa' }}>support@edulinkglobal.com</a>
                </div>
              </Card>
            )}

            {/* ── DANGER ZONE ── */}
            {active === 'danger' && (
              <Card style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                <SectionTitle>⚠️ Danger Zone</SectionTitle>
                <Subtitle>These actions are permanent and cannot be undone.</Subtitle>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>🗑 Delete Account</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 }}>
                    Permanently delete your account and all associated data — library files, conversations, exam plans, community posts, and messages. This cannot be reversed.
                  </div>
                  <Btn onClick={deleteAccount} variant="danger">Delete My Account</Btn>
                </div>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>🔄 Clear All Data</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 }}>
                    Keep your account but delete all library files, conversations, and study progress. Your profile stays intact.
                  </div>
                  <button onClick={async () => {
                    if (!confirm('Delete all your library files and conversations? This cannot be undone.')) return
                    await Promise.all([
                      supabase.from('library_files').delete().eq('user_id', user.id),
                      supabase.from('bot_conversations').delete().eq('user_id', user.id),
                      supabase.from('agent_insights').delete().eq('user_id', user.id),
                    ])
                    showToast('✅ All data cleared')
                  }} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Clear All Data
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}