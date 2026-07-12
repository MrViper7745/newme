import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS, FIELDS, INTERNSHIPS } from '../data/globalData'

const SKILLS_OPTIONS = ['Python','JavaScript','React','Node.js','SQL','Java','C++','Machine Learning','Data Analysis','UI/UX Design','Project Management','Communication','Financial Modelling','AutoCAD','MATLAB','Research','Leadership','Excel']

export default function Profile() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [savedJobs, setSavedJobs] = useState([])
  const [localProfile, setLocalProfile] = useState(null)
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: '', email: '', country: '', institution: '',
    field: '', year: '', bio: '', linkedin: '', github: '', portfolio: '',
  })
  const [skills, setSkills] = useState([])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  useEffect(() => {
    const p = localProfile || profile
    if (p) {
      setForm({
        name: p.name || '',
        email: p.email || user?.email || '',
        country: p.country || '',
        institution: p.institution || '',
        field: p.field || '',
        year: p.year || '',
        bio: p.bio || '',
        linkedin: p.linkedin || '',
        github: p.github || '',
        portfolio: p.portfolio || '',
      })
      setSkills(p.skills || [])
    }
  }, [profile, localProfile])

  useEffect(() => {
    if (user) fetchSavedJobs()
  }, [user])

  const fetchSavedJobs = async () => {
    const { data } = await supabase
      .from('saved_internships')
      .select('internship_id')
      .eq('user_id', user.id)
    if (data) {
      const ids = data.map(d => d.internship_id)
      setSavedJobs(INTERNSHIPS.filter(j => ids.includes(j.id)))
    }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Re-fetch profile from Supabase directly
  const refreshProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setLocalProfile(data)
  }

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ...form, skills, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      showToast('❌ Failed to save: ' + error.message)
    } else {
      showToast('✅ Profile saved!')
      await refreshProfile()
      setEditMode(false)
    }
  }

  const uploadCV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { showToast('⚠️ Please upload a PDF file only'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('⚠️ File must be under 5MB'); return }

    setUploading(true)
    const fileName = `${user.id}/cv-${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      showToast('❌ Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('cvs').getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ cv_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      showToast('❌ Failed to save CV URL')
    } else {
      showToast('✅ CV uploaded successfully!')
      await refreshProfile()
    }
    setUploading(false)
  }

  const toggleSkill = (skill) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b' }}>Loading profile...</div>
    </div>
  )

  if (!user) return null

  const currentProfile = localProfile || profile

  const completion = Math.min(100, Math.round(
    Object.values(form).filter(v => v?.trim()).length * 7 +
    (skills.length > 0 ? 15 : 0) +
    (currentProfile?.cv_url ? 15 : 0)
  ))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1000, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>My Profile</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Saved to Supabase · Visible to employers</p>
          </div>
          <button onClick={() => editMode ? saveProfile() : setEditMode(true)} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10,
            background: editMode ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? '💾 Saving...' : editMode ? '💾 Save Profile' : '✏️ Edit Profile'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 22 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Avatar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar"
                  style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', display: 'block', border: '3px solid #2563eb' }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', background: 'linear-gradient(135deg,#1d4ed8,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 3 }}>{form.name || 'Your Name'}</div>
              <div style={{ color: '#60a5fa', fontSize: 13, marginBottom: 3 }}>{form.field || 'Field of Study'}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{form.institution || 'Institution'}</div>
              {form.country && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {WORLD_REGIONS.find(r => r.countries.includes(form.country))?.flag} {form.country}
                </div>
              )}
            </div>

            {/* Completion */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 10, fontSize: 13 }}>Profile Strength</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Completion</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: completion >= 70 ? '#10b981' : '#f59e0b' }}>{completion}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completion}%`, background: completion >= 70 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* CV Upload */}
            <div style={{ background: 'var(--surface)', border: `1px dashed ${currentProfile?.cv_url ? '#10b981' : 'var(--border)'}`, borderRadius: 16, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{currentProfile?.cv_url ? '✅' : '📄'}</div>
              {currentProfile?.cv_url ? (
                <>
                  <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600, marginBottom: 10 }}>CV Uploaded!</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href={currentProfile.cv_url} target="_blank" rel="noreferrer" style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      View CV
                    </a>
                    <button onClick={() => fileRef.current?.click()} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Replace
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>Upload your CV (PDF, max 5MB)</div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? 'Uploading...' : '📤 Upload CV'}
                  </button>
                </>
              )}
              <input ref={fileRef} type="file" accept=".pdf" onChange={uploadCV} style={{ display: 'none' }} />
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Basic info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: 14 }}>📋 Basic Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'name', label: 'Full Name' },
                  { key: 'institution', label: 'Institution' },
                  { key: 'year', label: 'Year of Study' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</label>
                    {editMode ? (
                      <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    ) : (
                      <div style={{ fontSize: 13, color: '#e2e8f0', padding: '8px 0' }}>{form[f.key] || '—'}</div>
                    )}
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Country</label>
                  {editMode ? (
                    <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                      style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      <option value="">Select country...</option>
                      {WORLD_REGIONS.map(r => (
                        <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                          {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: '#e2e8f0', padding: '8px 0' }}>{form.country || '—'}</div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Field of Study</label>
                  {editMode ? (
                    <select value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))}
                      style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      <option value="">Select field...</option>
                      {FIELDS.filter(f => f !== 'All Fields').map(f => <option key={f}>{f}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: '#e2e8f0', padding: '8px 0' }}>{form.field || '—'}</div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Bio</label>
                {editMode ? (
                  <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{form.bio || 'No bio added yet.'}</div>
                )}
              </div>
            </div>

            {/* Social links */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 14, fontSize: 14 }}>🔗 Online Presence</div>
              {[
                { key: 'linkedin', label: '💼 LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
                { key: 'github', label: '🐙 GitHub', placeholder: 'https://github.com/yourname' },
                { key: 'portfolio', label: '🌐 Portfolio', placeholder: 'https://yoursite.com' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                  {editMode ? (
                    <input type="url" value={form[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  ) : (
                    <div style={{ fontSize: 13 }}>
                      {form[f.key] ? (
                        <a href={form[f.key]} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{form[f.key]}</a>
                      ) : <span style={{ color: '#374151' }}>Not added</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Skills */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 14, fontSize: 14 }}>🛠 Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {SKILLS_OPTIONS.map(skill => {
                  const active = skills.includes(skill)
                  return (
                    <button key={skill} onClick={() => editMode && toggleSkill(skill)} style={{
                      padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: editMode ? 'pointer' : 'default',
                      background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#60a5fa' : '#64748b',
                      border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                    }}>
                      {active ? '✓ ' : editMode ? '+ ' : ''}{skill}
                    </button>
                  )
                })}
              </div>
              {editMode && <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Click skills to add or remove</p>}
            </div>

            {/* Saved Internships */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 14, fontSize: 14 }}>💼 Saved Internships ({savedJobs.length})</div>
              {savedJobs.length === 0 ? (
                <div style={{ color: '#374151', fontSize: 13 }}>No saved internships yet. Browse and save opportunities!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {savedJobs.map(job => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{job.logo}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{job.title}</div>
                          <div style={{ fontSize: 11, color: '#60a5fa' }}>{job.company} · {job.location}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#f59e0b' }}>Due: {job.deadline}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}