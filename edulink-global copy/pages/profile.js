import { useState } from 'react'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS, FIELDS, INTERNSHIPS } from '../data/globalData'

const SKILLS_OPTIONS = [
  'Python','JavaScript','React','Node.js','SQL','Java','C++','Machine Learning',
  'Data Analysis','UI/UX Design','Project Management','Communication',
  'Financial Modelling','AutoCAD','MATLAB','Research','Leadership','Excel'
]

export default function Profile() {
  const [editMode, setEditMode] = useState(false)
  const [toast, setToast] = useState(null)
  const [skills, setSkills] = useState(['Python','React','Data Analysis'])
  const [saved] = useState([1, 3, 10])
  const [form, setForm] = useState({
    name: 'Alex Mokoena',
    email: 'alex.mokoena@student.edu',
    country: 'South Africa',
    institution: 'University of Cape Town',
    field: 'Computer Science',
    year: '3rd Year',
    bio: 'Passionate computer science student interested in fintech, AI, and building tech for Africa and the world.',
    linkedin: '',
    github: '',
    portfolio: '',
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const toggleSkill = (skill) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  const completion = Math.round(
    (Object.values(form).filter(v => v.trim()).length / Object.keys(form).length) * 60 +
    (skills.length > 0 ? 20 : 0) +
    (saved.length > 0 ? 20 : 0)
  )

  const savedJobs = INTERNSHIPS.filter(j => saved.includes(j.id))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1000, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>My Profile</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Your professional identity on EduLink Global</p>
          </div>
          <button onClick={() => {
            if (editMode) showToast('✅ Profile saved!')
            setEditMode(!editMode)
          }} style={{
            padding: '10px 24px', borderRadius: 10,
            background: editMode ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>
            {editMode ? '💾 Save Profile' : '✏️ Edit Profile'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>

          {/* LEFT — Avatar + Completion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avatar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg,#1d4ed8,#06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 800, color: '#fff'
              }}>
                {form.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 17, marginBottom: 4 }}>{form.name}</div>
              <div style={{ color: '#60a5fa', fontSize: 13, marginBottom: 4 }}>{form.field}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{form.institution}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {WORLD_REGIONS.find(r => r.countries.includes(form.country))?.flag} {form.country}
              </div>
            </div>

            {/* Profile Completion */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 12, fontSize: 14 }}>Profile Strength</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Completion</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: completion >= 70 ? '#10b981' : '#f59e0b' }}>{completion}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completion}%`, background: completion >= 70 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Basic Info', done: true },
                  { label: 'Skills Added', done: skills.length > 0 },
                  { label: 'Bio Written', done: form.bio.length > 10 },
                  { label: 'CV Uploaded', done: false },
                  { label: 'LinkedIn Added', done: form.linkedin.length > 0 },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: item.done ? '#10b981' : '#64748b' }}>
                      {item.done ? '✅' : '⭕'}
                    </span>
                    <span style={{ fontSize: 12, color: item.done ? '#94a3b8' : '#64748b', textDecoration: item.done ? 'none' : 'none' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CV Upload */}
            <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Upload your CV</div>
              <button style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Choose File (PDF)
              </button>
            </div>
          </div>

          {/* RIGHT — Form + Skills + Saved */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Basic Info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 18, fontSize: 15 }}>📋 Basic Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { key: 'name', label: 'Full Name' },
                  { key: 'email', label: 'Email Address' },
                  { key: 'institution', label: 'Institution' },
                  { key: 'year', label: 'Year of Study' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                    {editMode ? (
                      <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    ) : (
                      <div style={{ fontSize: 13, color: '#e2e8f0', padding: '9px 0' }}>{form[f.key] || '—'}</div>
                    )}
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Country</label>
                  {editMode ? (
                    <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      {WORLD_REGIONS.map(r => (
                        <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                          {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: '#e2e8f0', padding: '9px 0' }}>{form.country}</div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field of Study</label>
                  {editMode ? (
                    <select value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      {FIELDS.filter(f => f !== 'All Fields').map(f => <option key={f}>{f}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: '#e2e8f0', padding: '9px 0' }}>{form.field}</div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</label>
                {editMode ? (
                  <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{form.bio}</div>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: 15 }}>🔗 Online Presence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'linkedin', label: '💼 LinkedIn URL', placeholder: 'https://linkedin.com/in/yourname' },
                  { key: 'github', label: '🐙 GitHub URL', placeholder: 'https://github.com/yourname' },
                  { key: 'portfolio', label: '🌐 Portfolio Website', placeholder: 'https://yourportfolio.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
                    {editMode ? (
                      <input type="url" value={form[f.key]} placeholder={f.placeholder}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    ) : (
                      <div style={{ fontSize: 13, color: form[f.key] ? '#60a5fa' : '#374151' }}>{form[f.key] || 'Not added yet'}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: 15 }}>🛠 Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SKILLS_OPTIONS.map(skill => {
                  const active = skills.includes(skill)
                  return (
                    <button key={skill} onClick={() => editMode && toggleSkill(skill)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: editMode ? 'pointer' : 'default',
                      background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#60a5fa' : '#64748b',
                      border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                      transition: 'all 0.2s',
                    }}>
                      {active ? '✓ ' : editMode ? '+ ' : ''}{skill}
                    </button>
                  )
                })}
              </div>
              {editMode && <p style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>Click to add or remove skills</p>}
            </div>

            {/* Saved Internships */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: 15 }}>💼 Saved Internships ({savedJobs.length})</div>
              {savedJobs.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>No saved internships yet. Browse and save opportunities!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {savedJobs.map(job => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{job.logo}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{job.title}</div>
                          <div style={{ fontSize: 11, color: '#60a5fa' }}>{job.company} · {job.location}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#f59e0b' }}>Due: {job.deadline}</div>
                        <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>{job.salary}</div>
                      </div>
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