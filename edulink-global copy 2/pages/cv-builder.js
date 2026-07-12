import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS } from '../data/globalData'

const STEPS = [
  { id: 'welcome', label: '👋 Welcome' },
  { id: 'personal', label: '👤 Personal' },
  { id: 'education', label: '🎓 Education' },
  { id: 'experience', label: '💼 Experience' },
  { id: 'skills', label: '🛠 Skills' },
  { id: 'summary', label: '📝 Summary' },
  { id: 'preview', label: '👁 Preview' },
]

const TEMPLATES = [
  { id: 'modern', name: 'Modern', color: '#2563eb' },
  { id: 'professional', name: 'Professional', color: '#1e3a5f' },
  { id: 'creative', name: 'Creative', color: '#7c3aed' },
  { id: 'minimal', name: 'Minimal', color: '#374151' },
]

const ALL_SKILLS = [
  'Python','JavaScript','React','Node.js','SQL','Java','C++',
  'Machine Learning','Data Analysis','UI/UX Design','Project Management',
  'Communication','Financial Modelling','AutoCAD','MATLAB','Research',
  'Leadership','Excel','TypeScript','Docker','AWS','Git','Figma',
  'Photoshop','Marketing','Public Speaking','Critical Thinking','Teamwork',
  'Problem Solving','Microsoft Office','Adobe Creative Suite','Canva',
  'Customer Service','Sales','Accounting','SPSS','R','Tableau',
]

const stream = async (url, body, onChunk, onDone, onError) => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { const t = await res.text(); onError(`API ${res.status}: ${t}`); return }
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
        if (d === '[DONE]') { onDone(full); return }
        try {
          const p = JSON.parse(d)
          if (p.error) { onError(p.error); return }
          if (p.text) { full += p.text; onChunk(full) }
        } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function CVBuilder() {
  const { user, profile } = useUser()
  const [step, setStep] = useState(0)
  const [template, setTemplate] = useState('modern')
  const [toast, setToast] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)
  const [aiGuide, setAiGuide] = useState('')
  const [aiGuideStep, setAiGuideStep] = useState(-1)
  const [atsResult, setAtsResult] = useState(null)
  const [savedDraftId, setSavedDraftId] = useState(null)
  const [showATS, setShowATS] = useState(false)
  const [improvingField, setImprovingField] = useState(null)
  const [jobRecs, setJobRecs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [showJobs, setShowJobs] = useState(false)

  // ── Onboarding chat ─────────────────────────────────────
  const [onboardMsgs, setOnboardMsgs] = useState([{
    role: 'assistant',
    content: "👋 Hi! I'm your AI CV Coach. Before we build your CV, let me get to know you so I can give personalised guidance at every step.\n\nWhat's your name, and are you a student, graduate, or working professional? 😊",
  }])
  const [onboardInput, setOnboardInput] = useState('')
  const [onboardLoading, setOnboardLoading] = useState(false)
  const [onboardDone, setOnboardDone] = useState(false)
  const [onboardStream, setOnboardStream] = useState('')
  const onboardBottom = useRef(null)

  useEffect(() => {
    onboardBottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [onboardMsgs, onboardStream])

  const sendOnboard = async (quick) => {
    const msg = quick || onboardInput.trim()
    if (!msg || onboardLoading) return
    setOnboardInput(''); setOnboardLoading(true); setOnboardStream('')
    const msgs = [...onboardMsgs, { role: 'user', content: msg }]
    setOnboardMsgs(msgs)
    const sys = `You are a warm AI CV coach. Ask ONE question at a time to understand: name and status, field of study or work, country and target job market, top skills, any notable experience.
After 4-6 exchanges say: "Perfect! I have everything I need. Click 'Start Building My CV' when ready! 🚀"
Rules: max 2-3 sentences per reply. Be warm and encouraging. Never ask multiple questions at once.`
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: sys }, ...msgs.map(m => ({ role: m.role, content: m.content }))] }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', fullText = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') {
            const final = [...msgs, { role: 'assistant', content: fullText }]
            setOnboardMsgs(final); setOnboardStream(''); setOnboardLoading(false)
            if (fullText.toLowerCase().includes('start building') || fullText.toLowerCase().includes('click') || final.filter(m => m.role === 'user').length >= 6) {
              setOnboardDone(true)
              const first = msgs.find(m => m.role === 'user')
              if (first && !cv.name) {
                const w = first.content.trim().split(/\s+/)
                if (w.length <= 4 && w.every(x => /^[A-Za-z]/.test(x))) update('name', first.content.trim())
              }
            }
            return
          }
          try { const p = JSON.parse(d); if (p.text) { fullText += p.text; setOnboardStream(fullText) } } catch {}
        }
      }
    } catch {}
    setOnboardLoading(false)
  }

  // ── CV state ────────────────────────────────────────────
  const [cv, setCv] = useState({
    name: '', email: '', phone: '', country: '', city: '',
    nationality: '', gender: '', dateOfBirth: '', idNumber: '',
    linkedin: '', github: '', portfolio: '', twitter: '',
    summary: '',
    education: [{ institution: '', degree: '', field: '', year: '', grade: '', subjects: '', achievements: '', type: 'university' }],
    experience: [{ company: '', role: '', duration: '', location: '', type: 'employment', description: '' }],
    skills: [], languages: ['English'], certifications: '', hobbies: '',
    referencesOption: 'available', referenceList: [],
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }
  const update = (f, v) => setCv(p => ({ ...p, [f]: v }))
  const updateArr = (arr, idx, f, v) => {
    const c = [...cv[arr]]; c[idx] = { ...c[idx], [f]: v }; setCv(p => ({ ...p, [arr]: c }))
  }

  useEffect(() => {
    if (profile) setCv(p => ({
      ...p,
      name: p.name || profile.name || '',
      email: p.email || profile.email || '',
      country: p.country || profile.country || '',
      skills: p.skills?.length ? p.skills : (profile.skills || []),
      linkedin: p.linkedin || profile.linkedin || '',
      github: p.github || profile.github || '',
      portfolio: p.portfolio || profile.portfolio || '',
    }))
  }, [profile])

  useEffect(() => {
    if (!user) return
    const t = setTimeout(saveDraft, 3000)
    return () => clearTimeout(t)
  }, [cv])

  const saveDraft = async () => {
    if (!user) return
    const payload = { user_id: user.id, step, data: cv, updated_at: new Date().toISOString() }
    if (savedDraftId) {
      await supabase.from('cv_drafts').update(payload).eq('id', savedDraftId)
    } else {
      const { data } = await supabase.from('cv_drafts').insert(payload).select().single()
      if (data) setSavedDraftId(data.id)
    }
  }

  const getAIGuide = async (name) => {
    if (aiGuideStep === step) return
    setAiLoading('guide'); setAiGuide(''); setAiGuideStep(step)
    await stream('/api/cv-ai',
      { type: 'guide_step', data: { step: name, field: profile?.field || cv.skills?.[0] || 'general', country: cv.country || 'global', info: cv } },
      c => setAiGuide(c), () => setAiLoading(null), () => setAiLoading(null)
    )
  }

  const improveText = async (section, text, field, idx) => {
    if (!text?.trim()) { showToast('Write something first, then AI will improve it'); return }
    setImprovingField(`${section}_${idx ?? 'x'}`)
    await stream('/api/cv-ai',
      { type: 'improve_text', data: { section, text, field: profile?.field || 'general', country: cv.country, level: 'student/entry-level' } },
      () => {},
      full => {
        if (idx !== null && idx !== undefined) updateArr(section, idx, field, full)
        else update(section, full)
        setImprovingField(null)
        showToast('✅ Text improved!')
      },
      err => { setImprovingField(null); showToast('❌ ' + err) }
    )
  }

  const generateSummary = async () => {
    setAiLoading('summary')
    await stream('/api/cv-ai',
      { type: 'generate_summary', data: { name: cv.name, field: profile?.field || cv.skills?.[0] || 'general', institution: cv.education?.[0]?.institution, year: cv.education?.[0]?.year, skills: cv.skills, country: cv.country, goal: 'internship and career opportunities' } },
      c => update('summary', c), () => setAiLoading(null), () => setAiLoading(null)
    )
  }

  const runATSCheck = async () => {
    setAiLoading('ats'); setShowATS(true); setAtsResult(null); let full = ''
    await stream('/api/cv-ai',
      { type: 'ats_check', data: { cv, country: cv.country, targetRole: `${profile?.field || ''} Intern` } },
      c => { full = c },
      () => {
        try {
          const clean = full.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
          setAtsResult(JSON.parse(clean.slice(s, e + 1)))
        } catch { showToast('❌ Could not parse ATS result') }
        setAiLoading(null)
      },
      () => setAiLoading(null)
    )
  }

  const getJobRecs = async () => {
    setLoadingJobs(true); setShowJobs(true); setJobRecs([])
    let full = ''
    await stream('/api/cv-ai',
      { type: 'job_recommendations', data: { skills: cv.skills, field: profile?.field || cv.education?.[0]?.field || 'general', country: cv.country, education: cv.education?.[0]?.degree, experience: cv.experience?.filter(e => e.company).length, summary: cv.summary } },
      c => { full = c },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
          setJobRecs(JSON.parse(clean.slice(s, e + 1)))
        } catch { showToast('❌ Could not load recommendations') }
        setLoadingJobs(false)
      },
      err => { showToast('❌ ' + err); setLoadingJobs(false) }
    )
  }

  const downloadCV = () => {
    const color = TEMPLATES.find(t => t.id === template)?.color || '#2563eb'
    const refHTML = cv.referencesOption === 'available'
      ? '<p style="color:#555;font-size:10.5pt">Available on request.</p>'
      : (cv.referenceList || []).map(r => `<div style="margin-bottom:10px;font-size:10.5pt"><strong>${r.name || ''}</strong>${r.title ? ` — ${r.title}` : ''}${r.company ? `<br/>${r.company}` : ''}${r.email ? `<br/>✉ ${r.email}` : ''}${r.phone ? ` · 📞 ${r.phone}` : ''}${r.relationship ? `<br/><em style="color:#777">${r.relationship}</em>` : ''}</div>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${cv.name} — CV</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:210mm;margin:0 auto;color:#1a1a1a;font-size:11pt;line-height:1.5;background:#fff}
.hdr{background:${color};color:#fff;padding:28px 32px}
.hdr h1{font-size:24pt;font-weight:800;margin-bottom:4px}
.contact{margin-top:12px;font-size:9.5pt;opacity:.85;display:flex;flex-wrap:wrap;gap:12px}
.body{padding:24px 32px}
.sec{margin-bottom:20px}
.st{font-size:12pt;font-weight:700;color:${color};border-bottom:2px solid ${color};padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em}
.item{margin-bottom:12px}
.ih{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px}
.it{font-weight:700}
.is{color:#555;font-size:10pt}
.idate{color:#777;font-size:9.5pt}
.desc{margin-top:4px;color:#333;white-space:pre-line}
.sg{display:flex;flex-wrap:wrap;gap:6px}
.sk{background:${color}15;color:${color};padding:3px 10px;border-radius:12px;font-size:9.5pt;font-weight:600;border:1px solid ${color}30}
.summ{background:#f8f9fa;padding:12px 16px;border-radius:6px;border-left:4px solid ${color};color:#333;line-height:1.7}
@media print{body{margin:0}@page{margin:10mm}}
</style></head><body>
<div class="hdr">
  <h1>${cv.name || 'Your Name'}</h1>
  <div style="opacity:.9">${cv.education?.[0]?.degree || ''}${cv.education?.[0]?.institution ? ' · ' + cv.education[0].institution : ''}</div>
  <div class="contact">
    ${cv.email ? `<span>✉ ${cv.email}</span>` : ''}
    ${cv.phone ? `<span>📞 ${cv.phone}</span>` : ''}
    ${[cv.city, cv.country].filter(Boolean).length ? `<span>📍 ${[cv.city, cv.country].filter(Boolean).join(', ')}</span>` : ''}
    ${cv.linkedin ? `<span>🔗 ${cv.linkedin}</span>` : ''}
    ${cv.github ? `<span>💻 ${cv.github}</span>` : ''}
    ${cv.portfolio ? `<span>🌐 ${cv.portfolio}</span>` : ''}
  </div>
</div>
<div class="body">
  ${cv.summary ? `<div class="sec"><div class="st">Profile</div><div class="summ">${cv.summary}</div></div>` : ''}
  ${cv.education?.filter(e => e.institution).length ? `
  <div class="sec"><div class="st">Education</div>
    ${cv.education.filter(e => e.institution).map(e => `
    <div class="item">
      <div class="ih">
        <div>
          <div class="it">${e.degree || ''}</div>
          <div class="is">${e.institution}${e.field ? ' · ' + e.field : ''}</div>
          ${e.subjects ? `<div style="font-size:9pt;color:#888">Subjects: ${e.subjects}</div>` : ''}
        </div>
        <div class="idate">${e.year || ''}${e.grade ? ' · ' + e.grade : ''}</div>
      </div>
      ${e.achievements ? `<div class="desc">${e.achievements}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}
  ${cv.experience?.filter(e => e.company).length ? `
  <div class="sec"><div class="st">Experience</div>
    ${cv.experience.filter(e => e.company).map(e => `
    <div class="item">
      <div class="ih">
        <div>
          <div class="it">${e.role || ''}</div>
          <div class="is">${e.company}${e.location ? ' · ' + e.location : ''}</div>
        </div>
        <div class="idate">${e.duration || ''}</div>
      </div>
      ${e.description ? `<div class="desc">${e.description}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}
  ${cv.skills?.length ? `<div class="sec"><div class="st">Skills</div><div class="sg">${cv.skills.map(s => `<span class="sk">${s}</span>`).join('')}</div></div>` : ''}
  ${cv.languages?.filter(Boolean).length > 1 ? `<div class="sec"><div class="st">Languages</div><div class="sg">${cv.languages.filter(Boolean).map(l => `<span class="sk">${l}</span>`).join('')}</div></div>` : ''}
  ${cv.certifications ? `<div class="sec"><div class="st">Certifications</div><div class="desc">${cv.certifications}</div></div>` : ''}
  ${cv.hobbies ? `<div class="sec"><div class="st">Interests</div><div class="desc">${cv.hobbies}</div></div>` : ''}
  <div class="sec"><div class="st">References</div>${refHTML}</div>
</div></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${(cv.name || 'CV').replace(/\s/g, '_')}_CV.html`; a.click()
    showToast('✅ Downloaded! Open in browser → Ctrl+P → Save as PDF')
  }

  useEffect(() => {
    if (step > 0 && step < STEPS.length - 1) { setAiGuide(''); setAiGuideStep(-1) }
  }, [step])

  const color = TEMPLATES.find(t => t.id === template)?.color || '#2563eb'

  // Style helpers
  const I = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const II = { width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }
  const IB = (section, text, field, idx) => (
    <button
      onClick={() => improveText(section, text, field, idx)}
      disabled={!!improvingField || !text?.trim()}
      style={{ marginTop: 6, padding: '5px 12px', borderRadius: 6, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: improvingField || !text?.trim() ? 0.5 : 1 }}
    >
      {improvingField === `${section}_${idx ?? 'x'}` ? '⏳ Improving...' : '✨ AI Improve'}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 90, maxWidth: 980, margin: '0 auto', padding: '90px 20px 60px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📄 AI CV Builder</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Your personal AI coach guides every step — even if you have never written a CV before</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', marginBottom: 28, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} onClick={() => i < step && setStep(i)} style={{ flex: 1, minWidth: 56, textAlign: 'center', cursor: i < step ? 'pointer' : 'default' }}>
              <div style={{ height: 5, marginBottom: 6, background: i <= step ? '#2563eb' : 'var(--border)', borderRadius: i === 0 ? '4px 0 0 4px' : i === STEPS.length - 1 ? '0 4px 4px 0' : 0, transition: 'background 0.3s' }} />
              <div style={{ fontSize: 10, fontWeight: i === step ? 700 : 400, color: i === step ? '#60a5fa' : i < step ? '#10b981' : '#374151' }}>{i < step ? '✓' : s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 26 }}>

            {/* ── STEP 0: ONBOARDING ── */}
            {step === 0 && !onboardDone && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <div style={{ fontSize: 46, marginBottom: 10 }}>🤖</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Chat with your AI CV Coach first</h2>
                  <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>A quick 2-minute chat so your coach can personalise every section with advice tailored to your goals and background.</p>
                </div>

                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                  {onboardMsgs.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, padding: '0 4px' }}>{msg.role === 'user' ? 'You' : '🤖 AI Coach'}</div>
                      <div style={{ padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: msg.role !== 'user' ? '1px solid var(--border)' : 'none', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, maxWidth: '88%', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                  ))}
                  {(onboardLoading || onboardStream) && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>🤖 AI Coach</div>
                      <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, maxWidth: '88%', whiteSpace: 'pre-wrap' }}>
                        {onboardStream || <span style={{ display: 'flex', gap: 5 }}>{[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `bounce 1s ${i * 0.15}s ease-in-out infinite` }} />)}</span>}
                      </div>
                    </div>
                  )}
                  <div ref={onboardBottom} />
                </div>

                {onboardMsgs.filter(m => m.role === 'user').length === 0 && (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                    {["I'm a university student", "I'm a recent graduate", "I've never made a CV", "I'm changing careers"].map(q => (
                      <button key={q} onClick={() => sendOnboard(q)} disabled={onboardLoading} style={{ padding: '6px 12px', borderRadius: 14, fontSize: 12, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', opacity: onboardLoading ? 0.5 : 1 }}>{q}</button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={onboardInput} onChange={e => setOnboardInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !onboardLoading) sendOnboard() }} placeholder="Type your reply..." disabled={onboardLoading} style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.4)', color: '#e2e8f0', outline: 'none' }} />
                  <button onClick={() => sendOnboard()} disabled={!onboardInput.trim() || onboardLoading} style={{ padding: '11px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: !onboardInput.trim() ? 0.5 : 1 }}>Send</button>
                </div>
                <button onClick={() => setOnboardDone(true)} style={{ width: '100%', marginTop: 12, padding: '9px', borderRadius: 9, background: 'transparent', border: '1px solid var(--border)', color: '#374151', fontSize: 12, cursor: 'pointer' }}>Skip intro →</button>
              </div>
            )}

            {/* ── STEP 0: TEMPLATE PICKER ── */}
            {step === 0 && onboardDone && (
              <div>
                <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Let's build your CV!</h2>
                  <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 24px' }}>Choose your CV style to begin:</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
                  {TEMPLATES.map(t => (
                    <div key={t.id} onClick={() => setTemplate(t.id)} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `2px solid ${template === t.id ? t.color : 'var(--border)'}`, transition: 'all 0.2s' }}>
                      <div style={{ height: 46, background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 58, background: 'rgba(255,255,255,0.18)', height: 5, borderRadius: 3 }} /></div>
                      <div style={{ padding: 7, textAlign: 'center', fontSize: 11, fontWeight: 600, color: template === t.id ? t.color : '#64748b' }}>{t.name}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ icon: '🤖', text: 'AI coach explains every section' }, { icon: '✨', text: 'AI rewrites and improves your text' }, { icon: '📊', text: 'ATS score check before applying' }, { icon: '🎯', text: 'Job match recommendations' }].map(f => (
                    <div key={f.text} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                      <span style={{ fontSize: 20 }}>{f.icon}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 1: PERSONAL ── */}
            {step === 1 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>👤 Personal Information</div>
                <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Basic Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { k: 'name', l: 'Full Name *', p: 'Amara Osei', req: true },
                    { k: 'email', l: 'Email *', p: 'amara@email.com', req: true },
                    { k: 'phone', l: 'Phone Number', p: '+234 800 000 0000' },
                    { k: 'city', l: 'City / Town', p: 'Lagos' },
                    { k: 'nationality', l: 'Nationality', p: 'Nigerian, Kenyan...' },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={L}>{f.l}</label>
                      <input value={cv[f.k]} onChange={e => update(f.k, e.target.value)} placeholder={f.p} style={{ ...I, borderColor: f.req && !cv[f.k] ? 'rgba(239,68,68,0.4)' : 'var(--border)' }} />
                    </div>
                  ))}
                  <div>
                    <label style={L}>Country *</label>
                    <select value={cv.country} onChange={e => update('country', e.target.value)} style={I}>
                      <option value="">Select country...</option>
                      {WORLD_REGIONS.map(r => (
                        <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                          {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Online Presence</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { k: 'linkedin', l: 'LinkedIn', p: 'linkedin.com/in/yourname' },
                    { k: 'github', l: 'GitHub', p: 'github.com/yourname' },
                    { k: 'portfolio', l: 'Portfolio Website', p: 'yourname.com' },
                    { k: 'twitter', l: 'Twitter / X', p: '@handle' },
                  ].map(f => (
                    <div key={f.k}><label style={L}>{f.l}</label><input value={cv[f.k]} onChange={e => update(f.k, e.target.value)} placeholder={f.p} style={I} /></div>
                  ))}
                </div>

                <details>
                  <summary style={{ cursor: 'pointer', fontSize: 13, color: '#60a5fa', fontWeight: 600, padding: '6px 0', userSelect: 'none' }}>＋ Date of birth, gender, ID number (only if required in your country)</summary>
                  <div style={{ marginTop: 14, padding: 16, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: '#f59e0b', marginBottom: 14 }}>⚠️ Do NOT include in UK, EU, USA CVs. Only add if required in your country.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { k: 'dateOfBirth', l: 'Date of Birth', p: '01 January 2000' },
                        { k: 'gender', l: 'Gender', p: 'Male / Female / Other' },
                        { k: 'idNumber', l: 'ID / Passport Number', p: 'Only if required' },
                      ].map(f => (
                        <div key={f.k}><label style={{ ...L, color: '#94a3b8' }}>{f.l}</label><input value={cv[f.k]} onChange={e => update(f.k, e.target.value)} placeholder={f.p} style={II} /></div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* ── STEP 2: EDUCATION ── */}
            {step === 2 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>🎓 Education</div>
                {cv.education.map((edu, i) => (
                  <div key={i} style={{ background: 'var(--surface2)', borderRadius: 12, padding: 18, marginBottom: 14, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>🎓 Education #{i + 1}</span>
                      {i > 0 && <button onClick={() => setCv(p => ({ ...p, education: p.education.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={L}>Education Type</label>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {[{ id: 'university', label: '🎓 University' }, { id: 'highschool', label: '🏫 High School / Matric' }, { id: 'vocational', label: '🔧 Vocational / TVET' }, { id: 'other', label: '📋 Other' }].map(t => (
                          <button key={t.id} onClick={() => updateArr('education', i, 'type', t.id)} style={{ padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: edu.type === t.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: edu.type === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${edu.type === t.id ? '#2563eb' : 'var(--border)'}` }}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { k: 'institution', l: edu.type === 'highschool' ? 'School Name *' : 'University / Institution *', p: edu.type === 'highschool' ? 'Prestige High School' : 'University of Lagos' },
                        { k: 'degree', l: edu.type === 'highschool' ? 'Certificate' : 'Degree *', p: edu.type === 'highschool' ? 'National Senior Certificate' : 'BSc Computer Science' },
                        { k: 'field', l: edu.type === 'highschool' ? 'Stream (optional)' : 'Field of Study', p: edu.type === 'highschool' ? 'Science / Commerce / Arts' : 'Computer Science' },
                        { k: 'year', l: 'Year / Graduation', p: '2022 or 2020–2022' },
                        { k: 'grade', l: edu.type === 'highschool' ? 'Final Result / APS Score' : 'Grade / GPA', p: edu.type === 'highschool' ? 'APS 38 or 78%' : '3.8 GPA or First Class' },
                      ].map(f => (
                        <div key={f.k}><label style={L}>{f.l}</label><input value={edu[f.k] || ''} onChange={e => updateArr('education', i, f.k, e.target.value)} placeholder={f.p} style={II} /></div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <label style={L}>{edu.type === 'highschool' ? 'Subjects Taken' : 'Relevant Modules / Subjects'}</label>
                      <input value={edu.subjects || ''} onChange={e => updateArr('education', i, 'subjects', e.target.value)} placeholder={edu.type === 'highschool' ? 'e.g. Mathematics, Physical Sciences, English, Life Sciences, Accounting' : 'e.g. Data Structures, Algorithms, Machine Learning, Databases'} style={II} />
                      <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>{edu.type === 'highschool' ? 'Include all matric/A-level subjects — especially Math, Sciences, Languages' : 'List modules relevant to the jobs you are targeting'}</div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <label style={L}>Achievements / Notable Activities</label>
                      <textarea value={edu.achievements || ''} onChange={e => updateArr('education', i, 'achievements', e.target.value)} rows={3} placeholder={edu.type === 'highschool' ? "e.g. Top of class in Maths, Head Prefect, Science Olympiad" : "e.g. Dean's List 2023, Best Final Year Project Award"} style={{ ...II, resize: 'vertical' }} />
                      {IB('education', edu.achievements, 'achievements', i)}
                    </div>
                  </div>
                ))}
                <button onClick={() => setCv(p => ({ ...p, education: [...p.education, { institution: '', degree: '', field: '', year: '', grade: '', subjects: '', achievements: '', type: 'university' }] }))} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Another Education</button>
              </div>
            )}

            {/* ── STEP 3: EXPERIENCE ── */}
            {step === 3 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 8 }}>💼 Work Experience</div>
                <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#94a3b8' }}>💡 No formal experience? Include internships, volunteer work, freelance projects, academic projects, part-time jobs, or club roles.</div>
                {cv.experience.map((exp, i) => (
                  <div key={i} style={{ background: 'var(--surface2)', borderRadius: 12, padding: 18, marginBottom: 14, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>💼 Experience #{i + 1}</span>
                      {i > 0 && <button onClick={() => setCv(p => ({ ...p, experience: p.experience.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={L}>Type</label>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {[{ id: 'employment', label: '💼 Employment' }, { id: 'internship', label: '🎓 Internship' }, { id: 'volunteer', label: '🤝 Volunteer' }, { id: 'freelance', label: '💻 Freelance' }, { id: 'project', label: '📁 Project' }].map(t => (
                          <button key={t.id} onClick={() => updateArr('experience', i, 'type', t.id)} style={{ padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: exp.type === t.id ? 'rgba(16,185,129,0.15)' : 'var(--surface)', color: exp.type === t.id ? '#10b981' : '#64748b', border: `1px solid ${exp.type === t.id ? '#10b981' : 'var(--border)'}` }}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      {[
                        { k: 'company', l: 'Company / Organisation *', p: 'Flutterwave / Tech Society' },
                        { k: 'role', l: 'Your Role / Title *', p: 'Software Intern / Club President' },
                        { k: 'duration', l: 'Duration', p: 'June 2024 – Aug 2024' },
                        { k: 'location', l: 'Location', p: 'Lagos, Nigeria or Remote' },
                      ].map(f => (
                        <div key={f.k}><label style={L}>{f.l}</label><input value={exp[f.k] || ''} onChange={e => updateArr('experience', i, f.k, e.target.value)} placeholder={f.p} style={II} /></div>
                      ))}
                    </div>
                    <div>
                      <label style={L}>What did you do? (responsibilities + achievements)</label>
                      <textarea value={exp.description || ''} onChange={e => updateArr('experience', i, 'description', e.target.value)} rows={4} placeholder="Start with action verbs: Built, Led, Designed, Managed. Quantify results where possible: 'Increased engagement by 30%'" style={{ ...II, resize: 'vertical' }} />
                      {IB('experience', exp.description, 'description', i)}
                    </div>
                  </div>
                ))}
                <button onClick={() => setCv(p => ({ ...p, experience: [...p.experience, { company: '', role: '', duration: '', location: '', type: 'employment', description: '' }] }))} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Another Experience</button>
              </div>
            )}

            {/* ── STEP 4: SKILLS + REFERENCES ── */}
            {step === 4 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>🛠 Skills, Languages & References</div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 10 }}>Click skills to add them:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {ALL_SKILLS.map(skill => {
                      const active = cv.skills.includes(skill)
                      return <button key={skill} onClick={() => update('skills', active ? cv.skills.filter(s => s !== skill) : [...cv.skills, skill])} style={{ padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.03)', color: active ? '#60a5fa' : '#64748b', border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>{active ? '✓ ' : '+ '}{skill}</button>
                    })}
                  </div>
                  {cv.skills.length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: '#10b981' }}>{cv.skills.length} skills selected ✅</div>}
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={L}>Add a custom skill</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="custom-skill" placeholder="Type a skill and press Add..." style={{ ...I, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v && !cv.skills.includes(v)) { update('skills', [...cv.skills, v]); e.target.value = '' } } }} />
                    <button onClick={() => { const el = document.getElementById('custom-skill'); const v = el?.value.trim(); if (v && !cv.skills.includes(v)) { update('skills', [...cv.skills, v]); el.value = '' } }} style={{ padding: '9px 18px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Add</button>
                  </div>
                </div>
                <div style={{ marginBottom: 18 }}><label style={L}>Languages spoken</label><input value={cv.languages.join(', ')} onChange={e => update('languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="English, French, Swahili, Zulu..." style={I} /></div>
                <div style={{ marginBottom: 18 }}><label style={L}>Certifications (optional)</label><textarea value={cv.certifications} onChange={e => update('certifications', e.target.value)} rows={2} placeholder="e.g. AWS Cloud Practitioner (2024), Google Data Analytics (2023)" style={{ ...I, resize: 'vertical' }} /></div>
                <div style={{ marginBottom: 24 }}><label style={L}>Interests & Hobbies (optional)</label><input value={cv.hobbies} onChange={e => update('hobbies', e.target.value)} placeholder="e.g. Open source, Photography, Football, Reading" style={I} /></div>

                {/* References */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 22 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>📞 References</div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>References are people who can vouch for your work — a lecturer, teacher, or previous employer.</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[{ id: 'available', label: '📋 Available on request' }, { id: 'listed', label: '📇 List referee details' }].map(opt => (
                      <button key={opt.id} onClick={() => update('referencesOption', opt.id)} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: cv.referencesOption === opt.id ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: cv.referencesOption === opt.id ? '#60a5fa' : '#64748b', border: `1px solid ${cv.referencesOption === opt.id ? '#2563eb' : 'var(--border)'}` }}>{opt.label}</button>
                    ))}
                  </div>
                  {cv.referencesOption === 'available' && <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', fontSize: 12, color: '#94a3b8' }}>✅ Your CV will say "References available on request" — standard and widely accepted.</div>}
                  {cv.referencesOption === 'listed' && (
                    <div>
                      {(cv.referenceList.length === 0 ? [{}] : cv.referenceList).map((ref, i) => (
                        <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>📇 Referee #{i + 1}</span>
                            {(i > 0 || cv.referenceList.length > 1) && <button onClick={() => update('referenceList', cv.referenceList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              { k: 'name', l: 'Full Name *', p: 'Dr. Sarah Mensah' },
                              { k: 'title', l: 'Job Title', p: 'Senior Lecturer' },
                              { k: 'company', l: 'Organisation', p: 'University of Ghana' },
                              { k: 'email', l: 'Email', p: 'sarah@ug.edu.gh' },
                              { k: 'phone', l: 'Phone', p: '+233 24 000 0000' },
                              { k: 'relationship', l: 'Relationship', p: 'Academic Supervisor' },
                            ].map(f => (
                              <div key={f.k}>
                                <label style={{ ...L, fontSize: 10 }}>{f.l}</label>
                                <input value={ref[f.k] || ''} onChange={e => { const list = cv.referenceList.length ? [...cv.referenceList] : [{}]; while (list.length <= i) list.push({}); list[i] = { ...list[i], [f.k]: e.target.value }; update('referenceList', list) }} placeholder={f.p} style={{ ...II, fontSize: 12, padding: '7px 10px' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => update('referenceList', [...(cv.referenceList.length ? cv.referenceList : [{}]), {}])} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add Another Referee</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: SUMMARY ── */}
            {step === 5 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 8 }}>📝 Personal Summary</div>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>A 3–4 sentence paragraph at the top of your CV. It is the <strong style={{ color: '#f1f5f9' }}>first thing employers read</strong>.</p>
                <textarea value={cv.summary} onChange={e => update('summary', e.target.value)} rows={6} placeholder="Write about yourself, or click Generate with AI..." style={{ ...I, resize: 'vertical', lineHeight: 1.7, marginBottom: 12, padding: '11px 14px', fontSize: 14 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={generateSummary} disabled={aiLoading === 'summary'} style={{ padding: '10px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: aiLoading === 'summary' ? 0.7 : 1 }}>{aiLoading === 'summary' ? '⏳ Generating...' : '🤖 Generate with AI'}</button>
                  {cv.summary && <button onClick={() => improveText('summary', cv.summary, 'summary', null)} disabled={!!improvingField} style={{ padding: '10px 22px', borderRadius: 9, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: improvingField ? 0.5 : 1 }}>{improvingField?.startsWith('summary') ? '⏳ Improving...' : '✨ AI Improve'}</button>}
                </div>
              </div>
            )}

            {/* ── STEP 6: PREVIEW ── */}
            {step === 6 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>👁 Preview & Download</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={getJobRecs} disabled={loadingJobs} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{loadingJobs ? '⏳ Finding...' : '🎯 Job Matches'}</button>
                    <button onClick={runATSCheck} disabled={aiLoading === 'ats'} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{aiLoading === 'ats' ? '⏳ Checking...' : '📊 ATS Check'}</button>
                    <button onClick={downloadCV} style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>⬇ Download CV</button>
                  </div>
                </div>

                {/* Job Recommendations */}
                {showJobs && (
                  <div style={{ marginBottom: 16, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 14, marginBottom: 12 }}>🎯 Recommended Positions for You</div>
                    {loadingJobs ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '12px 0' }}>⏳ Analysing your CV to find best-fit roles...</div>
                    ) : jobRecs.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 10 }}>
                        {jobRecs.map((job, i) => (
                          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 4 }}>{job.title}</div>
                            <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 6 }}>{job.company_type}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}>{job.reason}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>{job.match}% match</span>
                              {job.salary && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>{job.salary}</span>}
                            </div>
                            {job.how_to_find && <div style={{ fontSize: 10, color: '#374151' }}>🔍 {job.how_to_find}</div>}
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ color: '#64748b', fontSize: 13 }}>No recommendations found. Try adding more skills and experience.</div>}
                  </div>
                )}

                {/* ATS */}
                {showATS && (
                  <div style={{ marginBottom: 16, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                    {atsResult ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>📊 ATS Score: {atsResult.score}/100 ({atsResult.grade})</div>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: atsResult.ready ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: atsResult.ready ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{atsResult.ready ? '✅ Ready to apply' : '⚠️ Needs work'}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}><div style={{ height: '100%', width: `${atsResult.score}%`, background: atsResult.score >= 70 ? '#10b981' : '#f59e0b', borderRadius: 4, transition: 'width 0.6s' }} /></div>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{atsResult.verdict}</p>
                        {atsResult.improvements?.map((imp, i) => (
                          <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>{imp.section}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{imp.fix}</div>
                          </div>
                        ))}
                      </>
                    ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '16px 0' }}>⏳ Running ATS analysis...</div>}
                  </div>
                )}

                {/* CV Preview card */}
                <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ background: color, color: '#fff', padding: '20px 24px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>{cv.name || 'Your Name'}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>{[cv.education?.[0]?.degree, cv.education?.[0]?.institution].filter(Boolean).join(' · ')}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, display: 'flex', flexWrap: 'wrap', gap: 10 }}>{[cv.email, cv.phone, [cv.city, cv.country].filter(Boolean).join(', ')].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}</div>
                  </div>
                  <div style={{ padding: '16px 22px', color: '#1a1a1a', fontSize: 12 }}>
                    {cv.summary && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, borderLeft: `4px solid ${color}`, lineHeight: 1.6 }}>{cv.summary}</div>}
                    {cv.education?.filter(e => e.institution).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 8 }}>Education</div>
                        {cv.education.filter(e => e.institution).map((e, i) => (
                          <div key={i} style={{ marginBottom: 6 }}>
                            <div style={{ fontWeight: 700 }}>{e.degree}{e.institution ? ` — ${e.institution}` : ''}</div>
                            <div style={{ color: '#666' }}>{[e.field, e.year, e.grade].filter(Boolean).join(' · ')}</div>
                            {e.subjects && <div style={{ color: '#888', fontSize: 10 }}>Subjects: {e.subjects}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {cv.skills?.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 8 }}>Skills</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{cv.skills.map(s => <span key={s} style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{s}</span>)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: step === 0 ? '#374151' : '#e2e8f0', fontWeight: 600, fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer' }}>← Back</button>
              {step === 0 && !onboardDone ? <div /> : step < STEPS.length - 1 ? (
                <button onClick={() => { setStep(s => s + 1); setAiGuide(''); setAiGuideStep(-1) }} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{step === 0 ? 'Start Building →' : 'Next →'}</button>
              ) : (
                <button onClick={downloadCV} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>⬇ Download CV</button>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {step > 0 && step < STEPS.length - 1 && (
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(37,99,235,0.08))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>🤖 AI CV Coach</div>
                  <button onClick={() => getAIGuide(STEPS[step].label)} disabled={aiLoading === 'guide'} style={{ padding: '5px 12px', borderRadius: 7, background: aiLoading === 'guide' ? 'var(--surface)' : 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{aiLoading === 'guide' ? '⏳' : aiGuide ? '🔄 Refresh' : '💡 Get Advice'}</button>
                </div>
                {aiGuide ? <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiGuide}</div> : <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Click <strong style={{ color: '#a78bfa' }}>"Get Advice"</strong> for personalised AI guidance with examples for your field and country.</div>}
              </div>
            )}

            {user && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>☁️ Draft auto-saved to your account</div>}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 10 }}>💡 Quick Tips</div>
              {[[1,'Use a professional email. Avoid nicknames.'],[2,'List most recent education first. Include high school if no degree yet.'],[3,'Use action verbs: Built, Led, Designed. Quantify results.'],[4,'Only include skills you can demonstrate in an interview.'],[5,'Tailor your summary to the role you want.'],[6,'Aim for ATS score 70+ before applying.']].find(([s]) => s === step)?.[1] ? (
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>→ {[[1,'Use a professional email. Avoid nicknames.'],[2,'List most recent education first. Include high school if no degree yet.'],[3,'Use action verbs: Built, Led, Designed. Quantify results.'],[4,'Only include skills you can demonstrate in an interview.'],[5,'Tailor your summary to the role you want.'],[6,'Aim for ATS score 70+ before applying.']].find(([s]) => s === step)[1]}</div>
              ) : null}
            </div>

            {step > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>CV Completion</div>
                {[
                  { label: 'Personal Info', done: !!(cv.name && cv.email) },
                  { label: 'Education', done: !!(cv.education?.[0]?.institution) },
                  { label: 'Experience', done: !!(cv.experience?.[0]?.company) },
                  { label: 'Skills (5+)', done: cv.skills.length >= 5 },
                  { label: 'Summary', done: (cv.summary?.length || 0) > 50 },
                  { label: 'References', done: !!cv.referencesOption },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 12 }}>{item.done ? '✅' : '⭕'}</span>
                    <span style={{ fontSize: 12, color: item.done ? '#94a3b8' : '#64748b' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}