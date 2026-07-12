import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const MOODS = ['😩', '😟', '😐', '😊', '🤩']
const MOOD_LABELS = ['Rough', 'Tough', 'Okay', 'Good', 'Amazing']

export default function Logbook() {
  const { user } = useUser()
  const [entries, setEntries] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('')
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ company: '', role: '', date: new Date().toISOString().slice(0, 10), hours: 8, tasks: '', learnings: '', supervisor_feedback: '', mood: 3 })
  const [stats, setStats] = useState({ totalHours: 0, avgMood: 0, entries: 0 })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchEntries(); else setEntries([]) }, [user])

  const fetchEntries = async () => {
    const { data } = await supabase.from('logbook_entries').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setEntries(data || [])
    if (data?.length) {
      setStats({ totalHours: data.reduce((s, e) => s + (e.hours || 0), 0), avgMood: Math.round(data.reduce((s, e) => s + e.mood, 0) / data.length * 10) / 10, entries: data.length })
      if (data[0]) setForm(p => ({ ...p, company: data[0].company, role: data[0].role }))
    }
  }

  const saveEntry = async () => {
    if (!form.company || !form.date || !form.tasks) { showToast('Fill in company, date, and tasks'); return }
    if (!user) { showToast('Sign in to save entries'); return }
    await supabase.from('logbook_entries').insert({ user_id: user.id, ...form })
    setForm(p => ({ ...p, date: new Date().toISOString().slice(0, 10), tasks: '', learnings: '', supervisor_feedback: '', mood: 3 }))
    setShowNew(false)
    fetchEntries()
    showToast('✅ Entry saved!')
  }

  const deleteEntry = async (id) => {
    await supabase.from('logbook_entries').delete().eq('id', id)
    fetchEntries()
  }

  const filtered = filter ? entries.filter(e => e.company.toLowerCase().includes(filter.toLowerCase()) || e.tasks.toLowerCase().includes(filter.toLowerCase())) : entries

  const exportCSV = () => {
    const rows = [['Date', 'Company', 'Role', 'Hours', 'Tasks', 'Learnings', 'Mood'], ...entries.map(e => [e.date, e.company, e.role, e.hours, e.tasks, e.learnings, MOOD_LABELS[e.mood - 1]])]
    const csv = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'internship_logbook.csv'; a.click()
    showToast('✅ Exported as CSV!')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📓 Internship Logbook</h1>
            <p style={{ color: '#64748b' }}>Log your daily tasks, learnings, and experiences. Required by many university programmes.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {entries.length > 0 && <button onClick={exportCSV} style={{ padding: '9px 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Export CSV</button>}
            <button onClick={() => setShowNew(!showNew)} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Log Entry</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[{ l: 'Total Hours Logged', v: `${stats.totalHours}h`, c: '#2563eb' }, { l: 'Log Entries', v: stats.entries, c: '#10b981' }, { l: 'Average Mood', v: stats.entries ? `${MOODS[Math.round(stats.avgMood) - 1]} ${MOOD_LABELS[Math.round(stats.avgMood) - 1]}` : '—', c: '#f59e0b' }].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c, marginBottom: 3 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* New entry form */}
        {showNew && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 18 }}>📝 New Log Entry</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[{ k: 'company', l: 'Company / Organisation *', p: 'Flutterwave' }, { k: 'role', l: 'Your Role', p: 'Software Intern' }].map(f => (
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
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Hours Worked</label>
                <input type="number" min={0} max={24} value={form.hours} onChange={e => setForm(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
            </div>
            {[{ k: 'tasks', l: 'Tasks Completed Today *', p: 'Describe what you worked on today...', rows: 3 }, { k: 'learnings', l: 'What did you learn?', p: 'New skills, insights, knowledge gained...', rows: 2 }, { k: 'supervisor_feedback', l: 'Supervisor Feedback (optional)', p: 'Any feedback received from your supervisor...', rows: 2 }].map(f => (
              <div key={f.k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.l}</label>
                <textarea value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} rows={f.rows} placeholder={f.p} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>How was your day? {MOODS[form.mood - 1]} {MOOD_LABELS[form.mood - 1]}</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {MOODS.map((m, i) => (
                  <button key={i} onClick={() => setForm(p => ({ ...p, mood: i + 1 }))} style={{ fontSize: 28, background: 'none', border: `2px solid ${form.mood === i + 1 ? '#2563eb' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', padding: '6px 10px', transform: form.mood === i + 1 ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.2s' }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEntry} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Entry 📓</button>
            </div>
          </div>
        )}

        {/* Search */}
        {entries.length > 0 && (
          <input type="text" placeholder="🔍 Search entries..." value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 16 }} />
        )}

        {/* Entries */}
        {filtered.length === 0 && !showNew ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📓</div>
            <div style={{ marginBottom: 8 }}>No log entries yet</div>
            <div style={{ fontSize: 13 }}>Start logging your internship experience daily — even 5 minutes makes a difference</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(entry => (
              <div key={entry.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{entry.company} — {entry.role}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 22 }}>{MOODS[entry.mood - 1]}</span>
                    <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>{entry.hours}h</span>
                    <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Tasks</div><div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{entry.tasks}</div></div>
                  {entry.learnings && <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Learnings</div><div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{entry.learnings}</div></div>}
                  {entry.supervisor_feedback && <div style={{ padding: '8px 12px', background: 'rgba(96,165,250,0.08)', borderRadius: 8, border: '1px solid rgba(96,165,250,0.15)' }}><div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginBottom: 2 }}>💬 SUPERVISOR FEEDBACK</div><div style={{ fontSize: 13, color: '#94a3b8' }}>{entry.supervisor_feedback}</div></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}