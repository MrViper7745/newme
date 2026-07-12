import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS, FIELDS } from '../data/globalData'

export default function CareerRoadmap() {
  const { user, profile } = useUser()
  const [roadmaps, setRoadmaps] = useState([])
  const [activeRoadmap, setActiveRoadmap] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    goal_role: '',
    target_country: '',
    timeline_years: 5,
    current_skills: profile?.skills || [],
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchRoadmaps() }, [user])

  const fetchRoadmaps = async () => {
    const { data } = await supabase.from('career_roadmaps').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setRoadmaps(data || [])
    if (data?.length > 0) setActiveRoadmap(data[0])
  }

  const generateRoadmap = async () => {
    if (!form.goal_role) { showToast('Enter your goal role'); return }
    if (!user) { showToast('Sign in to save roadmaps'); return }
    setGenerating(true)
    setStreamingText('')

    const prompt = `Create a detailed ${form.timeline_years}-year career roadmap for:
- Current student: ${profile?.name || 'Student'}
- Field of study: ${profile?.field || 'Not specified'}
- Current skills: ${(form.current_skills || profile?.skills || []).join(', ') || 'Beginner level'}
- Goal role: ${form.goal_role}
- Target country/market: ${form.target_country || 'Global'}
- Timeline: ${form.timeline_years} years

Create a structured year-by-year roadmap. For each year include:
1. Key skills to learn
2. Certifications to get
3. Projects to build
4. Internship/job targets
5. Salary expectations

Format as JSON with this EXACT structure:
{
  "summary": "Brief overview of the career path",
  "years": [
    {
      "year": 1,
      "title": "Year title",
      "focus": "Main focus area",
      "skills": ["skill1", "skill2"],
      "certifications": ["cert1"],
      "projects": ["project description"],
      "targets": "Job/internship target",
      "salary": "Expected salary range",
      "color": "#hexcolor"
    }
  ],
  "final_goal": "Description of where they'll be",
  "key_tips": ["tip1", "tip2", "tip3"]
}

Return ONLY valid JSON, nothing else.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
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
              const roadmapData = JSON.parse(clean)
              const { data: saved } = await supabase.from('career_roadmaps').insert({
                user_id: user.id,
                goal_role: form.goal_role,
                current_skills: form.current_skills || profile?.skills || [],
                target_country: form.target_country,
                timeline_years: form.timeline_years,
                roadmap: roadmapData,
              }).select().single()
              if (saved) {
                setActiveRoadmap(saved)
                fetchRoadmaps()
                showToast('✅ Career roadmap generated!')
              }
            } catch (e) {
              showToast('❌ Failed to parse roadmap. Try again.')
            }
            setGenerating(false)
            setStreamingText('')
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) { fullText += parsed.text; setStreamingText(fullText) }
          } catch {}
        }
      }
    } catch {
      showToast('❌ Generation failed')
    }
    setGenerating(false)
  }

  const YEAR_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🗺️ AI Career Roadmap</h1>
          <p style={{ color: '#64748b' }}>Get a personalised year-by-year career plan generated by AI based on your profile and goals</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeRoadmap ? '320px 1fr' : '1fr', gap: 24 }}>

          {/* Form + Past roadmaps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>Generate New Roadmap</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Goal Role *</label>
                  <input value={form.goal_role} onChange={e => setForm(p => ({ ...p, goal_role: e.target.value }))}
                    placeholder="e.g. Senior Software Engineer at Google"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Target Country/Market</label>
                  <select value={form.target_country} onChange={e => setForm(p => ({ ...p, target_country: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                    <option value="">Global / Any</option>
                    {WORLD_REGIONS.map(r => (
                      <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                        {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Timeline</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[3, 5, 10].map(y => (
                      <button key={y} onClick={() => setForm(p => ({ ...p, timeline_years: y }))} style={{
                        flex: 1, padding: '7px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: form.timeline_years === y ? '#2563eb' : 'var(--surface2)',
                        color: form.timeline_years === y ? '#fff' : '#64748b',
                        border: `1px solid ${form.timeline_years === y ? '#2563eb' : 'var(--border)'}`,
                      }}>{y} yr</button>
                    ))}
                  </div>
                </div>
                <button onClick={generateRoadmap} disabled={generating || !form.goal_role} style={{
                  padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: generating ? 0.7 : 1
                }}>
                  {generating ? '⏳ Generating...' : '🤖 Generate Roadmap'}
                </button>
              </div>
            </div>

            {/* Past roadmaps */}
            {roadmaps.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>Past Roadmaps</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roadmaps.map(r => (
                    <div key={r.id} onClick={() => setActiveRoadmap(r)} style={{
                      padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                      background: activeRoadmap?.id === r.id ? 'rgba(37,99,235,0.15)' : 'var(--surface2)',
                      border: `1px solid ${activeRoadmap?.id === r.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 12 }}>{r.goal_role}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{r.timeline_years}yr · {r.target_country || 'Global'} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Roadmap display */}
          {activeRoadmap?.roadmap ? (
            <div>
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20, marginBottom: 8 }}>🎯 Goal: {activeRoadmap.goal_role}</div>
                <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{activeRoadmap.roadmap.summary}</div>
                {activeRoadmap.target_country && <div style={{ marginTop: 8, fontSize: 12, color: '#60a5fa' }}>📍 Target: {activeRoadmap.target_country}</div>}
              </div>

              {/* Year by year */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {activeRoadmap.roadmap.years?.map((year, i) => (
                    <div key={i} style={{ paddingLeft: 52, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: 8, top: 16, width: 24, height: 24,
                        borderRadius: '50%', background: YEAR_COLORS[i % YEAR_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 800, zIndex: 1,
                      }}>{year.year}</div>

                      <div style={{ background: 'var(--surface)', border: `1px solid ${YEAR_COLORS[i % YEAR_COLORS.length]}30`, borderRadius: 14, padding: 20 }}>
                        <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16, marginBottom: 3 }}>{year.title}</div>
                        <div style={{ color: YEAR_COLORS[i % YEAR_COLORS.length], fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{year.focus}</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {year.skills?.length > 0 && (
                            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>🛠 Skills to Learn</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {year.skills.map(s => <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${YEAR_COLORS[i % YEAR_COLORS.length]}18`, color: YEAR_COLORS[i % YEAR_COLORS.length], border: `1px solid ${YEAR_COLORS[i % YEAR_COLORS.length]}30` }}>{s}</span>)}
                              </div>
                            </div>
                          )}
                          {year.certifications?.length > 0 && (
                            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>🎓 Certifications</div>
                              {year.certifications.map(c => <div key={c} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>• {c}</div>)}
                            </div>
                          )}
                          {year.projects?.length > 0 && (
                            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>🚀 Projects</div>
                              {year.projects.map(p => <div key={p} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>• {p}</div>)}
                            </div>
                          )}
                          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>💼 Target</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{year.targets}</div>
                            {year.salary && <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>💰 {year.salary}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final goal */}
              {activeRoadmap.roadmap.final_goal && (
                <div style={{ marginTop: 24, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 15, marginBottom: 8 }}>🏁 Where You'll Be</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{activeRoadmap.roadmap.final_goal}</div>
                </div>
              )}

              {/* Key tips */}
              {activeRoadmap.roadmap.key_tips?.length > 0 && (
                <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>💡 Key Tips for Success</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeRoadmap.roadmap.key_tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: '#60a5fa', flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                        <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : generating ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 6 }}>Building your roadmap...</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>AI is creating a personalised {form.timeline_years}-year plan</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {streamingText || 'Thinking...'}
              </div>
            </div>
          ) : !activeRoadmap ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 20, marginBottom: 10 }}>No Roadmap Yet</div>
              <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Fill in your goal role on the left and click Generate Roadmap. AI will create a personalised year-by-year career plan for you.</div>
            </div>
          ) : null}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}