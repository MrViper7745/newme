import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user, profile, loading, signOut } = useUser()
  const router = useRouter()

  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('account')
  const [academicProfile, setAcademicProfile] = useState({
    qualification_type: '',
    year_of_study: '',
    semester: '',
    modules: '',
  })
  const [savingAcademic, setSavingAcademic] = useState(false)
  const [agentRunning, setAgentRunning] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    country: '',
    field: '',
    institution: '',
    notifications_email: true,
    notifications_reminders: true,
    notifications_opportunities: true,
    theme: 'dark',
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Share auth token with extension
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          localStorage.setItem('edulinkToken', data.session.access_token)
          localStorage.setItem('edulinkUserId', user.id)
        }
      })
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  useEffect(() => {
    if (profile) {
      setForm(p => ({
        ...p,
        name: profile.name || '',
        email: profile.email || user?.email || '',
        bio: profile.bio || '',
        country: profile.country || '',
        field: profile.field || '',
        institution: profile.institution || '',
        notifications_email: profile.notifications_email !== false,
        notifications_reminders: profile.notifications_reminders !== false,
        notifications_opportunities: profile.notifications_opportunities !== false,
      }))
      setAcademicProfile({
        qualification_type: profile.qualification_type || '',
        year_of_study: profile.year_of_study || '',
        semester: profile.semester || '',
        modules: Array.isArray(profile.modules) ? profile.modules.join('\n') : (profile.modules || ''),
      })
    }
  }, [profile])

  const saveSettings = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else showToast('✅ Settings saved!')
  }

  const saveAcademicProfile = async () => {
    if (!user) return
    setSavingAcademic(true)
    const modules = academicProfile.modules
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const { error } = await supabase
      .from('profiles')
      .update({
        qualification_type: academicProfile.qualification_type,
        year_of_study: academicProfile.year_of_study,
        semester: academicProfile.semester,
        modules,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    setSavingAcademic(false)
    if (error) { showToast('❌ ' + error.message); return }
    localStorage.setItem('edulinkUserProfile', JSON.stringify({
      name: profile?.name,
      field: form.field,
      institution: form.institution,
      qualification_type: academicProfile.qualification_type,
      year_of_study: academicProfile.year_of_study,
      semester: academicProfile.semester,
      modules,
    }))
    showToast('✅ Academic profile saved! Extension will use this for smart matching.')
  }

  const runAgentCheck = async () => {
    if (!user || agentRunning) return
    setAgentRunning(true)
    showToast('🤖 Running agent check...')
    try {
      const res = await fetch('/api/agent-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await res.json()
      if (data.insights_generated > 0) {
        showToast(`✅ Generated ${data.insights_generated} new insight(s)! Check your dashboard.`)
      } else {
        showToast('✅ Agent check complete — no new insights right now.')
      }
    } catch (e) {
      showToast('❌ Agent check failed: ' + e.message)
    }
    setAgentRunning(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const deleteAccount = async () => {
    if (!user) return
    const c1 = window.confirm('Are you sure you want to delete your account? This cannot be undone.')
    if (!c1) return
    const c2 = window.confirm('Final confirmation — delete your EduLink account permanently?')
    if (!c2) return
    await supabase.from('profiles').delete().eq('id', user.id)
    await signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b' }}>Loading...</div>
    </div>
  )

  if (!user) return null

  const TABS = [
    { id: 'account', label: '👤 Account' },
    { id: 'academic', label: '🎓 Academic Profile' },
    { id: 'notifications', label: '🔔 Notifications' },
    { id: 'extension', label: '🧩 Extension' },
    { id: 'agent', label: '🤖 AI Agent' },
    { id: 'privacy', label: '🔒 Privacy' },
    { id: 'subscription', label: '💳 Subscription' },
  ]

  const I = { width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }
  const S = { width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 860, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>⚙️ Settings</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Manage your account, notifications, and preferences</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '11px 18px', border: 'none', cursor: 'pointer', background: 'transparent', whiteSpace: 'nowrap', color: tab === t.id ? '#60a5fa' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: 13, borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>📋 Profile Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={L}>Full Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" style={I} />
                </div>
                <div>
                  <label style={L}>Email Address</label>
                  <input value={form.email} disabled style={{ ...I, opacity: 0.5, cursor: 'not-allowed' }} />
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>Email cannot be changed here</div>
                </div>
                <div>
                  <label style={L}>Field of Study</label>
                  <input value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} placeholder="e.g. Electrical Engineering" style={I} />
                </div>
                <div>
                  <label style={L}>Institution</label>
                  <input value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder="Your university or college" style={I} />
                </div>
                <div>
                  <label style={L}>Country</label>
                  <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="Your country" style={I} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={L}>Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell employers about yourself..." style={{ ...I, resize: 'vertical' }} />
                </div>
              </div>
              <button onClick={saveSettings} disabled={saving} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🔑 Password</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>Change your password by requesting a reset email.</p>
              <button onClick={async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth/reset-password` })
                if (error) showToast('❌ ' + error.message)
                else showToast('✅ Password reset email sent!')
              }} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📧 Send Password Reset Email
              </button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🚪 Sign Out</div>
              <button onClick={handleSignOut} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}

        {/* ── ACADEMIC PROFILE TAB ── */}
        {tab === 'academic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AcademicAIAssistant
              user={user}
              profile={profile}
              onProfileDetected={(detected) => {
                setAcademicProfile(p => ({
                  ...p,
                  qualification_type: detected.qualification_type || p.qualification_type,
                  year_of_study: detected.year_of_study || p.year_of_study,
                  semester: detected.semester || p.semester,
                  modules: detected.modules || p.modules,
                }))
                if (detected.field) setForm(fp => ({ ...fp, field: detected.field, institution: detected.institution || fp.institution }))
              }}
            />

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>✏️ Your Academic Details</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Review and adjust anything the AI filled in, or add details manually.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={L}>Qualification Type</label>
                  <select value={academicProfile.qualification_type} onChange={e => setAcademicProfile(p => ({ ...p, qualification_type: e.target.value }))} style={S}>
                    <option value="">Select type...</option>
                    <option value="National Certificate">National Certificate (NC)</option>
                    <option value="National Diploma">National Diploma (ND)</option>
                    <option value="Advanced Diploma">Advanced Diploma</option>
                    <option value="Bachelor of Technology">Bachelor of Technology (BTech)</option>
                    <option value="Bachelor of Engineering">Bachelor of Engineering (BEng)</option>
                    <option value="Bachelor of Science">Bachelor of Science (BSc)</option>
                    <option value="Bachelor of Commerce">Bachelor of Commerce (BCom)</option>
                    <option value="Bachelor of Arts">Bachelor of Arts (BA)</option>
                    <option value="Higher Certificate">Higher Certificate</option>
                    <option value="Postgraduate Diploma">Postgraduate Diploma</option>
                    <option value="Honours">Honours Degree</option>
                    <option value="Masters">Master's Degree</option>
                    <option value="PhD">PhD / Doctorate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={L}>Year / Level of Study</label>
                  <select value={academicProfile.year_of_study} onChange={e => setAcademicProfile(p => ({ ...p, year_of_study: e.target.value }))} style={S}>
                    <option value="">Select year...</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="Final Year">Final Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div>
                  <label style={L}>Current Semester</label>
                  <select value={academicProfile.semester} onChange={e => setAcademicProfile(p => ({ ...p, semester: e.target.value }))} style={S}>
                    <option value="">Select semester...</option>
                    <option value="Semester 1 (Jan–Jun)">Semester 1 — Jan to Jun</option>
                    <option value="Semester 2 (Jul–Dec)">Semester 2 — Jul to Dec</option>
                    <option value="Trimester 1">Trimester 1</option>
                    <option value="Trimester 2">Trimester 2</option>
                    <option value="Trimester 3">Trimester 3</option>
                    <option value="Year Course">Full Year Course</option>
                  </select>
                </div>
                <div>
                  <label style={L}>Field of Study</label>
                  <input value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} placeholder="e.g. Electrical Engineering" style={I} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={L}>Your Current Modules / Subjects (one per line)</label>
                <textarea
                  value={academicProfile.modules}
                  onChange={e => setAcademicProfile(p => ({ ...p, modules: e.target.value }))}
                  rows={8}
                  placeholder={`Enter your current modules, one per line:\nEngineering Mathematics III\nApplied Physics I\nPower Systems II\nSignal Processing IV`}
                  style={{ ...I, resize: 'vertical', lineHeight: 1.8 }}
                />
              </div>

              {academicProfile.qualification_type && academicProfile.semester && (
                <div style={{ marginBottom: 18, padding: '14px 18px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>🎯 How Files Will Be Prioritised</div>
                  {[
                    { p: '🔴 High', c: '#ef4444', d: `Exam papers & memos matching your modules in ${academicProfile.semester}` },
                    { p: '🟡 Medium', c: '#f59e0b', d: 'Lecture slides, notes, tutorials matching your modules' },
                    { p: '⚪ Low', c: '#64748b', d: 'Other academic files from the same institution' },
                  ].map((x, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: x.c, minWidth: 80 }}>{x.p}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{x.d}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={saveAcademicProfile} disabled={savingAcademic} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: savingAcademic ? 0.7 : 1 }}>
                {savingAcademic ? '💾 Saving...' : '💾 Save Academic Profile'}
              </button>
            </div>

            {(profile?.qualification_type || profile?.semester) && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>📋 Saved Academic Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  {[
                    { l: 'Qualification', v: profile.qualification_type },
                    { l: 'Year', v: profile.year_of_study },
                    { l: 'Semester', v: profile.semester },
                    { l: 'Field', v: profile.field },
                    { l: 'Institution', v: profile.institution },
                  ].filter(x => x.v).map(x => (
                    <div key={x.l} style={{ padding: '10px 13px', background: 'var(--surface2)', borderRadius: 9, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{x.l}</div>
                      <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{x.v}</div>
                    </div>
                  ))}
                </div>
                {Array.isArray(profile.modules) && profile.modules.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Current Modules ({profile.modules.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.modules.map((mod, i) => (
                        <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', color: '#60a5fa', fontWeight: 600 }}>{mod}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === 'notifications' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>🔔 Notification Preferences</div>
            {[
              { key: 'notifications_email', label: 'Email Notifications', desc: 'Receive important updates and alerts via email' },
              { key: 'notifications_reminders', label: 'Deadline Reminders', desc: 'Get reminded about upcoming application and exam deadlines' },
              { key: 'notifications_opportunities', label: 'New Opportunities', desc: 'Be notified of new internships and scholarships matching your profile' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
                <div onClick={() => setForm(p => ({ ...p, [item.key]: !p[item.key] }))} style={{ width: 44, height: 24, borderRadius: 12, background: form[item.key] ? '#2563eb' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: form[item.key] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
            <button onClick={saveSettings} disabled={saving} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {saving ? 'Saving...' : '💾 Save Preferences'}
            </button>
          </div>
        )}

        {/* ── EXTENSION TAB ── */}
        {tab === 'extension' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🧩 EduLink Smart Downloader Extension</div>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
                The extension scans websites for downloadable files and matches them to your modules. Set up your Academic Profile first for the best results.
              </p>

              {!profile?.qualification_type && (
                <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: '#fbbf24' }}>⚠️ Set up your Academic Profile for smart file matching</div>
                  <button onClick={() => setTab('academic')} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Set Up Now →</button>
                </div>
              )}

              {profile?.qualification_type && (
                <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✅ Academic Profile Active</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {profile.qualification_type} · {profile.year_of_study} · {profile.semester} · {Array.isArray(profile.modules) ? profile.modules.length : 0} modules
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { icon: '📚', title: 'Course File Detection', desc: 'Scans every page for PDFs, slides, Word docs' },
                  { icon: '🎯', title: 'Smart Priority Matching', desc: 'Uses your qualification, semester, and modules to rank files' },
                  { icon: '⬇', title: 'Selective Download', desc: 'Select All, Relevant, or individual files' },
                  { icon: '🔔', title: 'Browser Notifications', desc: 'Alerts when high-priority course materials are found' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>📌 How to connect extension to your account</div>
                {[
                  'Make sure EduLink is open in your browser and you are logged in',
                  'Open the extension popup → Profile tab',
                  'Click "🔄 Read Credentials from EduLink"',
                  'You should see "✅ Logged in (xxxxxxxx...)"',
                  'Visit your university website and scan for files',
                  'Select files and click "Save to EduLink" — they will appear in your Library',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 6 }}>🔑 Your User ID (for manual setup)</div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 8 }}>
                  {user?.id}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(user?.id); showToast('📋 User ID copied!') }} style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📋 Copy User ID
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI AGENT TAB ── */}
        {tab === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* What the agent does */}
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>🤖 EduLink Progress Monitoring Agent</div>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                The agent runs automatically every 6 hours and checks your entire EduLink account for things that need your attention. It looks at your library, study sessions, language streaks, deadlines, and budget — then surfaces personalised insights on your dashboard.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 22 }}>
                {[
                  { icon: '📚', title: 'Unopened Exam Papers', desc: 'Alerts you when saved papers haven\'t been opened after 2 days' },
                  { icon: '🔥', title: 'Streak Protection', desc: 'Warns you before your language streak resets' },
                  { icon: '📖', title: 'Study Inactivity', desc: 'Nudges you after 5+ days without a study session' },
                  { icon: '⏰', title: 'Deadline Warnings', desc: 'Reminds you of applications due within 7 days' },
                  { icon: '💰', title: 'Budget Monitoring', desc: 'Flags when spending exceeds your recorded income' },
                  { icon: '🎓', title: 'Profile Completeness', desc: 'Prompts you to finish your academic profile if incomplete' },
                  { icon: '🏆', title: 'Achievements', desc: 'Celebrates streaks and milestones as you reach them' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Manual trigger */}
              <div style={{ padding: '18px 20px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 14, marginBottom: 6 }}>▶ Run Agent Check Now</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                  The agent checks automatically every 6 hours from your dashboard. Use this button to trigger it immediately and see what insights it finds right now.
                </div>
                <button
                  onClick={runAgentCheck}
                  disabled={agentRunning}
                  style={{ padding: '10px 24px', borderRadius: 10, background: agentRunning ? 'var(--surface2)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: agentRunning ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: agentRunning ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                >
                  {agentRunning ? '⏳ Running check...' : '🤖 Run Agent Check Now'}
                </button>
              </div>

              {/* Where insights appear */}
              <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 8 }}>📍 Where do insights appear?</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                  Insights appear at the top of your <strong style={{ color: '#f1f5f9' }}>Dashboard</strong> as coloured cards. High priority ones appear in red, medium in amber, low in blue. You can dismiss them individually once you've acted on them. New ones are generated automatically as your situation changes.
                </div>
              </div>
            </div>

            {/* Reset agent cache */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 8 }}>🔄 Reset Agent Cache</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                The agent skips duplicate checks for 6 hours. If you want to force a fresh check immediately (for example, after updating your profile or adding new files), reset the cache first.
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('edulink_agent_lastcheck')
                  showToast('✅ Agent cache cleared — next dashboard visit will trigger a fresh check.')
                }}
                style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                🗑 Clear Agent Cache
              </button>
            </div>
          </div>
        )}

        {/* ── PRIVACY TAB ── */}
        {tab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🔒 Privacy Settings</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
                EduLink stores your data securely in Supabase. Location data stays in your browser only and is never sent to our servers.
              </div>
              {[
                { title: 'Profile Visibility', desc: 'Visible to employers and mentors on the platform' },
                { title: 'Location Data', desc: 'Browser localStorage only — never uploaded' },
                { title: 'CV & Documents', desc: 'Supabase storage — accessible only by you' },
                { title: 'AI Conversations', desc: 'Saved per session — delete anytime' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                  <span style={{ color: '#10b981', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>📍 Location Data</div>
              <button onClick={() => { localStorage.removeItem('edulink_location'); showToast('✅ Location data cleared') }} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🗑 Clear Location Data
              </button>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 15, marginBottom: 8 }}>⚠️ Danger Zone</div>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>Deleting your account removes all your data permanently. This cannot be undone.</p>
              <button onClick={deleteAccount} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🗑 Delete My Account Permanently
              </button>
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION TAB ── */}
        {tab === 'subscription' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>💳 Your Subscription</div>
            <div style={{ padding: '20px', borderRadius: 14, background: profile?.subscription_status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)', border: `1px solid ${profile?.subscription_status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 18, marginBottom: 4 }}>
                  {profile?.subscription_status === 'active' ? '✅ Active Subscription' : '⏰ Free Trial'}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {profile?.subscription_status === 'active'
                    ? `Subscribed until ${profile?.subscribed_until ? new Date(profile.subscribed_until).toLocaleDateString() : 'unknown'}`
                    : 'Trial access — upgrade to keep full access'}
                </div>
              </div>
              <span style={{ fontSize: 13, padding: '5px 14px', borderRadius: 10, background: profile?.subscription_status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: profile?.subscription_status === 'active' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                {profile?.subscription_status === 'active' ? 'Pro' : 'Trial'}
              </span>
            </div>
            {profile?.subscription_status !== 'active' && (
              <button onClick={() => router.push('/subscription')} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                💳 Upgrade to Pro →
              </button>
            )}
          </div>
        )}

      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ── ACADEMIC AI ASSISTANT COMPONENT ──────────────────────────────
function AcademicAIAssistant({ user, profile, onProfileDetected }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `👋 Hi! I'm your Academic Profile Assistant. I'll help you set up your profile in under 2 minutes.\n\nTo get started — **what institution are you studying at?** (e.g. "WSU", "Wits", "UKZN", "TUT", "UJ")`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState('')
  const [detected, setDetected] = useState(null)
  const [applying, setApplying] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, stream])

  const send = async (quick) => {
    const msg = quick || input.trim()
    if (!msg || loading) return
    setInput(''); setLoading(true); setStream('')

    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)

    const systemPrompt = `You are an academic profile assistant helping a student set up their EduLink account. Your job is to figure out their full academic profile through friendly conversation.

Current date: ${new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
Current month: ${new Date().toLocaleString('en', { month: 'long' })}

You need to find out:
1. Institution name
2. What they are studying (programme name)
3. Which year / level they are in
4. The current semester (Jan-Jun = Semester 1, Jul-Dec = Semester 2 for most SA institutions)
5. Their current modules for this semester

After each user message:
- Use your knowledge of South African universities and TVET colleges to identify qualification type
- Ask only ONE question at a time
- Be conversational and encouraging

When you have enough info (institution + programme + year), immediately output:
PROFILE_DETECTED:{"institution":"Full Institution Name","field":"Field of Study","qualification_type":"National Diploma","year_of_study":"3rd Year","semester":"Semester 2 (Jul–Dec)","modules":"Module 1\nModule 2\nModule 3\nModule 4\nModule 5","confidence":"high","note":"Modules estimated from known curriculum — please verify and adjust"}

Key rules:
- Universities of technology (TUT, DUT, CPUT, VUT, CUT, MUT, WSU) → National Diploma (3 yrs) or BTech
- Traditional universities (UCT, Wits, UP, Stellenbosch, UJ, UKZN) → BEng/BSc (4 yrs) or BCom (3 yrs)
- TVET colleges → National Certificate (NC V) or Report 191
- If user gives enough info in one message, output PROFILE_DETECTED immediately
- Always include a note to verify modules`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, ...newMessages] }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''

      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') {
            if (full.includes('PROFILE_DETECTED:')) {
              const match = full.match(/PROFILE_DETECTED:(\{[\s\S]*?\})(?:\n|$)/)
              if (match) {
                try {
                  const parsed = JSON.parse(match[1])
                  setDetected(parsed)
                  full = full.replace(/PROFILE_DETECTED:\{[\s\S]*?\}/, '').trim()
                  full += `\n\n✅ I've detected your academic profile! Review it below and click **Apply to Profile** when you're happy.`
                } catch {}
              }
            }
            setMessages(prev => [...prev, { role: 'assistant', content: full }])
            setStream(''); setLoading(false)
            return
          }
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setStream(full) } } catch {}
        }
      }
    } catch { setLoading(false) }
  }

  const applyProfile = () => {
    if (!detected) return
    setApplying(true)
    onProfileDetected(detected)
    setTimeout(() => setApplying(false), 500)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ Profile applied!\n\n📝 **Please review the modules** in the form below — I've estimated them from the known curriculum. Adjust them to match exactly what you're studying this semester, then click **Save Academic Profile**.`
    }])
  }

  const QUICK = [
    "I'm doing ND Electrical Engineering 3rd year at WSU",
    "BTech Civil Engineering final year at TUT",
    "BSc Computer Science 2nd year at Wits",
    "ND Mechanical Engineering 2nd year at DUT",
  ]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', borderBottom: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>Academic Profile AI Assistant</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Tell me your institution and programme — I'll fill everything in automatically</div>
        </div>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{msg.role === 'user' ? 'You' : '🤖 AI Assistant'}</div>
            <div style={{ padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, maxWidth: '90%', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>').replace(/\n/g, '<br/>') }}
            />
          </div>
        ))}

        {(loading || stream) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>🤖 AI Assistant</div>
            <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, maxWidth: '90%', whiteSpace: 'pre-wrap' }}>
              {stream || <span style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span>}
            </div>
          </div>
        )}

        {detected && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14, marginBottom: 14 }}>✅ Detected Academic Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { l: 'Institution', v: detected.institution },
                { l: 'Qualification', v: detected.qualification_type },
                { l: 'Year', v: detected.year_of_study },
                { l: 'Semester', v: detected.semester },
                { l: 'Field', v: detected.field },
              ].filter(x => x.v).map(x => (
                <div key={x.l} style={{ padding: '8px 11px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{x.l}</div>
                  <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{x.v}</div>
                </div>
              ))}
            </div>
            {detected.modules && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Estimated Modules</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {detected.modules.split('\n').filter(Boolean).map((mod, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa' }}>{mod}</span>
                  ))}
                </div>
              </div>
            )}
            {detected.note && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 14, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                ⚠️ {detected.note}
              </div>
            )}
            <button onClick={applyProfile} disabled={applying} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {applying ? '✅ Applied!' : '✅ Apply to My Profile'}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && !detected && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} style={{ padding: '5px 11px', borderRadius: 10, fontSize: 11, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8' }}>{q}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading) send() }} disabled={loading}
          placeholder="e.g. I'm at WSU doing ND Electrical Engineering year 3..."
          style={{ flex: 1, padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', color: '#e2e8f0', outline: 'none' }} />
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{ padding: '10px 16px', borderRadius: 9, background: input.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface)', color: input.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Send ↑
        </button>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}