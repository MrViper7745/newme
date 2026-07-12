import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { FIELDS } from '../data/globalData'

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']

export default function Courses() {
  const { user, profile } = useUser()
  const [courses, setCourses] = useState([])
  const [userCourses, setUserCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [fieldFilter, setFieldFilter] = useState('All Fields')
  const [levelFilter, setLevelFilter] = useState('All Levels')
  const [freeOnly, setFreeOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { fetchCourses() }, [])
  useEffect(() => { if (user) fetchUserCourses() }, [user])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('rating', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  const fetchUserCourses = async () => {
    const { data } = await supabase.from('user_courses').select('*, courses(*)').eq('user_id', user.id)
    setUserCourses(data || [])
  }

  const generateRecommendations = async () => {
    if (!profile?.skills?.length && !profile?.field) {
      showToast('Complete your profile first so we can recommend courses')
      return
    }
    setGenerating(true)
    setTab('recommended')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `A student has these details:
- Field: ${profile.field || 'Not specified'}
- Current skills: ${profile.skills?.join(', ') || 'None listed'}
- Country: ${profile.country || 'Not specified'}
- Bio: ${profile.bio || 'Not specified'}

From this course list, recommend the top 5 most relevant ones for their career growth:
${courses.map(c => `- ${c.title} (${c.provider}) — Skills: ${c.skills?.join(', ')}`).join('\n')}

Return ONLY a JSON array of course titles like: ["Course Title 1", "Course Title 2", "Course Title 3", "Course Title 4", "Course Title 5"]
Nothing else.`
          }]
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            try {
              const clean = fullText.replace(/```json|```/g, '').trim()
              const titles = JSON.parse(clean)
              const recommended = courses.filter(c => titles.some(t => c.title.includes(t) || t.includes(c.title)))
              setRecommendations(recommended.length > 0 ? recommended : courses.slice(0, 5))
            } catch {
              setRecommendations(courses.slice(0, 5))
            }
            setGenerating(false)
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) fullText += parsed.text
          } catch {}
        }
      }
    } catch {
      showToast('❌ Failed to generate recommendations')
    }
    setGenerating(false)
  }

  const toggleEnroll = async (course) => {
    if (!user) { showToast('Sign in to enroll in courses'); return }
    const existing = userCourses.find(uc => uc.course_id === course.id)
    if (existing) {
      await supabase.from('user_courses').delete().eq('id', existing.id)
      showToast('Removed from your courses')
    } else {
      await supabase.from('user_courses').insert({ user_id: user.id, course_id: course.id, status: 'enrolled' })
      showToast('✅ Enrolled! Good luck 🎓')
    }
    fetchUserCourses()
  }

  const updateProgress = async (courseId, progress) => {
    await supabase.from('user_courses').update({
      progress,
      status: progress === 100 ? 'completed' : 'enrolled',
      completed_at: progress === 100 ? new Date().toISOString() : null
    }).eq('user_id', user.id).eq('course_id', courseId)
    fetchUserCourses()
    if (progress === 100) showToast('🎉 Course completed! Great work!')
  }

  const isEnrolled = (courseId) => userCourses.some(uc => uc.course_id === courseId)
  const getCourseProgress = (courseId) => userCourses.find(uc => uc.course_id === courseId)?.progress || 0

  const filtered = (tab === 'recommended' ? (recommendations.length > 0 ? recommendations : courses) : tab === 'my_courses' ? userCourses.map(uc => uc.courses).filter(Boolean) : courses).filter(c => {
    if (!c) return false
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || c.provider?.toLowerCase().includes(search.toLowerCase())
    const matchField = fieldFilter === 'All Fields' || c.field === fieldFilter
    const matchLevel = levelFilter === 'All Levels' || c.level === levelFilter
    const matchFree = !freeOnly || c.free
    return matchSearch && matchField && matchLevel && matchFree
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🎓 Course Recommendations</h1>
            <p style={{ color: '#64748b' }}>Free and paid courses from top universities and platforms worldwide</p>
          </div>
          <button onClick={generateRecommendations} disabled={generating} style={{
            padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: generating ? 0.7 : 1
          }}>
            {generating ? '⏳ Analysing...' : '🤖 Get AI Recommendations'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Courses', value: courses.length, color: '#2563eb' },
            { label: 'Free Courses', value: courses.filter(c => c.free).length, color: '#10b981' },
            { label: 'My Enrolled', value: userCourses.length, color: '#f59e0b' },
            { label: 'Completed', value: userCourses.filter(uc => uc.status === 'completed').length, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--surface)', borderRadius: 12, padding: 5, width: 'fit-content', border: '1px solid var(--border)' }}>
          {[
            { id: 'all', label: '📚 All Courses' },
            { id: 'recommended', label: '🤖 AI Picks' },
            { id: 'my_courses', label: '📖 My Courses' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === t.id ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
              color: tab === t.id ? '#fff' : '#64748b',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <input type="text" placeholder="🔍 Search courses..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 9, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
          <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
            {FIELDS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button onClick={() => setFreeOnly(!freeOnly)} style={{
            padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: freeOnly ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
            color: freeOnly ? '#10b981' : '#64748b',
            border: `1px solid ${freeOnly ? '#10b981' : 'var(--border)'}`,
          }}>🆓 Free Only</button>
        </div>

        {tab === 'recommended' && generating && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
            <div>Analysing your profile and finding the best courses...</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {filtered.map(course => {
            const enrolled = isEnrolled(course.id)
            const progress = getCourseProgress(course.id)
            return (
              <div key={course.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>{course.title}</div>
                    <div style={{ color: '#60a5fa', fontSize: 12 }}>{course.provider}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 }}>
                    {course.free ? (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700 }}>FREE</span>
                    ) : (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700 }}>PAID</span>
                    )}
                    <span style={{ fontSize: 10, color: '#f59e0b' }}>★ {course.rating}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>{course.field}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid var(--border)' }}>{course.level}</span>
                  {course.duration && <span style={{ fontSize: 10, color: '#64748b' }}>⏱️ {course.duration}</span>}
                </div>

                {course.skills?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {course.skills.slice(0, 4).map(s => (
                      <span key={s} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>{s}</span>
                    ))}
                  </div>
                )}

                {enrolled && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Progress</span>
                      <span style={{ fontSize: 11, color: progress === 100 ? '#10b981' : '#60a5fa', fontWeight: 700 }}>{progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#10b981' : 'linear-gradient(90deg,#2563eb,#06b6d4)', borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 25, 50, 75, 100].map(p => (
                        <button key={p} onClick={() => updateProgress(course.id, p)} style={{
                          flex: 1, padding: '3px', borderRadius: 4, fontSize: 9, cursor: 'pointer', fontWeight: 600,
                          background: progress >= p ? (p === 100 ? '#10b981' : '#2563eb') : 'var(--surface2)',
                          color: progress >= p ? '#fff' : '#64748b', border: 'none',
                        }}>{p}%</button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 12 }}>
                  <button onClick={() => toggleEnroll(course)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none',
                    background: enrolled ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                    color: enrolled ? '#ef4444' : '#fff',
                  }}>{enrolled ? 'Unenroll' : 'Enroll Now'}</button>
                  <a href={course.url} target="_blank" rel="noreferrer" style={{
                    padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>View →</a>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && !generating && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <div>{tab === 'my_courses' ? 'Enroll in courses to track your progress' : 'No courses match your filters'}</div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}