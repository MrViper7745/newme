import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { id: 'career', label: '💼 Career', color: '#2563eb' },
  { id: 'education', label: '🎓 Education', color: '#8b5cf6' },
  { id: 'skills', label: '🛠 Skills', color: '#10b981' },
  { id: 'financial', label: '💰 Financial', color: '#f59e0b' },
  { id: 'personal', label: '🌱 Personal', color: '#06b6d4' },
  { id: 'networking', label: '🤝 Networking', color: '#ef4444' },
]

const SUGGESTIONS = [
  { title: 'Land my first internship', category: 'career', desc: 'Apply to 20 companies and secure an internship offer' },
  { title: 'Complete a free online course', category: 'skills', desc: 'Finish CS50 or Google Data Analytics Certificate' },
  { title: 'Grow LinkedIn to 500 connections', category: 'networking', desc: 'Build a professional network before graduating' },
  { title: 'Save my first emergency fund', category: 'financial', desc: 'Save 3 months of living expenses' },
  { title: 'Build a portfolio project', category: 'skills', desc: 'Create and deploy a project to show employers' },
  { title: 'Improve my CV to 80+ ATS score', category: 'career', desc: 'Use EduLink CV Builder to achieve a high ATS score' },
]

export default function Goals() {
  const { user } = useUser()
  const [goals, setGoals] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'career', target_date: '', milestones: [] })
  const [newMilestone, setNewMilestone] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchGoals(); else setGoals([]) }, [user])

  const fetchGoals = async () => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
  }

  const saveGoal = async () => {
    if (!newGoal.title.trim()) { showToast('Enter a goal title'); return }
    if (!user) { showToast('Sign in to save goals'); return }
    await supabase.from('goals').insert({ user_id: user.id, ...newGoal, milestones: newGoal.milestones })
    setNewGoal({ title: '', description: '', category: 'career', target_date: '', milestones: [] })
    setShowNew(false)
    fetchGoals()
    showToast('✅ Goal added!')
  }

  const updateProgress = async (id, progress) => {
    const completed = progress === 100
    await supabase.from('goals').update({ progress, completed, updated_at: new Date().toISOString() }).eq('id', id)
    setGoals(p => p.map(g => g.id === id ? { ...g, progress, completed } : g))
    if (completed) showToast('🎉 Goal completed! Congratulations!')
  }

  const toggleMilestone = async (goal, milestoneIdx) => {
    const milestones = [...(goal.milestones || [])]
    milestones[milestoneIdx] = { ...milestones[milestoneIdx], done: !milestones[milestoneIdx].done }
    const progress = Math.round((milestones.filter(m => m.done).length / milestones.length) * 100)
    await supabase.from('goals').update({ milestones, progress, updated_at: new Date().toISOString() }).eq('id', goal.id)
    setGoals(p => p.map(g => g.id === goal.id ? { ...g, milestones, progress } : g))
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
    showToast('Goal removed')
  }

  const fillSuggestion = (s) => {
    setNewGoal(p => ({ ...p, title: s.title, description: s.desc, category: s.category }))
    setShowNew(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = filter === 'all' ? goals : filter === 'active' ? goals.filter(g => !g.completed) : goals.filter(g => g.completed)
  const stats = { total: goals.length, completed: goals.filter(g => g.completed).length, active: goals.filter(g => !g.completed).length, avgProgress: goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🎯 Goal Tracker</h1>
            <p style={{ color: '#64748b' }}>Set goals, add milestones, and track your progress to success</p>
          </div>
          <button onClick={() => setShowNew(!showNew)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ New Goal</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[{ l: 'Total Goals', v: stats.total, c: '#2563eb' }, { l: 'Active', v: stats.active, c: '#f59e0b' }, { l: 'Completed', v: stats.completed, c: '#10b981' }, { l: 'Avg Progress', v: `${stats.avgProgress}%`, c: '#8b5cf6' }].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* New goal form */}
        {showNew && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 18 }}>Create New Goal</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Goal Title *</label>
                <input value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Land my first software internship" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Description</label>
                <textarea value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What does achieving this goal look like?" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Category</label>
                <select value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Target Date</label>
                <input type="date" value={newGoal.target_date} onChange={e => setNewGoal(p => ({ ...p, target_date: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
            </div>

            {/* Milestones */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Milestones (break goal into steps)</label>
              {newGoal.milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8', flex: 1, padding: '6px 12px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>{m.text}</span>
                  <button onClick={() => setNewGoal(p => ({ ...p, milestones: p.milestones.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newMilestone.trim()) { setNewGoal(p => ({ ...p, milestones: [...p.milestones, { text: newMilestone.trim(), done: false }] })); setNewMilestone('') } }} placeholder="Add a step and press Enter..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                <button onClick={() => { if (newMilestone.trim()) { setNewGoal(p => ({ ...p, milestones: [...p.milestones, { text: newMilestone.trim(), done: false }] })); setNewMilestone('') } }} style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Add</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveGoal} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Goal 🎯</button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ id: 'all', l: 'All' }, { id: 'active', l: 'Active' }, { id: 'completed', l: 'Completed' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '7px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filter === f.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: filter === f.id ? '#60a5fa' : '#64748b', border: `1px solid ${filter === f.id ? '#2563eb' : 'var(--border)'}` }}>{f.l}</button>
          ))}
        </div>

        {/* Goals list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
            <div style={{ marginBottom: 8 }}>No goals yet</div>
            <div style={{ fontSize: 13 }}>Set your first goal or pick from the suggestions below</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(goal => {
              const cat = CATEGORIES.find(c => c.id === goal.category)
              const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date) - new Date()) / 86400000) : null
              const isExpanded = expandedId === goal.id
              return (
                <div key={goal.id} style={{ background: 'var(--surface)', border: `1px solid ${goal.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : goal.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: goal.completed ? '#10b981' : '#f1f5f9', fontSize: 15 }}>{goal.completed ? '✅ ' : ''}{goal.title}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${cat?.color}18`, color: cat?.color, border: `1px solid ${cat?.color}30`, fontWeight: 600 }}>{cat?.label}</span>
                        </div>
                        {goal.description && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{goal.description}</div>}
                      </div>
                      <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {daysLeft !== null && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: daysLeft < 7 ? 'rgba(239,68,68,0.12)' : 'rgba(96,165,250,0.08)', color: daysLeft < 7 ? '#ef4444' : '#60a5fa', fontWeight: 600 }}>
                            {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.completed ? '#10b981' : `linear-gradient(90deg,${cat?.color || '#2563eb'},${cat?.color || '#2563eb'}99)`, borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 12, color: goal.completed ? '#10b981' : '#60a5fa', fontWeight: 700, width: 36, textAlign: 'right' }}>{goal.progress}%</span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '18px 20px', background: 'var(--surface2)' }}>
                      {/* Manual progress slider */}
                      {(!goal.milestones || goal.milestones.length === 0) && (
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Update Progress</label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[0, 10, 25, 50, 75, 90, 100].map(p => (
                              <button key={p} onClick={() => updateProgress(goal.id, p)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: goal.progress >= p ? `${cat?.color || '#2563eb'}20` : 'var(--surface)', color: goal.progress >= p ? (cat?.color || '#2563eb') : '#64748b', border: `1px solid ${goal.progress >= p ? (cat?.color || '#2563eb') + '40' : 'var(--border)'}` }}>{p}%</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Milestones */}
                      {goal.milestones?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Milestones ({goal.milestones.filter(m => m.done).length}/{goal.milestones.length} done)</div>
                          {goal.milestones.map((m, i) => (
                            <div key={i} onClick={() => toggleMilestone(goal, i)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: m.done ? 'rgba(16,185,129,0.08)' : 'var(--surface)', border: `1px solid ${m.done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}` }}>
                              <span style={{ fontSize: 16, color: m.done ? '#10b981' : '#374151' }}>{m.done ? '✅' : '⭕'}</span>
                              <span style={{ fontSize: 13, color: m.done ? '#10b981' : '#94a3b8', textDecoration: m.done ? 'line-through' : 'none' }}>{m.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => deleteGoal(goal.id)} style={{ padding: '7px 16px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Delete Goal</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Suggestions */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 16 }}>💡 Suggested Goals for Students</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {SUGGESTIONS.map((s, i) => {
              const cat = CATEGORIES.find(c => c.id === s.category)
              return (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{s.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${cat?.color}15`, color: cat?.color, fontWeight: 600 }}>{cat?.label}</span>
                    <button onClick={() => fillSuggestion(s)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}>+ Add Goal</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}