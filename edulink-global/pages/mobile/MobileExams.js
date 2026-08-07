import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function MobileExams() {
  const { user } = useUser()
  const haptic = useHaptic()
  const [exams, setExams] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newExam, setNewExam] = useState({ module_name: '', exam_date: '', exam_time: '', venue: '', color: '#2563eb' })
  const [adding, setAdding] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [exRes, sessRes] = await Promise.all([
      supabase.from('exam_entries').select('*').eq('user_id', user.id).gte('exam_date', today).order('exam_date'),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('session_date', today).order('session_date').limit(20),
    ])
    setExams(exRes.data || [])
    setSessions(sessRes.data || [])
    setLoading(false)
  }

  const addExam = async () => {
    if (!newExam.module_name || !newExam.exam_date) { showToast('⚠️ Module name and date are required'); return }
    setAdding(true)
    const { error } = await supabase.from('exam_entries').insert({ user_id: user.id, ...newExam })
    setAdding(false)
    if (error) { showToast('❌ ' + error.message); return }
    setNewExam({ module_name: '', exam_date: '', exam_time: '', venue: '', color: '#2563eb' })
    setShowAdd(false)
    haptic.success()
    showToast('✅ Exam added!')
    load()
  }

  const generatePlan = async (exam) => {
    setGeneratingPlan(exam.id)
    try {
      const days = daysUntil(exam.exam_date)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Create a study plan for "${exam.module_name}" exam in ${days} days. Return JSON array of sessions: [{"session_date":"YYYY-MM-DD","module_name":"...","topics":"...","duration_minutes":45,"session_type":"review"}]. Create ${Math.min(days * 2, 20)} sessions spread across the days. Only return the JSON array, nothing else.` }],
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      const clean = full.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
      const plan = JSON.parse(clean.slice(s, e + 1))
      const inserts = plan.map(s => ({ ...s, user_id: user.id, exam_id: exam.id, completed: false }))
      await supabase.from('study_sessions').insert(inserts)
      haptic.success()
      showToast(`✅ Created ${plan.length} study sessions!`)
      load()
    } catch (err) { showToast('❌ ' + err.message) }
    setGeneratingPlan(null)
  }

  const markDone = async (session) => {
    haptic.correct()
    await supabase.from('study_sessions').update({ completed: true }).eq('id', session.id)
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, completed: true } : s))
  }

  const daysUntil = (date) => Math.max(0, Math.ceil((new Date(date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24)))

  const urgencyColor = (days) => days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#10b981'

  const todaySessions = sessions.filter(s => s.session_date === new Date().toISOString().split('T')[0])

  return (
    <MobileLayout title="📅 Exams" rightAction={
      <button onClick={() => setShowAdd(true)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Exam</button>
    }>
      <PullToRefresh onRefresh={load}>
        <div style={{ padding: '12px 16px' }}>

          {/* Today's sessions */}
          {todaySessions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>📍 Today's Sessions</div>
              {todaySessions.map(session => (
                <div key={session.id} style={{ padding: '12px 16px', borderRadius: 12, background: session.completed ? 'rgba(16,185,129,0.06)' : 'var(--surface)', border: `1px solid ${session.completed ? 'rgba(16,185,129,0.2)' : 'rgba(37,99,235,0.2)'}`, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: session.completed ? 'var(--text3)' : 'var(--text)', textDecoration: session.completed ? 'line-through' : 'none' }}>{session.module_name}</div>
                    {session.topics && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{session.topics?.slice(0, 50)}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>⏱ {session.duration_minutes}min</div>
                  </div>
                  {session.completed
                    ? <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✅ Done</span>
                    : <button onClick={() => markDone(session)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Mark Done</button>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Upcoming exams */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Upcoming Exams</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No upcoming exams</div>
              <button onClick={() => setShowAdd(true)} style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add Exam</button>
            </div>
          ) : exams.map(exam => {
            const days = daysUntil(exam.exam_date)
            const examSessions = sessions.filter(s => s.exam_id === exam.id)
            const done = examSessions.filter(s => s.completed).length
            const hasPlan = examSessions.length > 0
            return (
              <div key={exam.id} style={{ background: 'var(--surface)', border: `1px solid ${exam.color || '#2563eb'}25`, borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>
                <div style={{ borderLeft: `4px solid ${exam.color || '#2563eb'}`, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{exam.module_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        📅 {new Date(exam.exam_date + 'T12:00').toLocaleDateString('en-ZA', { weekday: 'short', month: 'long', day: 'numeric' })}
                        {exam.exam_time && ` at ${exam.exam_time}`}
                      </div>
                      {exam.venue && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>📍 {exam.venue}</div>}
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: urgencyColor(days), lineHeight: 1 }}>{days}</div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>days left</div>
                    </div>
                  </div>

                  {hasPlan && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>
                        <span>Study plan progress</span>
                        <span style={{ fontWeight: 700 }}>{done}/{examSessions.length} sessions</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${examSessions.length ? (done / examSessions.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#10b981,#059669)', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => hasPlan ? null : generatePlan(exam)}
                    disabled={generatingPlan === exam.id}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, background: hasPlan ? 'rgba(16,185,129,0.08)' : 'rgba(37,99,235,0.1)', border: `1px solid ${hasPlan ? 'rgba(16,185,129,0.2)' : 'rgba(37,99,235,0.2)'}`, color: hasPlan ? '#10b981' : '#60a5fa', fontWeight: 700, fontSize: 13, cursor: hasPlan ? 'default' : 'pointer' }}>
                    {generatingPlan === exam.id ? '⏳ Generating plan...' : hasPlan ? '✅ Study plan created' : '🤖 Generate AI Study Plan'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </PullToRefresh>

      {/* Add exam sheet */}
      <MobileBottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="📅 Add Exam" height="80vh">
        <div style={{ padding: '16px' }}>
          {[
            { label: 'Module Name *', key: 'module_name', placeholder: 'e.g. Engineering Mathematics', type: 'text' },
            { label: 'Exam Date *', key: 'exam_date', placeholder: '', type: 'date' },
            { label: 'Exam Time', key: 'exam_time', placeholder: '', type: 'time' },
            { label: 'Venue', key: 'venue', placeholder: 'e.g. Hall A', type: 'text' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input type={f.type} value={newExam[f.key]} onChange={e => setNewExam(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setNewExam(prev => ({ ...prev, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${newExam.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: newExam.color === c ? `0 0 0 2px ${c}` : 'none' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={addExam} disabled={!newExam.module_name || !newExam.exam_date || adding} style={{ flex: 2, padding: '12px', borderRadius: 11, background: newExam.module_name && newExam.exam_date ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'var(--surface2)', color: newExam.module_name && newExam.exam_date ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {adding ? '⏳ Adding...' : '📅 Add Exam'}
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}