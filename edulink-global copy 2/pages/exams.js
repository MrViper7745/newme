import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

export default function Exams() {
  const { user } = useUser()
  const [exams, setExams] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('list')
  const [form, setForm] = useState({ subject: '', date: '', time: '09:00', venue: '', notes: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchExams() }, [user])

  const fetchExams = async () => {
    const { data } = await supabase.from('exams').select('*').eq('user_id', user.id).order('date', { ascending: true })
    setExams(data || [])
  }

  const saveExam = async () => {
    if (!form.subject || !form.date) { showToast('Enter subject and date'); return }
    if (!user) { showToast('Sign in to save exams'); return }
    await supabase.from('exams').insert({ user_id: user.id, ...form })
    setForm({ subject: '', date: '', time: '09:00', venue: '', notes: '' })
    setShowNew(false)
    fetchExams()
    showToast('✅ Exam added!')
  }

  const toggleComplete = async (exam) => {
    await supabase.from('exams').update({ completed: !exam.completed }).eq('id', exam.id)
    fetchExams()
  }

  const deleteExam = async (id) => {
    await supabase.from('exams').delete().eq('id', id)
    fetchExams()
    showToast('Removed')
  }

  const upcoming = exams.filter(e => !e.completed && new Date(e.date) >= new Date())
  const past = exams.filter(e => e.completed || new Date(e.date) < new Date())

  const getDaysUntil = (date) => {
    const d = Math.ceil((new Date(date) - new Date()) / 86400000)
    if (d < 0) return { label: 'Past', color: '#374151' }
    if (d === 0) return { label: 'TODAY', color: '#ef4444' }
    if (d === 1) return { label: 'Tomorrow', color: '#ef4444' }
    if (d <= 7) return { label: `${d} days`, color: '#f59e0b' }
    return { label: `${d} days`, color: '#10b981' }
  }

  const getStudyPlan = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / 86400000)
    if (days <= 0) return null
    if (days === 1) return 'Review notes and key formulas only — no new material'
    if (days <= 3) return 'Focus on past papers and weak areas only'
    if (days <= 7) return 'Past papers daily + review notes each evening'
    if (days <= 14) return '2 hours/day: 1h new content + 1h past papers'
    return `${days} days left — create a study timetable now`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 860, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📅 Exam Timetable</h1>
            <p style={{ color: '#64748b' }}>Track exam dates, venues, and get personalised study plans for each one</p>
          </div>
          <button onClick={() => setShowNew(!showNew)} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add Exam</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[{ l: 'Upcoming Exams', v: upcoming.length, c: '#2563eb' }, { l: 'This Week', v: exams.filter(e => !e.completed && getDaysUntil(e.date).label.includes('day') && parseInt(getDaysUntil(e.date).label) <= 7).length, c: '#f59e0b' }, { l: 'Completed', v: past.filter(e => e.completed).length, c: '#10b981' }].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* New exam form */}
        {showNew && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>Add Exam</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[{ k: 'subject', l: 'Subject / Module *', p: 'Data Structures & Algorithms' }, { k: 'venue', l: 'Venue / Room', p: 'Hall A, Block C' }].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.l}</label>
                  <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Time</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Notes (topics to focus on, allowed materials, etc.)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="e.g. Open book exam. Focus on chapters 4-7, binary trees, sorting algorithms" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveExam} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Exam 📅</button>
            </div>
          </div>
        )}

        {/* Exam list */}
        {exams.length === 0 && !showNew ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📅</div>
            <div>No exams added yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Add your exams to track countdowns and get study plans</div>
          </div>
        ) : (
          <div>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>⏰ Upcoming ({upcoming.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcoming.map(exam => {
                    const countdown = getDaysUntil(exam.date)
                    const studyPlan = getStudyPlan(exam.date)
                    return (
                      <div key={exam.id} style={{ background: 'var(--surface)', border: `1px solid ${countdown.color}30`, borderLeft: `4px solid ${countdown.color}`, borderRadius: 14, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>{exam.subject}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              📅 {new Date(exam.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                              {exam.time && ` · ⏰ ${exam.time}`}
                              {exam.venue && ` · 📍 ${exam.venue}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 10, background: `${countdown.color}15`, color: countdown.color, fontWeight: 800 }}>{countdown.label}</span>
                            <button onClick={() => toggleComplete(exam)} style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Done ✓</button>
                            <button onClick={() => deleteExam(exam.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16 }}>×</button>
                          </div>
                        </div>
                        {exam.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>{exam.notes}</div>}
                        {studyPlan && (
                          <div style={{ fontSize: 12, color: '#60a5fa', padding: '7px 12px', background: 'rgba(96,165,250,0.08)', borderRadius: 7, border: '1px solid rgba(96,165,250,0.15)' }}>
                            📚 Study plan: {studyPlan}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14, opacity: 0.7 }}>✅ Past / Completed ({past.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {past.map(exam => (
                    <div key={exam.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 14 }}>✅ {exam.subject}</div>
                        <div style={{ fontSize: 11, color: '#374151' }}>{new Date(exam.date).toLocaleDateString()}{exam.time && ` · ${exam.time}`}</div>
                      </div>
                      <button onClick={() => deleteExam(exam.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}