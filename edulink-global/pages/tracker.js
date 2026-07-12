import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const STAGES = [
  { id: 'wishlist', label: 'Wishlist', color: '#64748b', emoji: '💭' },
  { id: 'applied', label: 'Applied', color: '#2563eb', emoji: '📨' },
  { id: 'interview', label: 'Interview', color: '#f59e0b', emoji: '🎙️' },
  { id: 'offer', label: 'Offer', color: '#10b981', emoji: '🎉' },
  { id: 'rejected', label: 'Rejected', color: '#ef4444', emoji: '❌' },
]

export default function Tracker() {
  const { user } = useUser()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ company: '', role: '', location: '', status: 'wishlist', notes: '', applied_date: '', deadline: '', url: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchApps() }, [user])

  const fetchApps = async () => {
    const { data } = await supabase.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  const saveApp = async () => {
    if (!form.company || !form.role) { showToast('Company and role are required'); return }
    if (selected) {
      await supabase.from('applications').update(form).eq('id', selected.id)
      showToast('✅ Application updated!')
    } else {
      await supabase.from('applications').insert({ ...form, user_id: user.id })
      showToast('✅ Application added!')
    }
    setShowForm(false)
    setSelected(null)
    setForm({ company: '', role: '', location: '', status: 'wishlist', notes: '', applied_date: '', deadline: '', url: '' })
    fetchApps()
  }

  const deleteApp = async (id) => {
    await supabase.from('applications').delete().eq('id', id)
    showToast('Application deleted')
    fetchApps()
  }

  const moveStage = async (id, newStatus) => {
    await supabase.from('applications').update({ status: newStatus }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  const editApp = (app) => {
    setSelected(app)
    setForm({ company: app.company, role: app.role, location: app.location || '', status: app.status, notes: app.notes || '', applied_date: app.applied_date || '', deadline: app.deadline || '', url: app.url || '' })
    setShowForm(true)
  }

  if (!user) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Navbar /><div style={{ color: '#f1f5f9' }}>Sign in to track applications</div></div>

  const stats = STAGES.map(s => ({ ...s, count: apps.filter(a => a.status === s.id).length }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📊 Application Tracker</h1>
            <p style={{ color: '#64748b' }}>Track every internship application in one place</p>
          </div>
          <button onClick={() => { setShowForm(true); setSelected(null); setForm({ company: '', role: '', location: '', status: 'wishlist', notes: '', applied_date: '', deadline: '', url: '' }) }} style={{
            padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>+ Add Application</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.emoji} {s.label}</div>
            </div>
          ))}
        </div>

        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{stage.emoji}</span>
                <span style={{ fontWeight: 700, color: stage.color, fontSize: 13 }}>{stage.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', background: 'var(--surface2)', padding: '1px 7px', borderRadius: 10 }}>
                  {apps.filter(a => a.status === stage.id).length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {apps.filter(a => a.status === stage.id).map(app => (
                  <div key={app.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, marginBottom: 2 }}>{app.role}</div>
                    <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 6 }}>{app.company}</div>
                    {app.location && <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6 }}>📍 {app.location}</div>}
                    {app.deadline && <div style={{ color: '#f59e0b', fontSize: 10, marginBottom: 8 }}>⏰ {app.deadline}</div>}

                    {/* Move stage buttons */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {STAGES.filter(s => s.id !== stage.id).slice(0, 3).map(s => (
                        <button key={s.id} onClick={() => moveStage(app.id, s.id)} style={{
                          padding: '2px 7px', borderRadius: 5, fontSize: 9, cursor: 'pointer', fontWeight: 600,
                          background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30`,
                        }}>→ {s.label}</button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => editApp(app)} style={{ flex: 1, padding: '4px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteApp(app.id)} style={{ padding: '4px 8px', borderRadius: 6, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>Del</button>
                    </div>
                  </div>
                ))}

                {apps.filter(a => a.status === stage.id).length === 0 && (
                  <div style={{ color: '#374151', fontSize: 11, textAlign: 'center', padding: '16px 0' }}>No applications</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 20 }}>
                {selected ? 'Edit Application' : 'Add Application'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'company', label: 'Company', placeholder: 'Google' },
                  { key: 'role', label: 'Role', placeholder: 'Software Engineering Intern' },
                  { key: 'location', label: 'Location', placeholder: 'Lagos, Nigeria' },
                  { key: 'url', label: 'Job URL', placeholder: 'https://...' },
                  { key: 'applied_date', label: 'Date Applied', type: 'date' },
                  { key: 'deadline', label: 'Deadline', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</label>
                    <input type={f.type || 'text'} value={form[f.key]} placeholder={f.placeholder || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => { setShowForm(false); setSelected(null) }} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveApp} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                    {selected ? 'Save Changes' : 'Add Application'}
                  </button>
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