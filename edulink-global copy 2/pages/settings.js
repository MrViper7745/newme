import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'

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

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // ── Share auth token with extension ──────────────────────────
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
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

    // Push updated profile to extension via localStorage
    const updatedProfile = {
      name: profile?.name,
      field: form.field,
      institution: form.institution,
      qualification_type: academicProfile.qualification_type,
      year_of_study: academicProfile.year_of_study,
      semester: academicProfile.semester,
      modules,
    }
    localStorage.setItem('edulinkUserProfile', JSON.stringify(updatedProfile))
    showToast('✅ Academic profile saved! Extension will use this for smart matching.')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const deleteAccount = async () => {
    if (!user) return
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.')
    if (!confirmed) return
    const confirmed2 = window.confirm('Final confirmation — delete your EduLink account permanently?')
    if (!confirmed2) return
    await supabase.from('profiles').delete().eq('id', user.id)
    await signOut()
    router.push('/')
  }

  // ── Poll for extension files and sync to Supabase ────────────
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const raw = localStorage.getItem('edulinkFiles')
      if (!raw) return
      try {
        const files = JSON.parse(raw)
        if (!files.length) return

        // Get academic profile for smart priority
        const { data: prof } = await supabase
          .from('profiles')
          .select('qualification_type, year_of_study, semester, modules, field, institution')
          .eq('id', user.id)
          .single()

        // Determine priority based on full academic context
        const smartFiles = files.map(f => ({
          ...f,
          priority: computePriority(f, prof),
          label: computeLabel(f),
        }))

        // Only save relevant/academic/high priority
        const toSave = smartFiles.filter(f =>
          f.priority === 'high' || f.isRelevant || f.isAcademic
        )

        if (!toSave.length) {
          localStorage.removeItem('edulinkFiles')
          return
        }

        // Check existing
        const { data: existing } = await supabase
          .from('library_files')
          .select('url')
          .eq('user_id', user.id)

        const existingUrls = new Set((existing || []).map(e => e.url))

        const newFiles = toSave
          .filter(f => !existingUrls.has(f.url))
          .map(f => ({
            user_id: user.id,
            url: f.url,
            name: f.name || f.text || 'file',
            title: f.text || f.name || 'file',
            ext: f.ext || 'pdf',
            label: f.label || 'Academic Document',
            priority: f.priority || 'medium',
            is_relevant: f.isRelevant || false,
            is_academic: f.isAcademic || true,
            domain: f.domain || '',
            page_title: f.pageTitle || '',
            relevance_reason: f.relevanceReason || null,
            semester_context: prof?.semester || null,
            qualification_context: prof?.qualification_type || null,
            saved_at: new Date().toISOString(),
          }))

        if (newFiles.length) {
          await supabase.from('library_files').insert(newFiles)
          showToast(`✅ ${newFiles.length} files saved to your library!`)
        }

        localStorage.removeItem('edulinkFiles')
      } catch (e) {
        console.error('Sync error:', e)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [user])

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
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '11px 18px', border: 'none', cursor: 'pointer', background: 'transparent', whiteSpace: 'nowrap', color: tab === t.id ? '#60a5fa' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: 13, borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>

        {/* ACCOUNT TAB */}
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
              <button onClick={handleSignOut} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🚪 Sign Out</button>
            </div>
          </div>
        )}

        {/* ── ACADEMIC PROFILE TAB ── */}
        {tab === 'academic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Why this matters */}
            <div style={{ padding: '14px 18px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              💡 <strong style={{ color: '#60a5fa' }}>Why this matters:</strong> EduLink uses your academic profile to intelligently sort files collected by the extension. Instead of saving everything, it learns which documents are most important to you <strong style={{ color: '#f1f5f9' }}>right now</strong> — based on your qualification type, current semester, and modules — and marks them as high priority.
            </div>

            {/* Qualification & Study Info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20 }}>🎓 Qualification & Study Details</div>

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

              {/* Modules */}
              <div style={{ marginBottom: 14 }}>
                <label style={L}>Your Current Modules / Subjects (one per line)</label>
                <textarea
                  value={academicProfile.modules}
                  onChange={e => setAcademicProfile(p => ({ ...p, modules: e.target.value }))}
                  rows={8}
                  placeholder={`Enter your current modules, one per line. Examples:\nEngineering Mathematics III\nApplied Physics I\nPower Systems II\nSignal Processing IV\nThermodynamics II`}
                  style={{ ...I, resize: 'vertical', lineHeight: 1.8 }}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>
                  The extension uses these to identify which files from your university website are relevant to you right now.
                </div>
              </div>

              {/* Preview of what priority means */}
              {academicProfile.qualification_type && academicProfile.semester && (
                <div style={{ marginBottom: 18, padding: '14px 18px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>🎯 How Your Files Will Be Prioritised</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      {
                        priority: '🔴 High Priority',
                        color: '#ef4444',
                        desc: `Past exam papers and memos for your ${form.field || 'field'} modules in ${academicProfile.semester}`,
                        example: `e.g. Engineering Mathematics III Nov 2024 — matches your module + semester year`,
                      },
                      {
                        priority: '🟡 Medium Priority',
                        color: '#f59e0b',
                        desc: `Lecture slides, notes, and tutorials for subjects you listed`,
                        example: `e.g. Applied Physics Lecture Notes — matches your module list`,
                      },
                      {
                        priority: '⚪ Low Priority',
                        color: '#64748b',
                        desc: `Other academic documents from the same institution`,
                        example: `e.g. Files from other departments or years`,
                      },
                    ].map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${p.color}20` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: p.color, minWidth: 120, flexShrink: 0 }}>{p.priority}</div>
                        <div>
                          <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 2 }}>{p.desc}</div>
                          <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>{p.example}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveAcademicProfile} disabled={savingAcademic} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: savingAcademic ? 0.7 : 1 }}>
                {savingAcademic ? '💾 Saving...' : '💾 Save Academic Profile'}
              </button>
            </div>

            {/* Current profile summary */}
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

        {/* NOTIFICATIONS TAB */}
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

        {/* EXTENSION TAB */}
        {tab === 'extension' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🧩 EduLink Smart Downloader Extension</div>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
                The extension scans websites for downloadable files and matches them to your modules. Set up your Academic Profile first for the best results.
              </p>

              {/* Academic profile warning if not set */}
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
                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>📌 Installation Instructions</div>
                {[
                  'First complete your Academic Profile (tab above) — this is what the extension uses to match files',
                  'Download the edulink-extension folder from your Codespace',
                  'Open Chrome/Edge → go to chrome://extensions or edge://extensions',
                  'Enable Developer Mode (toggle in top right)',
                  'Click "Load unpacked" and select the edulink-extension folder',
                  'Visit your university website — the extension popup appears automatically when files are found',
                  'Click "Scan Whole Website" to find all files, then "Save to EduLink" to save matched ones',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 6 }}>🔄 Your Sync URL</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                  Files saved via the extension sync automatically when you are logged in and on any EduLink page.
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 8 }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/extension-sync?user_id={user?.id}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/extension-sync?user_id=${user?.id}`); showToast('📋 Copied!') }} style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📋 Copy Sync URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRIVACY TAB */}
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
              <button onClick={() => { localStorage.removeItem('edulink_location'); showToast('✅ Location data cleared') }} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🗑 Clear Location Data</button>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 15, marginBottom: 8 }}>⚠️ Danger Zone</div>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>Deleting your account removes all your data permanently. This cannot be undone.</p>
              <button onClick={deleteAccount} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🗑 Delete My Account Permanently</button>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION TAB */}
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
              <button onClick={() => router.push('/subscription')} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
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

// ── Smart priority computation using full academic context ──────
function computePriority (file, profile) {
  if (!profile) return 'low'
  const combined = ((file.text || '') + ' ' + (file.url || '') + ' ' + (file.name || '')).toLowerCase()
  const modules = Array.isArray(profile.modules) ? profile.modules : []
  const semester = (profile.semester || '').toLowerCase()
  const qualification = (profile.qualification_type || '').toLowerCase()
  const field = (profile.field || '').toLowerCase()

  // Determine current year from semester context
  const currentYear = new Date().getFullYear()
  const prevYear = currentYear - 1

  // Check module match
  const matchesModule = modules.some(m => combined.includes(m.toLowerCase()))

  // Check semester year match (e.g. "Nov 2024" matches semester 2 of 2024)
  const matchesYear = combined.includes(String(currentYear)) || combined.includes(String(prevYear))

  // Check if it's an exam paper or memo
  const isExam = combined.match(/(question paper|exam paper|past paper|nov|jun|dec|supplementary|special exam)/i)
  const isMemo = combined.match(/(memo|memorandum|mark scheme|marking guide)/i)

  // Check semester relevance
  let matchesSemester = false
  if (semester.includes('semester 1') || semester.includes('trimester 1')) {
    matchesSemester = combined.match(/(jun|june|may|april|apr|march|mar|feb|jan)/i) !== null
  } else if (semester.includes('semester 2') || semester.includes('trimester 2')) {
    matchesSemester = combined.match(/(nov|november|oct|october|sep|september|aug|august|jul|july)/i) !== null
  } else {
    matchesSemester = true // year course
  }

  // HIGH: matches a module + is an exam/memo + matches year
  if (matchesModule && (isExam || isMemo) && matchesYear) return 'high'
  // HIGH: matches module + current year exam
  if (matchesModule && isExam && matchesYear) return 'high'
  // HIGH: matches module + matches semester
  if (matchesModule && matchesSemester) return 'high'
  // MEDIUM: matches module but different year
  if (matchesModule) return 'medium'
  // MEDIUM: matches field and is an exam
  if (field && combined.includes(field) && isExam) return 'medium'
  // MEDIUM: is an academic document in the right qualification level
  if (isExam || isMemo) return 'medium'
  // LOW: everything else
  return 'low'
}

function computeLabel (file) {
  const t = ((file.text || '') + ' ' + (file.name || '')).toLowerCase()
  if (t.match(/(question paper|exam paper|past paper)/) || t.match(/(nov|jun|dec|jan|feb|mar|apr|may)\s+20\d\d/)) return 'Past Exam Paper'
  if (t.includes('supplementary')) return 'Supplementary Exam'
  if (t.match(/(memo|memorandum|mark scheme|marking guide)/)) return 'Memo / Marking Guide'
  if (t.match(/(lecture|slides|ppt)/)) return 'Lecture Slides'
  if (t.includes('notes')) return 'Study Notes'
  if (t.match(/(textbook|chapter)/)) return 'Textbook / Chapter'
  if (t.match(/(tutorial|worksheet)/)) return 'Tutorial / Worksheet'
  if (t.includes('assignment')) return 'Assignment'
  if (t.includes('syllabus')) return 'Syllabus'
  return 'Academic Document'
}