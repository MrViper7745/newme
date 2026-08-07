import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

const JOB_TYPES = ['All', 'Part-time', 'Internship', 'Graduate', 'Tutoring', 'Freelance']

export default function MobileJobBoard() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showPost, setShowPost] = useState(false)
  const [form, setForm] = useState({ title: '', company: '', type: 'Part-time', location: '', salary: '', description: '', apply_url: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('job_listings')
      .select('*, poster:profiles!posted_by(name,username,avatar_url)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(40)
    setJobs(data || [])
    setLoading(false)
  }

  const postJob = async () => {
    if (!form.title || !form.description) { showToast('⚠️ Title and description required'); return }
    setSaving(true)
    const { error } = await supabase.from('job_listings').insert({
      ...form,
      posted_by: user.id,
      active: true,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }
    haptic.success()
    showToast('✅ Job posted!')
    setShowPost(false)
    setForm({ title: '', company: '', type: 'Part-time', location: '', salary: '', description: '', apply_url: '', deadline: '' })
    load()
  }

  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.type === filter)

  const daysLeft = (deadline) => {
    if (!deadline) return null
    const d = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return d >= 0 ? d : null
  }

  return (
    <MobileLayout title="💼 Job Board" rightAction={
      <button onClick={() => setShowPost(true)}
        style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
        + Post Job
      </button>
    }>
      <div style={{ padding: '12px 16px' }}>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {JOB_TYPES.map(type => (
            <button key={type} onClick={() => setFilter(type)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: filter === type ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: filter === type ? '#60a5fa' : 'var(--text3)', border: `1px solid ${filter === type ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Loading jobs...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>💼</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No jobs posted yet</div>
            <button onClick={() => setShowPost(true)}
              style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Post the First Job
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(job => {
              const dl = daysLeft(job.deadline)
              return (
                <div key={job.id} onClick={() => setSelectedJob(job)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer' }}
                  onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onTouchEnd={e => e.currentTarget.style.background = 'var(--surface)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{job.title}</div>
                      {job.company && <div style={{ fontSize: 12, color: '#60a5fa' }}>{job.company}</div>}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>{job.type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)', flexWrap: 'wrap' }}>
                    {job.location && <span>📍 {job.location}</span>}
                    {job.salary && <span>💰 {job.salary}</span>}
                    {dl !== null && <span style={{ color: dl <= 3 ? '#ef4444' : 'var(--text3)' }}>⏰ {dl} days left</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Job detail sheet */}
      {selectedJob && (
        <MobileBottomSheet open={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob.title} height="75vh">
          <div style={{ padding: '16px' }}>
            {selectedJob.company && <div style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>{selectedJob.company}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[selectedJob.type, selectedJob.location, selectedJob.salary].filter(Boolean).map((item, i) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>{item}</span>
              ))}
            </div>
            {selectedJob.deadline && <div style={{ fontSize: 12, color: daysLeft(selectedJob.deadline) <= 3 ? '#ef4444' : 'var(--text3)', marginBottom: 14 }}>⏰ Deadline: {new Date(selectedJob.deadline).toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}</div>}
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{selectedJob.description}</div>
            {selectedJob.apply_url && (
              <a href={selectedJob.apply_url} target="_blank" rel="noreferrer"
                style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
                Apply Now ↗
              </a>
            )}
          </div>
        </MobileBottomSheet>
      )}

      {/* Post job sheet */}
      <MobileBottomSheet open={showPost} onClose={() => setShowPost(false)} title="💼 Post a Job" height="85vh">
        <div style={{ padding: '16px' }}>
          {[
            { key: 'title', label: 'Job Title *', placeholder: 'e.g. Part-time Data Capturer', type: 'text' },
            { key: 'company', label: 'Company / Organisation', placeholder: 'e.g. Standard Bank', type: 'text' },
            { key: 'location', label: 'Location', placeholder: 'e.g. Johannesburg or Remote', type: 'text' },
            { key: 'salary', label: 'Salary / Rate', placeholder: 'e.g. R5000/month or R150/hr', type: 'text' },
            { key: 'apply_url', label: 'Application Link', placeholder: 'https://...', type: 'url' },
            { key: 'deadline', label: 'Application Deadline', placeholder: '', type: 'date' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>Job Type</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {JOB_TYPES.filter(t => t !== 'All').map(type => (
                <button key={type} onClick={() => setForm(p => ({ ...p, type }))}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: form.type === type ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: form.type === type ? '#60a5fa' : 'var(--text3)', border: `1px solid ${form.type === type ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Job description, requirements, responsibilities..." rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <button onClick={postJob} disabled={saving || !form.title || !form.description}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: form.title && form.description ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', color: form.title && form.description ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? '⏳ Posting...' : '💼 Post Job'}
          </button>
        </div>
      </MobileBottomSheet>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}