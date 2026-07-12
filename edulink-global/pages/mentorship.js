import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS, FIELDS } from '../data/globalData'

const SEED_MENTORS = [
  { id: 'seed-1', name: 'Amara Osei', title: 'Senior Software Engineer', company: 'Google', country: 'Ghana', region: 'africa', field: 'IT', expertise: ['Python', 'Machine Learning', 'Career Advice'], bio: 'Google engineer helping African students break into big tech. Passionate about mentoring first-gen professionals.', linkedin: '#', available: true },
  { id: 'seed-2', name: 'Priya Sharma', title: 'Investment Banking Analyst', company: 'Goldman Sachs', country: 'India', region: 'asia', field: 'Finance', expertise: ['Financial Modelling', 'M&A', 'Interview Prep'], bio: 'IB analyst at Goldman helping students understand Wall Street from an Asian perspective.', linkedin: '#', available: true },
  { id: 'seed-3', name: 'James Müller', title: 'Product Manager', company: 'Spotify', country: 'Germany', region: 'europe', field: 'Business', expertise: ['Product Strategy', 'Agile', 'UX Research'], bio: 'PM at Spotify. Happy to help students interested in product management in European tech companies.', linkedin: '#', available: true },
  { id: 'seed-4', name: 'Fatima Al-Hassan', title: 'Civil Engineer', company: 'Arup', country: 'UAE', region: 'middle-east', field: 'Engineering', expertise: ['Structural Engineering', 'AutoCAD', 'Project Management'], bio: 'Civil engineer in the UAE helping engineering students in the Middle East and Africa.', linkedin: '#', available: true },
  { id: 'seed-5', name: 'Lucas Fernandez', title: 'Data Scientist', company: 'Nubank', country: 'Brazil', region: 'americas', field: 'IT', expertise: ['Data Analysis', 'SQL', 'Python', 'FinTech'], bio: 'Data scientist at Latin America\'s largest digital bank. Mentoring students in data and fintech careers.', linkedin: '#', available: true },
  { id: 'seed-6', name: 'Sarah Chen', title: 'UX Design Lead', company: 'Atlassian', country: 'Australia', region: 'oceania', field: 'Design', expertise: ['UI/UX', 'Figma', 'Design Systems', 'Portfolio Review'], bio: 'Lead UX designer helping students build portfolios and break into design at top tech companies.', linkedin: '#', available: true },
]

export default function Mentorship() {
  const { user, profile } = useUser()
  const [mentors, setMentors] = useState(SEED_MENTORS)
  const [dbMentors, setDbMentors] = useState([])
  const [requests, setRequests] = useState([])
  const [regionFilter, setRegionFilter] = useState('all')
  const [fieldFilter, setFieldFilter] = useState('All Fields')
  const [showApply, setShowApply] = useState(null)
  const [showBecome, setShowBecome] = useState(false)
  const [toast, setToast] = useState(null)
  const [message, setMessage] = useState('')
  const [mentorForm, setMentorForm] = useState({ name: '', title: '', company: '', country: '', region: 'africa', field: 'IT', expertise: [], bio: '', linkedin: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { fetchMentors(); if (user) fetchRequests() }, [user])

  const fetchMentors = async () => {
    const { data } = await supabase.from('mentors').select('*').eq('available', true)
    setDbMentors(data || [])
  }

  const fetchRequests = async () => {
    const { data } = await supabase.from('mentor_requests').select('*').eq('student_id', user.id)
    setRequests(data || [])
  }

  const allMentors = [...SEED_MENTORS, ...dbMentors]

  const filtered = allMentors.filter(m => {
    const matchRegion = regionFilter === 'all' || m.region === regionFilter
    const matchField = fieldFilter === 'All Fields' || m.field === fieldFilter
    return matchRegion && matchField
  })

  const sendRequest = async (mentor) => {
    if (!user) { showToast('Sign in to contact mentors'); return }
    if (!message.trim()) { showToast('Write a message first'); return }
    if (mentor.id?.startsWith('seed')) {
      showToast('✅ Request sent to ' + mentor.name + '! They will contact you via email.')
      setShowApply(null)
      setMessage('')
      return
    }
    const { error } = await supabase.from('mentor_requests').insert({ student_id: user.id, mentor_id: mentor.id, message })
    if (error) { showToast('❌ Failed: ' + error.message); return }
    showToast('✅ Request sent to ' + mentor.name + '!')
    setShowApply(null)
    setMessage('')
    fetchRequests()
  }

  const becomeMentor = async () => {
    if (!mentorForm.name || !mentorForm.title || !mentorForm.bio) { showToast('Fill all required fields'); return }
    const { error } = await supabase.from('mentors').insert({ ...mentorForm, user_id: user.id })
    if (error) { showToast('❌ Failed: ' + error.message); return }
    showToast('✅ Mentor profile created! You are now visible to students.')
    setShowBecome(false)
    fetchMentors()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🤝 Mentorship</h1>
            <p style={{ color: '#64748b' }}>Connect with professionals who want to guide your career worldwide</p>
          </div>
          <button onClick={() => setShowBecome(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Become a Mentor
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegionFilter(r.id)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: regionFilter === r.id ? r.color : 'var(--surface)',
              color: regionFilter === r.id ? '#fff' : '#94a3b8',
              border: `1px solid ${regionFilter === r.id ? r.color : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {FIELDS.map(f => (
            <button key={f} onClick={() => setFieldFilter(f)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: fieldFilter === f ? 'rgba(6,182,212,0.15)' : 'var(--surface)',
              color: fieldFilter === f ? '#06b6d4' : '#64748b',
              border: `1px solid ${fieldFilter === f ? '#06b6d4' : 'var(--border)'}`,
            }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {filtered.map(mentor => {
            const regionInfo = WORLD_REGIONS.find(r => r.id === mentor.region)
            const hasRequested = requests.some(r => r.mentor_id === mentor.id)
            return (
              <div key={mentor.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {mentor.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{mentor.name}</div>
                    <div style={{ color: '#60a5fa', fontSize: 12 }}>{mentor.title}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{mentor.company} · {regionInfo?.flag} {mentor.country}</div>
                  </div>
                </div>

                <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{mentor.bio}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                  {mentor.expertise?.map(e => (
                    <span key={e} style={{ fontSize: 10, padding: '2px 9px', borderRadius: 5, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>{e}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowApply(mentor)} disabled={hasRequested} style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: hasRequested ? 'not-allowed' : 'pointer', border: 'none',
                    background: hasRequested ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                    color: hasRequested ? '#10b981' : '#fff',
                  }}>{hasRequested ? '✓ Requested' : 'Request Mentorship'}</button>
                  {mentor.linkedin && mentor.linkedin !== '#' && (
                    <a href={mentor.linkedin} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}>LinkedIn</a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Request Modal */}
        {showApply && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 460 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 6 }}>Request Mentorship</div>
              <div style={{ color: '#60a5fa', fontSize: 13, marginBottom: 16 }}>To: {showApply.name} — {showApply.title} at {showApply.company}</div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                placeholder={`Hi ${showApply.name}, I'm a ${profile?.field || 'student'} student from ${profile?.country || 'my country'} and I'd love your guidance on...`}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowApply(null); setMessage('') }} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => sendRequest(showApply)} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Send Request</button>
              </div>
            </div>
          </div>
        )}

        {/* Become Mentor Modal */}
        {showBecome && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 6 }}>Become a Mentor</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Share your expertise with students worldwide. It takes 5 minutes to set up.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Your full name' },
                  { key: 'title', label: 'Job Title', placeholder: 'Senior Software Engineer' },
                  { key: 'company', label: 'Company', placeholder: 'Google' },
                  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/yourname' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</label>
                    <input value={mentorForm[f.key]} onChange={e => setMentorForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Country</label>
                    <select value={mentorForm.country} onChange={e => setMentorForm(p => ({ ...p, country: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      <option value="">Select...</option>
                      {WORLD_REGIONS.map(r => (
                        <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                          {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Field</label>
                    <select value={mentorForm.field} onChange={e => setMentorForm(p => ({ ...p, field: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                      {FIELDS.filter(f => f !== 'All Fields').map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Bio</label>
                  <textarea value={mentorForm.bio} onChange={e => setMentorForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell students about yourself and how you can help them..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowBecome(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={becomeMentor} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Create Mentor Profile</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}