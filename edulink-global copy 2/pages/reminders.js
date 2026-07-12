import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const TYPES = [
  { id: 'internship', label: 'Internship', color: '#2563eb', emoji: '💼' },
  { id: 'scholarship', label: 'Scholarship', color: '#10b981', emoji: '🎓' },
  { id: 'application', label: 'Application', color: '#f59e0b', emoji: '📄' },
  { id: 'other', label: 'Other', color: '#8b5cf6', emoji: '🔔' },
]

export default function Reminders() {
  const { user } = useUser()
  const [reminders, setReminders] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ title: '', type: 'internship', deadline: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchReminders() }, [user])

  const fetchReminders = async () => {
    const { data } = await supabase.from('reminders').select('*').eq('user_id', user.id).order('deadline', { ascending: true })
    setReminders(data || [])
  }

  const addReminder = async () => {
    if (!form.title || !form.deadline) { showToast('Title and deadline are required'); return }
    await supabase.from('reminders').insert({ ...form, user_id: user.id })
    showToast('✅ Reminder set!')
    setShowForm(false)
    setForm({ title: '', type: 'internship', deadline: '' })
    fetchReminders()
  }

  const deleteReminder = async (id) => {
    await supabase.from('reminders').delete().eq('id', id)
    showToast('Reminder deleted')
    fetchReminders()
  }

  const getDaysLeft = (deadline) => {
    const diff = new Date(deadline) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (days) => {
    if (days < 0) return '#374151'
    if (days <= 1) return '#ef4444'
    if (days <= 7) return '#f59e0b'
    return '#10b981'
  }

  const getUrgencyLabel = (days) => {
    if (days < 0) return 'Expired'
    if (days === 0) return 'Today!'
    if (days === 1) return 'Tomorrow!'
    if (days <= 7) return `${days} days left`
    return `${days} days left`
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Navbar />
      <div style={{ color: '#f1f5f9', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
        Sign in to set deadline reminders
      </div>
    </div>
  )

  const upcoming = reminders.filter(r => getDaysLeft(r.deadline) >= 0)
  const expired = reminders.filter(r => getDaysLeft(r.deadline) < 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 720, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🔔 Deadline Reminders</h1>
            <p style={{ color: '#64748b' }}>Never miss an internship or scholarship deadline</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add Reminder</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Upcoming', value: upcoming.length, color: '#10b981' },
            { label: 'This week', value: reminders.filter(r => getDaysLeft(r.deadline) <= 7 && getDaysLeft(r.deadline) >= 0).length, color: '#f59e0b' },
            { label: 'Urgent (≤1 day)', value: reminders.filter(r => getDaysLeft(r.deadline) <= 1 && getDaysLeft(r.deadline) >= 0).length, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {upcoming.length === 0 && expired.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No reminders yet</div>
            <div style={{ fontSize: 13 }}>Add deadlines for internships and scholarships you're targeting</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map(r => {
              const days = getDaysLeft(r.deadline)
              const typeInfo = TYPES.find(t => t.id === r.type) || TYPES[3]
              return (
                <div key={r.id} style={{
                  background: 'var(--surface)', border: `1px solid ${days <= 7 ? getUrgencyColor(days) + '40' : 'var(--border)'}`,
                  borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16
                }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{typeInfo.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      <span style={{ color: typeInfo.color, fontWeight: 600 }}>{typeInfo.label}</span>
                      {' · '}Deadline: {new Date(r.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: getUrgencyColor(days) }}>{getUrgencyLabel(days)}</div>
                    {days <= 7 && days >= 0 && (
                      <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>⚠️ Coming up soon</div>
                    )}
                  </div>
                  <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16, padding: '4px', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}

            {expired.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>EXPIRED</div>
                {expired.map(r => {
                  const typeInfo = TYPES.find(t => t.id === r.type) || TYPES[3]
                  return (
                    <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.5, marginBottom: 8 }}>
                      <div style={{ fontSize: 24 }}>{typeInfo.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 14 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: '#374151' }}>Expired: {new Date(r.deadline).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Add Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 420 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 20 }}>Add Deadline Reminder</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Title</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Google Engineering Internship"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TYPES.map(t => (
                      <button key={t.id} onClick={() => setForm(p => ({ ...p, type: t.id }))} style={{
                        flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: form.type === t.id ? `${t.color}20` : 'var(--surface2)',
                        color: form.type === t.id ? t.color : '#64748b',
                        border: `1px solid ${form.type === t.id ? t.color : 'var(--border)'}`,
                      }}>{t.emoji} {t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Deadline Date</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addReminder} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Set Reminder</button>
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