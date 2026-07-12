import { useState } from 'react'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS, FIELDS } from '../data/globalData'

export default function Settings() {
  const [toast, setToast] = useState(null)
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    internshipAlerts: true,
    scholarshipAlerts: true,
    communityUpdates: false,
    newsletterWeekly: true,
    preferredRegion: 'africa',
    preferredField: 'IT',
    language: 'English',
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  const toggle = (key) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 720, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>⚙️ Settings</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Manage your EduLink Global account preferences</p>
        </div>

        {/* Notifications */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>🔔 Notification Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'internshipAlerts', label: 'New Internship Alerts', desc: 'Get notified when new opportunities are posted' },
              { key: 'scholarshipAlerts', label: 'Scholarship Deadline Alerts', desc: 'Reminders before scholarship deadlines' },
              { key: 'communityUpdates', label: 'Community Updates', desc: 'Replies and likes on your posts' },
              { key: 'newsletterWeekly', label: 'Weekly Newsletter', desc: 'Top opportunities curated for your region' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                </div>
                <button onClick={() => toggle(item.key)} style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: prefs[item.key] ? '#2563eb' : '#1e3a5f',
                  position: 'relative', transition: 'background 0.3s',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, transition: 'left 0.3s',
                    left: prefs[item.key] ? 25 : 3,
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Discovery Preferences */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>🌍 Discovery Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600 }}>Preferred Region</label>
              <select value={prefs.preferredRegion} onChange={e => setPrefs(p => ({ ...p, preferredRegion: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                <option value="all">🌐 All Regions</option>
                {WORLD_REGIONS.map(r => <option key={r.id} value={r.id}>{r.flag} {r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600 }}>Preferred Field</label>
              <select value={prefs.preferredField} onChange={e => setPrefs(p => ({ ...p, preferredField: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                {FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600 }}>Language</label>
              <select value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                {['English','French','Portuguese','Spanish','Arabic','Swahili','Mandarin'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 15, marginBottom: 8 }}>⚠️ Danger Zone</div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>These actions are irreversible. Please be careful.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => showToast('⚠️ Account deactivation — contact support@edulink.global')} style={{
              padding: '9px 20px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>Deactivate Account</button>
            <button onClick={() => showToast('🗑 To delete your account, email support@edulink.global')} style={{
              padding: '9px 20px', borderRadius: 9, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>Delete Account</button>
          </div>
        </div>

        <button onClick={() => showToast('✅ Settings saved!')} style={{
          width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer'
        }}>Save Settings</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}