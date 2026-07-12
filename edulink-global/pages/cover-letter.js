import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { INTERNSHIPS, WORLD_REGIONS } from '../data/globalData'

const streamRequest = async (url, body, onChunk, onDone, onError) => {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const t = await res.text(); onError(`${res.status}: ${t}`); return }
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
        try { const p = JSON.parse(d); if (p.error) { onError(p.error); return }; if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

const TONES = [
  { id: 'professional', label: '🎩 Professional' },
  { id: 'enthusiastic', label: '⚡ Enthusiastic' },
  { id: 'concise', label: '✂️ Concise' },
  { id: 'storytelling', label: '📖 Storytelling' },
]

const SIGNOFFS = [
  'Yours sincerely,',
  'Yours faithfully,',
  'Kind regards,',
  'Best regards,',
  'Warm regards,',
  'Respectfully yours,',
]

export default function CoverLetter() {
  const { user, profile } = useUser()
  const [letters, setLetters] = useState([])
  const [generating, setGenerating] = useState(false)
  const [improving, setImproving] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('list')
  const [tone, setTone] = useState('professional')
  const [signOff, setSignOff] = useState('Yours sincerely,')

  // Address helper
  const [showAddrHelper, setShowAddrHelper] = useState(false)
  const [addrQuery, setAddrQuery] = useState('')
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrResult, setAddrResult] = useState(null)
  const [addrError, setAddrError] = useState('')

  const [form, setForm] = useState({
    // Sender
    senderName: '', senderLine1: '', senderLine2: '',
    senderCity: '', senderPostal: '', senderCountry: '',
    senderEmail: '', senderPhone: '',
    // Recipient
    recipientName: '', recipientTitle: '',
    recipientCompany: '', recipientLine1: '', recipientCity: '',
    // Letter
    company: '', role: '', subjectLine: '',
    description: '', field: '', education: '',
    bio: '', skills: '', whyCompany: '',
  })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (user) fetchLetters() }, [user])
  useEffect(() => {
    if (profile) setForm(p => ({
      ...p,
      senderName: p.senderName || profile.name || '',
      senderEmail: p.senderEmail || profile.email || '',
      senderCountry: p.senderCountry || profile.country || '',
      field: p.field || profile.field || '',
      bio: p.bio || profile.bio || '',
      skills: p.skills || profile.skills?.join(', ') || '',
    }))
  }, [profile])

  const fetchLetters = async () => {
    const { data } = await supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setLetters(data || [])
  }

  const fillFromListing = (id) => {
    const job = INTERNSHIPS.find(j => j.id === parseInt(id))
    if (!job) return
    setForm(p => ({
      ...p,
      company: job.company,
      role: job.title,
      description: job.description || '',
      recipientCompany: job.company,
      subjectLine: `Application for ${job.title} — ${job.company}`,
    }))
  }

  // Real map address search
  const searchAddress = async () => {
    if (!addrQuery.trim()) { showToast('Describe your location first'); return }
    setAddrLoading(true); setAddrResult(null); setAddrError('')
    try {
      const res = await fetch('/api/address-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hints: addrQuery, country: form.senderCountry }),
      })
      const data = await res.json()
      if (!data.found) {
        setAddrError(data.message || 'Location not found. Try adding more detail like your city or neighbourhood.')
      } else {
        setAddrResult(data)
      }
    } catch (e) {
      setAddrError('Search failed: ' + e.message)
    }
    setAddrLoading(false)
  }

  const applyAddress = (result) => {
    const lines = result.formatted_address || []
    setForm(p => ({
      ...p,
      senderLine1: lines[0] || '',
      senderLine2: lines[1] || '',
      senderCity: lines[2] || '',
      senderPostal: lines[3] || '',
      senderCountry: lines[lines.length - 1] || p.senderCountry,
    }))
    setShowAddrHelper(false)
    setAddrResult(null)
    setAddrQuery('')
    showToast('✅ Address applied from map!')
  }

  const generate = async () => {
    if (!form.company || !form.role) { showToast('Enter company and role first'); return }
    setGenerating(true); setStreamText(''); setView('editor')

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const senderBlock = [
      form.senderName,
      form.senderLine1,
      form.senderLine2,
      form.senderCity && form.senderPostal ? `${form.senderCity}, ${form.senderPostal}` : (form.senderCity || form.senderPostal),
      form.senderCountry,
      form.senderEmail,
      form.senderPhone,
    ].filter(Boolean).join('\n')

    const recipientBlock = [
      form.recipientName && form.recipientTitle ? `${form.recipientTitle} ${form.recipientName}` : (form.recipientName || form.recipientTitle || 'The Hiring Manager'),
      form.recipientCompany || form.company,
      form.recipientLine1,
      form.recipientCity,
    ].filter(Boolean).join('\n')

    const prompt = `Write a complete, professionally formatted cover letter. Format it EXACTLY like a real postal cover letter with all address blocks, subject line, salutation, body, and sign-off.

SENDER ADDRESS BLOCK:
${senderBlock || '[Sender address]'}

DATE: ${today}

RECIPIENT ADDRESS BLOCK:
${recipientBlock}

SUBJECT LINE: ${form.subjectLine || `Application for ${form.role} — ${form.company}`}

DETAILS:
- Role applying for: ${form.role} at ${form.company}
- Field: ${form.field || profile?.field || 'general'}
- Education: ${form.education || `${profile?.field || ''} student`}
- Skills: ${form.skills || profile?.skills?.join(', ') || ''}
- Why this company: ${form.whyCompany || ''}
- Background: ${form.bio || profile?.bio || ''}
${form.description ? `- Job description: ${form.description}` : ''}
- Tone: ${tone}
- Sign-off to use: ${signOff}

FORMAT THE LETTER EXACTLY LIKE THIS — include every block:

${form.senderName || '[Your Name]'}
${senderBlock.split('\n').slice(1).join('\n') || '[Your Address]'}

${today}

${recipientBlock}

Subject: ${form.subjectLine || `Application for ${form.role} — ${form.company}`}

Dear ${form.recipientName ? (form.recipientTitle ? `${form.recipientTitle} ${form.recipientName.split(' ').pop()}` : form.recipientName) : 'Hiring Manager'},

[OPENING PARAGRAPH — compelling hook, name the specific role and why it excites you]

[SECOND PARAGRAPH — your most relevant skills, education, and achievements]

[THIRD PARAGRAPH — why THIS specific company, show you have researched them]

[CLOSING PARAGRAPH — call to action, express eagerness for interview]

${signOff}

${form.senderName || '[Your Full Name]'}

Return ONLY the complete letter text in this exact format. Every block must appear.`

    await streamRequest(
      '/api/cv-ai',
      {
        type: 'cover_quick',
        data: {
          name: form.senderName || profile?.name,
          company: form.company, role: form.role,
          field: form.field || profile?.field || 'general',
          country: form.senderCountry || profile?.country || 'global',
          skills: form.skills ? form.skills.split(',').map(s => s.trim()) : (profile?.skills || []),
          education: form.education || `${profile?.field || ''} student`,
          bio: form.bio || profile?.bio || '',
          jobDescription: form.description,
          tone, signOff, prompt,
        },
      },
      chunk => setStreamText(chunk),
      async full => {
        setSelected({ company: form.company, role: form.role, content: full })
        setStreamText('')
        if (user) {
          const { data: saved } = await supabase.from('cover_letters').insert({ user_id: user.id, company: form.company, role: form.role, content: full }).select().single()
          if (saved) { setSelected(saved); fetchLetters() }
        }
        setGenerating(false)
        showToast('✅ Cover letter ready!')
      },
      err => { showToast('❌ ' + err); setGenerating(false) }
    )
  }

  const improve = async () => {
    if (!selected?.content) return
    setImproving(true)
    await streamRequest(
      '/api/cv-ai',
      { type: 'cover_letter_improve', data: { original: selected.content, company: selected.company || form.company, role: selected.role || form.role, name: form.senderName || profile?.name, field: form.field || profile?.field, country: form.senderCountry || profile?.country } },
      chunk => setStreamText(chunk),
      async full => {
        setSelected(p => ({ ...p, content: full }))
        setStreamText('')
        if (selected?.id) { await supabase.from('cover_letters').update({ content: full }).eq('id', selected.id); fetchLetters() }
        setImproving(false)
        showToast('✅ Letter improved!')
      },
      err => { showToast('❌ ' + err); setImproving(false) }
    )
  }

  const copy = () => { navigator.clipboard.writeText(selected?.content || streamText); showToast('📋 Copied to clipboard!') }

  const downloadLetter = () => {
    const content = selected?.content || streamText
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cover Letter</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:60px auto;color:#1a1a1a;font-size:12pt;line-height:1.9;white-space:pre-wrap}@media print{body{margin:20mm}}</style>
</head><body>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Cover_Letter_${form.company || 'Application'}.html`; a.click()
    showToast('✅ Downloaded! Open in browser → Print → Save as PDF')
  }

  const deleteLetter = async (id) => {
    await supabase.from('cover_letters').delete().eq('id', id)
    if (selected?.id === id) { setSelected(null); setView('list') }
    fetchLetters(); showToast('Deleted')
  }

  const I = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 90, maxWidth: 1000, margin: '0 auto', padding: '90px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📝 Cover Letter Generator</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>AI writes complete, properly formatted cover letters with addresses, subject line, and sign-off</p>
          </div>
          <button onClick={() => { setView('generate'); setSelected(null); setStreamText('') }} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ New Letter</button>
        </div>

        {/* LIST */}
        {view === 'list' && (
          letters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📝</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>No cover letters yet</div>
              <button onClick={() => setView('generate')} style={{ padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 12 }}>Generate First Letter</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
              {letters.map(letter => (
                <div key={letter.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 3 }}>{letter.role}</div>
                  <div style={{ color: '#60a5fa', fontSize: 13, marginBottom: 8 }}>@ {letter.company}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{letter.content?.slice(0, 120)}...</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>{new Date(letter.created_at).toLocaleDateString()}</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => { setSelected(letter); setForm(p => ({ ...p, company: letter.company, role: letter.role })); setView('editor') }} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View & Edit</button>
                    <button onClick={() => { navigator.clipboard.writeText(letter.content); showToast('📋 Copied!') }} style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Copy</button>
                    <button onClick={() => deleteLetter(letter.id)} style={{ padding: '7px 10px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* GENERATE FORM */}
        {view === 'generate' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20, alignItems: 'start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>

              {/* Quick fill */}
              <div style={{ marginBottom: 20 }}>
                <label style={L}>Quick Fill from EduLink Listing</label>
                <select onChange={e => fillFromListing(e.target.value)} style={I}>
                  <option value="">Select a listing to auto-fill...</option>
                  {INTERNSHIPS.map(j => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                </select>
              </div>

              {/* SENDER DETAILS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>👤 Your Details (Sender)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { k: 'senderName', l: 'Your Full Name *', p: 'Amara Osei' },
                    { k: 'senderEmail', l: 'Your Email', p: 'amara@email.com' },
                    { k: 'senderPhone', l: 'Your Phone', p: '+234 800 000 0000' },
                  ].map(f => <div key={f.k}><label style={L}>{f.l}</label><input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={I} /></div>)}
                  <div>
                    <label style={L}>Country</label>
                    <select value={form.senderCountry} onChange={e => setF('senderCountry', e.target.value)} style={I}>
                      <option value="">Select country...</option>
                      {WORLD_REGIONS.map(r => <optgroup key={r.id} label={`${r.flag} ${r.name}`}>{r.countries.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>)}
                    </select>
                  </div>
                </div>

                {/* Address section */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...L, margin: 0 }}>Your Address</label>
                    <button onClick={() => setShowAddrHelper(!showAddrHelper)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 600, cursor: 'pointer' }}>
                      🗺️ Find on Map
                    </button>
                  </div>

                  {/* Map address helper */}
                  {showAddrHelper && (
                    <div style={{ marginBottom: 14, padding: 16, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 13, marginBottom: 6 }}>🗺️ AI + Map Address Finder</div>
                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.6 }}>Describe your location — your neighbourhood, nearby landmark, street name, or general area. We'll search the real map and return your formatted address.</p>
                      <textarea value={addrQuery} onChange={e => setAddrQuery(e.target.value)} rows={2} placeholder="e.g. near Lekki Phase 1 mall Lagos Nigeria... or Moi Avenue Nairobi Kenya... or Sandton City Johannesburg..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', marginBottom: 10 }} />
                      <button onClick={searchAddress} disabled={addrLoading || !addrQuery.trim()} style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: addrLoading ? 0.7 : 1 }}>
                        {addrLoading ? '⏳ Searching map...' : '🔍 Search Real Map'}
                      </button>

                      {addrError && (
                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>{addrError}</div>
                      )}

                      {addrResult && (
                        <div style={{ marginTop: 12, padding: 14, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)' }}>
                          <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 8 }}>📍 Found on Map</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Source: {addrResult.display_name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.9, marginBottom: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 7, whiteSpace: 'pre-wrap' }}>
                            {addrResult.full_address_string}
                          </div>
                          {addrResult.format_guide && (
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, padding: '6px 10px', background: 'rgba(96,165,250,0.08)', borderRadius: 6 }}>ℹ️ {addrResult.format_guide}</div>
                          )}
                          {addrResult.map_link && (
                            <a href={addrResult.map_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#60a5fa', display: 'block', marginBottom: 8 }}>🗺️ View on OpenStreetMap</a>
                          )}
                          <button onClick={() => applyAddress(addrResult)} style={{ padding: '8px 18px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Use This Address</button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { k: 'senderLine1', l: 'Address Line 1', p: '123 Main Street' },
                      { k: 'senderLine2', l: 'Address Line 2 (optional)', p: 'Lekki Phase 1' },
                      { k: 'senderCity', l: 'City / Town', p: 'Lagos' },
                      { k: 'senderPostal', l: 'Postal Code', p: '100001' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ ...L, fontSize: 10 }}>{f.l}</label>
                        <input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={{ ...I, padding: '8px 11px', fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RECIPIENT */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>🏢 Recipient Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { k: 'recipientName', l: 'Hiring Manager Name (if known)', p: 'Sarah Johnson' },
                    { k: 'recipientTitle', l: 'Their Title', p: 'Recruitment Manager' },
                    { k: 'company', l: 'Company Name *', p: 'Google' },
                    { k: 'role', l: 'Role Applying For *', p: 'Software Engineering Intern' },
                    { k: 'recipientLine1', l: 'Company Address', p: '1 Infinite Loop, Cupertino' },
                    { k: 'recipientCity', l: 'Company City / Country', p: 'USA' },
                  ].map(f => <div key={f.k}><label style={L}>{f.l}</label><input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={I} /></div>)}
                </div>
              </div>

              {/* SUBJECT LINE */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 10 }}>📌 Subject Line</div>
                <input value={form.subjectLine} onChange={e => setF('subjectLine', e.target.value)} placeholder={`Application for ${form.role || 'Position'} — ${form.company || 'Company'}`} style={I} />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Leave blank to auto-generate from role + company</div>
              </div>

              {/* YOUR BACKGROUND */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>✍️ Your Background</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[
                    { k: 'field', l: 'Field of Study', p: 'Computer Science' },
                    { k: 'education', l: 'Education', p: 'BSc CS, University of Lagos, 2025' },
                  ].map(f => <div key={f.k}><label style={L}>{f.l}</label><input value={form[f.k]} onChange={e => setF(f.k, e.target.value)} placeholder={f.p} style={I} /></div>)}
                </div>
                <div style={{ marginBottom: 12 }}><label style={L}>Your Key Skills</label><input value={form.skills} onChange={e => setF('skills', e.target.value)} placeholder="Python, React, Leadership, Data Analysis..." style={I} /></div>
                <div style={{ marginBottom: 12 }}><label style={L}>Why this company? (makes it personal)</label><input value={form.whyCompany} onChange={e => setF('whyCompany', e.target.value)} placeholder="e.g. I admire their impact on African fintech..." style={I} /></div>
                <div><label style={L}>Job Description (paste for best results)</label><textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3} placeholder="Paste the job description here..." style={{ ...I, resize: 'vertical' }} /></div>
              </div>

              {/* TONE + SIGN-OFF */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>🎨 Style & Sign-off</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={L}>Tone</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TONES.map(t => <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tone === t.id ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: tone === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${tone === t.id ? '#2563eb' : 'var(--border)'}` }}>{t.label}</button>)}
                  </div>
                </div>
                <div>
                  <label style={L}>Sign-off</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SIGNOFFS.map(s => <button key={s} onClick={() => setSignOff(s)} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: signOff === s ? 'rgba(16,185,129,0.12)' : 'var(--surface2)', color: signOff === s ? '#10b981' : '#64748b', border: `1px solid ${signOff === s ? '#10b981' : 'var(--border)'}`, fontWeight: signOff === s ? 700 : 400 }}>{s}</button>)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setView('list')} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={generate} disabled={generating || !form.company || !form.role} style={{ flex: 2, padding: '12px', borderRadius: 10, background: generating ? 'var(--surface2)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: generating ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
                  {generating ? '⏳ Generating...' : '🤖 Generate Cover Letter'}
                </button>
              </div>
            </div>

            {/* Tips sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>💡 Tips for a Great Letter</div>
                {[
                  'Use 🗺️ Find on Map to get your real formatted address from OpenStreetMap',
                  'Use "Yours sincerely" if you know the hiring manager\'s name; "Yours faithfully" if not',
                  'Paste the actual job description for a perfectly tailored letter',
                  '"Why this company?" is what makes your letter stand out from hundreds of others',
                  'The AI Improve button can significantly strengthen any generated letter',
                  'Download as PDF — employers expect PDF cover letters',
                ].map((tip, i) => <div key={i} style={{ fontSize: 12, color: '#94a3b8', padding: '7px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', lineHeight: 1.6 }}>→ {tip}</div>)}
              </div>
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>📄 Letter Structure</div>
                {['📍 Your address + contact details','📅 Date','🏢 Recipient address','📌 Subject line','👋 Dear [Name / Hiring Manager]','🎯 Opening — name the role, hook them','💼 Your skills + relevant experience','❤️ Why this company specifically','📞 Confident close + call to action',`✍️ ${signOff} [Your Name]`].map((s, i) => <div key={i} style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.9 }}>{s}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === 'editor' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18 }}>{selected?.role || form.role}</div>
                <div style={{ color: '#60a5fa', fontSize: 14 }}>@ {selected?.company || form.company}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={improve} disabled={improving || generating} style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: improving ? 0.6 : 1 }}>{improving ? '⏳ Improving...' : '✨ AI Improve'}</button>
                <button onClick={copy} style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📋 Copy</button>
                <button onClick={downloadLetter} style={{ padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>⬇ Download PDF</button>
                <button onClick={() => setView('list')} style={{ padding: '9px 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>← Back</button>
              </div>
            </div>

            {/* Letter preview — white paper style */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '48px 56px', color: '#1a1a1a', fontSize: 13, lineHeight: 2, minHeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', fontFamily: '"Segoe UI", Arial, sans-serif', position: 'relative' }}>
              {streamText || selected?.content || <span style={{ color: '#aaa' }}>Generating your cover letter...</span>}
              {(generating || improving) && <span style={{ display: 'inline-block', width: 2, height: 18, background: '#2563eb', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
            </div>

            {(selected?.content || streamText) && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                {(selected?.content || streamText).split(/\s+/).filter(Boolean).length} words
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes blink{50%{opacity:0}}`}</style>
    </div>
  )
}