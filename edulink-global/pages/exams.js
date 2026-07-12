import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const COLORS = ['#2563eb','#7c3aed','#ef4444','#10b981','#f59e0b','#06b6d4','#ec4899','#8b5cf6']

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.ceil((new Date(dateStr) - today) / (1000*60*60*24))
}

function urgencyColor(days) {
  if (days < 0) return '#64748b'
  if (days <= 3) return '#ef4444'
  if (days <= 7) return '#f59e0b'
  if (days <= 14) return '#2563eb'
  return '#10b981'
}

export default function Exams() {
  const { user, profile } = useUser()
  const [exams, setExams] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('exams')
  const [toast, setToast] = useState(null)
  const [generatingPlan, setGeneratingPlan] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ module_name:'', exam_date:'', exam_time:'', venue:'', notes:'', color:'#2563eb' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) { loadExams(); loadSessions() } }, [user])

  const loadExams = async () => {
    setLoading(true)
    const { data } = await supabase.from('exam_entries').select('*').eq('user_id', user.id).order('exam_date', { ascending: true })
    setExams(data || [])
    setLoading(false)
  }

  const loadSessions = async () => {
    const { data } = await supabase.from('study_sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: true })
    setSessions(data || [])
  }

  const saveExam = async () => {
    if (!form.module_name.trim() || !form.exam_date) return
    setSaving(true)
    if (editingId) {
      await supabase.from('exam_entries').update({ ...form }).eq('id', editingId)
    } else {
      await supabase.from('exam_entries').insert({ ...form, user_id: user.id })
    }
    setForm({ module_name:'', exam_date:'', exam_time:'', venue:'', notes:'', color:'#2563eb' })
    setEditingId(null); setSaving(false); setActiveTab('exams')
    loadExams()
    showToast(editingId ? '✅ Exam updated!' : '✅ Exam added!')
  }

  const deleteExam = async (id) => {
    if (!confirm('Delete this exam and its study plan?')) return
    await supabase.from('exam_entries').delete().eq('id', id)
    setExams(p => p.filter(e => e.id !== id))
    showToast('🗑 Deleted')
  }

  const startEdit = (exam) => {
    setForm({ module_name: exam.module_name, exam_date: exam.exam_date, exam_time: exam.exam_time||'', venue: exam.venue||'', notes: exam.notes||'', color: exam.color||'#2563eb' })
    setEditingId(exam.id)
    setActiveTab('add')
  }

  const generateStudyPlan = async (exam) => {
    const days = daysUntil(exam.exam_date)
    if (days <= 0) { showToast('This exam has already passed'); return }
    setGeneratingPlan(exam.id)
    try {
      const { data: weakTopics } = await supabase.from('weak_topics').select('topic').eq('user_id', user.id).eq('resolved', false).limit(5)
      const { data: libraryFiles } = await supabase.from('library_files').select('title').eq('user_id', user.id).ilike('title', `%${exam.module_name.split(' ')[0]}%`).limit(4)

      const prompt = `Create a realistic study plan for a university student.
Module: ${exam.module_name}
Days until exam: ${days}
Student field: ${profile?.field || 'Engineering'}
${weakTopics?.length ? `Struggling with: ${weakTopics.map(t=>t.topic).join(', ')}` : ''}
${libraryFiles?.length ? `Has materials: ${libraryFiles.map(f=>f.title).join(', ')}` : ''}
Today: ${new Date().toISOString().split('T')[0]}

Return JSON ONLY:
{
  "overview": "brief plan summary",
  "sessions": [
    { "day_offset": 1, "session_date": "YYYY-MM-DD", "topics": ["topic"], "duration_minutes": 90, "focus": "what to do" }
  ],
  "tips": ["tip1", "tip2"]
}
Space sessions realistically — not every day. Increase intensity closer to exam. Max 3 sessions per week early, daily in final week.`

      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) })
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim(); if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      const clean = full.replace(/```json|```/g,'').trim()
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
      const plan = JSON.parse(clean.slice(s, e+1))
      if (plan.sessions?.length) {
        await supabase.from('study_sessions').insert(plan.sessions.map(s => ({ user_id: user.id, exam_id: exam.id, module_name: exam.module_name, session_date: s.session_date, duration_minutes: s.duration_minutes||90, topics: s.topics||[], notes: s.focus||'', completed: false })))
        await supabase.from('exam_entries').update({ study_plan: plan }).eq('id', exam.id)
        loadSessions(); loadExams()
        showToast(`✅ Study plan created — ${plan.sessions.length} sessions scheduled!`)
        setActiveTab('schedule')
      }
    } catch(e) { showToast('❌ ' + e.message) }
    setGeneratingPlan(null)
  }

  const toggleDone = async (session) => {
    await supabase.from('study_sessions').update({ completed: !session.completed }).eq('id', session.id)
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, completed: !s.completed } : s))
  }

  const today = new Date().toISOString().split('T')[0]
  const upcomingExams = exams.filter(e => daysUntil(e.exam_date) >= 0)
  const pastExams = exams.filter(e => daysUntil(e.exam_date) < 0)
  const todaySessions = sessions.filter(s => s.session_date === today)
  const sessionsByDate = sessions.reduce((acc, s) => { if (!acc[s.session_date]) acc[s.session_date] = []; acc[s.session_date].push(s); return acc }, {})

  const I = { width:'100%', padding:'10px 13px', borderRadius:9, fontSize:13, background:'var(--surface2)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none' }
  const L = { fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:6 }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'90px 16px 80px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:14 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>📅 Exam Planner</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Add your exams and let AI build a personalised study schedule</p>
          </div>
          <button onClick={() => { setEditingId(null); setForm({ module_name:'', exam_date:'', exam_time:'', venue:'', notes:'', color:'#2563eb' }); setActiveTab('add') }}
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ➕ Add Exam
          </button>
        </div>

        {/* Stats */}
        {upcomingExams.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { l:'Upcoming', v:upcomingExams.length, c:'#2563eb' },
              { l:'Scheduled Sessions', v:sessions.filter(s=>!s.completed).length, c:'#7c3aed' },
              { l:'Completed', v:sessions.filter(s=>s.completed).length, c:'#10b981' },
              { l:"Today's Sessions", v:todaySessions.length, c:'#f59e0b' },
            ].map(s => (
              <div key={s.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:11, color:'#64748b' }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Today alert */}
        {todaySessions.length > 0 && (
          <div style={{ marginBottom:18, padding:'14px 18px', borderRadius:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontWeight:700, color:'#f59e0b', marginBottom:8 }}>📖 Today's Study Sessions</div>
            {todaySessions.map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:8 }}>
                <div>
                  <span style={{ fontSize:13, color:'#f1f5f9', fontWeight:600 }}>{s.module_name}</span>
                  <span style={{ fontSize:12, color:'#94a3b8', marginLeft:8 }}>{s.duration_minutes}min{s.topics?.length ? ` — ${s.topics.join(', ')}` : ''}</span>
                </div>
                <button onClick={() => toggleDone(s)} style={{ padding:'4px 12px', borderRadius:7, background:s.completed?'rgba(16,185,129,0.15)':'rgba(37,99,235,0.1)', border:`1px solid ${s.completed?'rgba(16,185,129,0.3)':'rgba(37,99,235,0.3)'}`, color:s.completed?'#10b981':'#60a5fa', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  {s.completed ? '✅ Done' : 'Mark done'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
          {[{id:'exams',label:'📋 My Exams'},{id:'schedule',label:'📆 Study Schedule'},{id:'add',label:editingId?'✏️ Edit':'➕ Add Exam'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding:'10px 20px', border:'none', cursor:'pointer', background:'transparent', color:activeTab===tab.id?'#60a5fa':'#64748b', fontWeight:activeTab===tab.id?700:500, fontSize:13, borderBottom:`2px solid ${activeTab===tab.id?'#2563eb':'transparent'}` }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Exams tab */}
        {activeTab === 'exams' && (
          <div>
            {loading ? <div style={{ textAlign:'center', padding:'40px 0', color:'#64748b' }}>Loading...</div>
            : exams.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
                <div style={{ fontSize:48, marginBottom:14 }}>📅</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#94a3b8', marginBottom:8 }}>No exams added yet</div>
                <div style={{ fontSize:13, marginBottom:20 }}>Add your exams and let AI plan your study schedule</div>
                <button onClick={() => setActiveTab('add')} style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:'pointer' }}>➕ Add First Exam</button>
              </div>
            ) : (
              <div>
                {upcomingExams.length > 0 && (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Upcoming</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {upcomingExams.map(exam => {
                        const days = daysUntil(exam.exam_date)
                        const planSessions = sessions.filter(s => s.exam_id === exam.id)
                        const doneSessions = planSessions.filter(s => s.completed).length
                        const hasPlan = planSessions.length > 0
                        return (
                          <div key={exam.id} style={{ background:'var(--surface)', border:`1px solid ${exam.color||'#2563eb'}30`, borderLeft:`4px solid ${exam.color||'#2563eb'}`, borderRadius:14, padding:'18px 20px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:17, fontWeight:800, color:'#f1f5f9', marginBottom:5 }}>{exam.module_name}</div>
                                <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#64748b' }}>
                                  <span>📅 {new Date(exam.exam_date+'T12:00:00').toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
                                  {exam.exam_time && <span>⏰ {exam.exam_time}</span>}
                                  {exam.venue && <span>📍 {exam.venue}</span>}
                                </div>
                                {exam.notes && <div style={{ fontSize:12, color:'#94a3b8', marginTop:5 }}>{exam.notes}</div>}
                                {hasPlan && (
                                  <div style={{ marginTop:10 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                      <div style={{ flex:1, height:4, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
                                        <div style={{ height:'100%', background:exam.color||'#2563eb', width:`${planSessions.length>0?(doneSessions/planSessions.length)*100:0}%`, borderRadius:2, transition:'width 0.3s' }} />
                                      </div>
                                      <span style={{ fontSize:10, color:'#64748b', flexShrink:0 }}>{doneSessions}/{planSessions.length} done</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <div style={{ fontSize:30, fontWeight:900, color:urgencyColor(days), lineHeight:1 }}>{days}</div>
                                <div style={{ fontSize:11, color:'#64748b' }}>days left</div>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                              {!hasPlan ? (
                                <button onClick={() => generateStudyPlan(exam)} disabled={generatingPlan===exam.id}
                                  style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', opacity:generatingPlan===exam.id?0.7:1 }}>
                                  {generatingPlan===exam.id ? '⏳ Planning...' : '🤖 Generate Study Plan'}
                                </button>
                              ) : (
                                <button onClick={() => setActiveTab('schedule')} style={{ padding:'7px 14px', borderRadius:8, background:'rgba(37,99,235,0.12)', border:'1px solid rgba(37,99,235,0.3)', color:'#60a5fa', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                                  📆 View Schedule
                                </button>
                              )}
                              <button onClick={() => startEdit(exam)} style={{ padding:'7px 14px', borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', color:'#94a3b8', fontSize:12, cursor:'pointer' }}>✏️ Edit</button>
                              <button onClick={() => deleteExam(exam.id)} style={{ padding:'7px 14px', borderRadius:8, background:'none', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:12, cursor:'pointer' }}>🗑</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pastExams.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Past Exams</div>
                    {pastExams.map(exam => (
                      <div key={exam.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, opacity:0.55 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>{exam.module_name}</div>
                          <div style={{ fontSize:11, color:'#64748b' }}>{new Date(exam.exam_date+'T12:00:00').toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => deleteExam(exam.id)} style={{ padding:'5px 12px', borderRadius:7, background:'none', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:11, cursor:'pointer' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          <div>
            {sessions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>📆</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#94a3b8', marginBottom:8 }}>No study schedule yet</div>
                <div style={{ fontSize:13 }}>Add an exam and click "Generate Study Plan"</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {Object.entries(sessionsByDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, dateSessions]) => {
                  const isToday = date === today
                  const isPast = date < today
                  const exam = exams.find(e => dateSessions.some(s => s.exam_id === e.id))
                  return (
                    <div key={date} style={{ opacity:isPast?0.55:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:isToday?'#f59e0b':'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                        {isToday ? '📍 Today — ' : ''}{new Date(date+'T12:00:00').toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                      </div>
                      {dateSessions.map(session => (
                        <div key={session.id} style={{ background:'var(--surface)', border:`1px solid ${isToday?'rgba(245,158,11,0.3)':'var(--border)'}`, borderLeft:`3px solid ${exam?.color||'#2563eb'}`, borderRadius:10, padding:'12px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:session.completed?'#64748b':'#f1f5f9', textDecoration:session.completed?'line-through':'none', marginBottom:4 }}>{session.module_name}</div>
                            {session.topics?.length > 0 && (
                              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:4 }}>
                                {session.topics.map((t,i) => <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(37,99,235,0.1)', color:'#60a5fa', border:'1px solid rgba(37,99,235,0.2)' }}>{t}</span>)}
                              </div>
                            )}
                            {session.notes && <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>{session.notes}</div>}
                            <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>⏱ {session.duration_minutes} minutes</div>
                          </div>
                          <button onClick={() => toggleDone(session)} style={{ padding:'5px 12px', borderRadius:7, background:session.completed?'rgba(16,185,129,0.12)':'rgba(37,99,235,0.1)', border:`1px solid ${session.completed?'rgba(16,185,129,0.3)':'rgba(37,99,235,0.3)'}`, color:session.completed?'#10b981':'#60a5fa', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                            {session.completed ? '✅ Done' : 'Mark done'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit tab */}
        {activeTab === 'add' && (
          <div style={{ maxWidth:520 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
              <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:16, marginBottom:20 }}>{editingId ? '✏️ Edit Exam' : '➕ Add New Exam'}</div>
              {[
                { label:'Module / Subject Name *', key:'module_name', type:'text', placeholder:'e.g. Engineering Mathematics III' },
                { label:'Exam Date *', key:'exam_date', type:'date', placeholder:'' },
                { label:'Exam Time', key:'exam_time', type:'time', placeholder:'' },
                { label:'Venue / Room', key:'venue', type:'text', placeholder:'e.g. Hall A, Room 101' },
                { label:'Notes', key:'notes', type:'text', placeholder:'e.g. Open book, bring calculator' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom:16 }}>
                  <label style={L}>{field.label}</label>
                  <input type={field.type} value={form[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={I} />
                </div>
              ))}
              <div style={{ marginBottom:22 }}>
                <label style={L}>Colour</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setForm(p => ({ ...p, color }))} style={{ width:30, height:30, borderRadius:'50%', background:color, border:form.color===color?'3px solid #fff':'2px solid transparent', cursor:'pointer', outline:form.color===color?`2px solid ${color}`:'none', transition:'all 0.1s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setActiveTab('exams'); setEditingId(null) }} style={{ flex:1, padding:'11px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', color:'#94a3b8', fontWeight:600, fontSize:14, cursor:'pointer' }}>Cancel</button>
                <button onClick={saveExam} disabled={!form.module_name.trim()||!form.exam_date||saving} style={{ flex:2, padding:'11px', borderRadius:10, background:form.module_name.trim()&&form.exam_date&&!saving?'linear-gradient(135deg,#7c3aed,#2563eb)':'var(--surface2)', color:form.module_name.trim()&&form.exam_date?'#fff':'#64748b', border:'none', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  {saving ? '⏳ Saving...' : editingId ? '✅ Save Changes' : '➕ Add Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}