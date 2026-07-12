import { useState } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'

const SECTIONS = [
  { id: 'headline', label: '📌 Headline', max: 220, tip: 'The most important line on your profile. Goes under your name everywhere.', bad: 'Computer Science Student at University of Lagos', good: 'Software Engineering Student | Python & React | Seeking 2025 Internships | Building AI projects' },
  { id: 'about', label: '📖 About / Summary', max: 2600, tip: '3-5 paragraphs. First 3 lines show before "See more" — make them count.', bad: 'I am a 3rd year computer science student who is passionate about technology.', good: "Final-year CS student at University of Lagos building real-world AI projects. I've shipped a food delivery app used by 200+ students and completed the Google IT Support Certificate.\n\nCurrently seeking software engineering internships where I can apply my Python, React, and Node.js skills to products that impact millions.\n\nOpen to: Internships | Junior roles | Remote opportunities" },
  { id: 'experience', label: '💼 Experience Bullet', max: 2000, tip: 'Use the same STAR format as your CV. Quantify everything.', bad: 'Worked on the company website and helped with social media.', good: 'Redesigned company website using React and Tailwind CSS, reducing load time by 40%. Created 15 social media posts per month that grew Instagram following from 200 to 1,200 followers in 3 months.' },
  { id: 'skills', label: '🛠 Skills Section', max: 500, tip: 'Add 50 skills (the maximum). LinkedIn shows you 5x more in searches.', bad: 'Python, JavaScript', good: 'Python, JavaScript, React, Node.js, SQL, Git, Docker, AWS, Machine Learning, Data Analysis, REST APIs, TypeScript, Problem Solving, Communication, Teamwork, Project Management, Agile, Figma, Excel, Research...' },
]

const CHECKLIST = [
  { id: 'photo', label: 'Professional profile photo', desc: 'Clear face, professional background, smiling. No sunglasses, selfies, or group photos.', points: 15 },
  { id: 'banner', label: 'Custom banner/cover image', desc: 'Add a banner related to your field. Use Canva to create one for free.', points: 10 },
  { id: 'headline', label: 'Optimised headline (not just job title)', desc: 'Include your skills, what you are seeking, and keywords employers search for.', points: 15 },
  { id: 'about', label: 'About section written (min 300 chars)', desc: 'Tell your story. What you do, what you have built, and what you are looking for.', points: 15 },
  { id: 'experience', label: 'At least 1 experience entry with bullets', desc: 'Even volunteer work, academic projects, or part-time jobs count.', points: 10 },
  { id: 'education', label: 'Education section complete', desc: 'Include your university, degree, field, activities, and relevant modules.', points: 5 },
  { id: 'skills_50', label: '10+ skills listed', desc: 'Add as many relevant skills as possible. Connections can endorse them.', points: 10 },
  { id: 'connections_100', label: '100+ connections', desc: 'Start with classmates, professors, family. Quality AND quantity matter.', points: 10 },
  { id: 'custom_url', label: 'Custom LinkedIn URL', desc: 'linkedin.com/in/yourname instead of random numbers. Set in profile settings.', points: 5 },
  { id: 'open_to', label: '"Open to Work" frame or hiring signal', desc: 'Turn on "Open to Work" privately to recruiters — it triggers LinkedIn algorithm.', points: 5 },
]

export default function LinkedInOptimizer() {
  const { user, profile } = useUser()
  const [checked, setChecked] = useState({})
  const [activeSection, setActiveSection] = useState(null)
  const [texts, setTexts] = useState({})
  const [improving, setImproving] = useState(null)
  const [improved, setImproved] = useState({})
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const toggleCheck = (id) => setChecked(p => ({ ...p, [id]: !p[id] }))
  const score = CHECKLIST.reduce((s, item) => s + (checked[item.id] ? item.points : 0), 0)
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const scoreLabel = score >= 80 ? 'LinkedIn Pro 🏆' : score >= 60 ? 'Getting There 📈' : score >= 40 ? 'Needs Work 🔧' : 'Just Starting 🌱'

  const improveText = async (sectionId) => {
    const text = texts[sectionId]
    if (!text?.trim()) { showToast('Paste your text first'); return }
    setImproving(sectionId)
    const section = SECTIONS.find(s => s.id === sectionId)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a LinkedIn expert. Rewrite this LinkedIn ${section.label} section to be much more compelling, keyword-rich, and recruiter-friendly.

Original text:
"${text}"

Context:
- User field: ${profile?.field || 'general'}
- User country: ${profile?.country || 'global'}
- User skills: ${profile?.skills?.join(', ') || 'not specified'}

Rules:
- For headlines: include role | key skills | what you seek | 2-3 keywords
- For About: start with a hook, tell a story, end with what you seek
- For Experience: use STAR format, start with action verbs, quantify results
- For Skills: list as many relevant ones as possible

Return ONLY the improved text, nothing else. Max ${section.max} characters.`
          }]
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') { setImproved(p => ({ ...p, [sectionId]: full })); setImproving(null); showToast('✅ Text improved!'); return }
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setImproved(prev => ({ ...prev, [sectionId]: full })) } } catch {}
        }
      }
    } catch { showToast('❌ Error improving text') }
    setImproving(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🔵 LinkedIn Profile Optimizer</h1>
          <p style={{ color: '#64748b' }}>Score your profile, get AI rewrites for every section, and become 5x more visible to recruiters</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          <div>
            {/* Checklist */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>✅ Profile Checklist</div>
              {CHECKLIST.map(item => (
                <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked[item.id] ? '#10b981' : 'var(--border)'}`, background: checked[item.id] ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {checked[item.id] && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: checked[item.id] ? '#10b981' : '#f1f5f9', fontSize: 13, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(37,99,235,0.1)', color: '#60a5fa', fontWeight: 700, flexShrink: 0 }}>+{item.points}</span>
                </div>
              ))}
            </div>

            {/* AI Section Rewriter */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>🤖 AI Section Rewriter</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Paste any section of your LinkedIn profile and AI will rewrite it to be recruiter-ready with the right keywords.</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => setActiveSection(activeSection === s.id ? null : s.id)} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeSection === s.id ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: activeSection === s.id ? '#60a5fa' : '#64748b', border: `1px solid ${activeSection === s.id ? '#2563eb' : 'var(--border)'}` }}>{s.label}</button>
                ))}
              </div>

              {activeSection && (() => {
                const section = SECTIONS.find(s => s.id === activeSection)
                return (
                  <div>
                    <div style={{ padding: '10px 14px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, marginBottom: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      💡 <strong style={{ color: '#60a5fa' }}>Tip:</strong> {section.tip}
                    </div>

                    {/* Bad vs Good examples */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9 }}>
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>❌ WEAK</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{section.bad}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9 }}>
                        <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✅ STRONG</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{section.good}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Your Current Text</label>
                      <textarea value={texts[activeSection] || ''} onChange={e => setTexts(p => ({ ...p, [activeSection]: e.target.value }))} rows={4} placeholder={`Paste your current LinkedIn ${section.label} here...`} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                    </div>
                    <button onClick={() => improveText(activeSection)} disabled={improving === activeSection || !texts[activeSection]?.trim()} style={{ padding: '10px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: improving === activeSection ? 0.7 : 1 }}>
                      {improving === activeSection ? '⏳ Rewriting...' : '🤖 AI Rewrite'}
                    </button>

                    {improved[activeSection] && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>✅ IMPROVED VERSION — copy and paste into LinkedIn</div>
                        <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{improved[activeSection]}</div>
                        <button onClick={() => { navigator.clipboard.writeText(improved[activeSection]); showToast('📋 Copied! Paste into LinkedIn.') }} style={{ padding: '8px 18px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>📋 Copy to Clipboard</button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Score sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', border: `2px solid ${scoreColor}40`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 64, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>out of 100</div>
              <div style={{ fontWeight: 700, color: scoreColor, fontSize: 16, marginBottom: 16 }}>{scoreLabel}</div>
              <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg,${scoreColor},${scoreColor}99)`, borderRadius: 5, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>{100 - score} points to perfect score</div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>📊 Score Breakdown</div>
              {CHECKLIST.filter(item => !checked[item.id]).slice(0, 4).map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>-{item.points}</span>
                </div>
              ))}
              {Object.values(checked).filter(Boolean).length === CHECKLIST.length && (
                <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, padding: '10px 0' }}>🏆 Perfect score!</div>
              )}
            </div>

            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>🔑 LinkedIn Recruiter Facts</div>
              {['87% of recruiters use LinkedIn to find candidates', 'Profiles with photos get 21x more views', 'Having 500+ connections makes you "All-Star" level', 'Keywords in your headline show in search results', 'Posting weekly gets 5x more profile views'].map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>→ {f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}