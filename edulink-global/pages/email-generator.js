import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const EMAIL_TYPES = [
  { id: 'cold_outreach', label: '📨 Cold Outreach', desc: 'Contact someone at a company you want to work at', icon: '📨' },
  { id: 'follow_up', label: '🔁 Follow Up', desc: 'Chase an application or interview you sent', icon: '🔁' },
  { id: 'thank_you', label: '🙏 Thank You', desc: 'Post-interview thank you email', icon: '🙏' },
  { id: 'networking', label: '🤝 Networking', desc: 'Request an informational interview or advice', icon: '🤝' },
  { id: 'referral_request', label: '⭐ Referral Request', desc: 'Ask someone to refer you for a role', icon: '⭐' },
  { id: 'rejection_reply', label: '💪 Reply to Rejection', desc: 'Professional response to a rejection email', icon: '💪' },
  { id: 'internship_inquiry', label: '🎓 Internship Inquiry', desc: 'Ask about internship openings proactively', icon: '🎓' },
  { id: 'linkedin_message', label: '🔵 LinkedIn Message', desc: 'Short connection message or DM', icon: '🔵' },
]

const stream = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
        if (d === '[DONE]') { onDone(full); return }
        try { const p = JSON.parse(d); if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function EmailGenerator() {
  const { user, profile } = useUser()
  const [selectedType, setSelectedType] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [saved, setSaved] = useState([])
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('types')
  const [form, setForm] = useState({ recipientName: '', recipientTitle: '', company: '', role: '', context: '', yourName: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchSaved() }, [user])
  useEffect(() => { if (profile) setForm(p => ({ ...p, yourName: p.yourName || profile.name || '' })) }, [profile])

  const fetchSaved = async () => {
    const { data } = await supabase.from('email_drafts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setSaved(data || [])
  }

  const PROMPTS = {
    cold_outreach: `Write a professional cold outreach email from ${form.yourName || 'a student'} to ${form.recipientName || 'a professional'} (${form.recipientTitle || 'employee'}) at ${form.company}.
Goal: Express interest in opportunities at ${form.company} and request a brief chat.
Context: ${form.context || 'Student interested in the company'}
Field: ${profile?.field || 'general'}
Rules: Under 150 words. Subject line included. Specific to ${form.company}. Personal and genuine, not generic.`,

    follow_up: `Write a follow-up email from ${form.yourName} following up on a ${form.role || 'job/internship'} application or interview at ${form.company} sent ${form.context || '1-2 weeks ago'}.
Rules: Under 120 words. Polite, confident, not desperate. Restate interest. Ask for update.`,

    thank_you: `Write a post-interview thank you email from ${form.yourName} to ${form.recipientName || 'the interviewer'} at ${form.company} for a ${form.role} interview.
Context: ${form.context || 'General interview discussion'}
Rules: Under 150 words. Warm and genuine. Reference something specific from the interview. Restate enthusiasm.`,

    networking: `Write a networking email from ${form.yourName} (${profile?.field || 'student'}) to ${form.recipientName} (${form.recipientTitle}) requesting a 20-minute informational interview about their career at ${form.company}.
Context: ${form.context || 'Admires their career path'}
Rules: Under 120 words. Flattering but authentic. Clear ask. Easy to say yes to.`,

    referral_request: `Write an email from ${form.yourName} asking ${form.recipientName} to refer them for a ${form.role} position at ${form.company}.
Context: ${form.context || 'Know each other professionally'}
Rules: Under 150 words. Specific role. Attach CV mention. Make it easy for them. Not pushy.`,

    rejection_reply: `Write a professional, gracious reply from ${form.yourName} responding to a rejection from ${form.company} for a ${form.role} position.
Rules: Under 100 words. Thank them. Ask for feedback. Keep door open for future. Impressive — turn rejection into opportunity.`,

    internship_inquiry: `Write a proactive internship inquiry email from ${form.yourName} to ${form.company} asking about ${new Date().getFullYear()} internship opportunities in ${profile?.field || form.context || 'their field'}.
Rules: Under 150 words. Show knowledge of company. Specific about what you offer. Clear call to action. Attach CV mention.`,

    linkedin_message: `Write a short LinkedIn connection message or DM from ${form.yourName} to ${form.recipientName} (${form.recipientTitle}) at ${form.company}.
Purpose: ${form.context || 'Connect professionally and express interest in their work'}
Rules: Under 60 words for message. Under 300 chars for connection note. Genuine, specific, not salesy.`,
  }

  const generate = async () => {
    if (!selectedType) return
    setGenerating(true); setGenerated('')
    await stream(
      { messages: [{ role: 'user', content: `${PROMPTS[selectedType]}\n\nReturn the email with a clear Subject line at the top, then the email body. Format properly.` }] },
      chunk => setGenerated(chunk),
      async full => {
        setGenerated(full); setGenerating(false)
        if (user) {
          const subjectMatch = full.match(/Subject:\s*(.+)/i)
          await supabase.from('email_drafts').insert({ user_id: user.id, type: selectedType, subject: subjectMatch?.[1] || '', company: form.company, content: full })
          fetchSaved()
        }
        showToast('✅ Email generated!')
      },
      err => { showToast('❌ ' + err); setGenerating(false) }
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>✉️ Professional Email Generator</h1>
            <p style={{ color: '#64748b' }}>AI writes perfect career emails for every situation. Never stare at a blank screen again.</p>
          </div>
          {saved.length > 0 && <button onClick={() => setView(view === 'saved' ? 'types' : 'saved')} style={{ padding: '9px 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📁 Saved ({saved.length})</button>}
        </div>

        {view === 'saved' ? (
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>Saved Emails</div>
            {saved.map(e => (
              <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{EMAIL_TYPES.find(t => t.id === e.type)?.label || e.type}</div>
                    {e.company && <div style={{ fontSize: 12, color: '#60a5fa' }}>@ {e.company}</div>}
                    {e.subject && <div style={{ fontSize: 12, color: '#64748b' }}>Subject: {e.subject}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { navigator.clipboard.writeText(e.content); showToast('📋 Copied!') }} style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 11, cursor: 'pointer' }}>Copy</button>
                    <button onClick={async () => { await supabase.from('email_drafts').delete().eq('id', e.id); fetchSaved(); showToast('Deleted') }} style={{ padding: '5px 10px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden' }}>{e.content?.slice(0, 300)}...</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
            {/* Email type picker */}
            <div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>Choose Email Type</div>
              {EMAIL_TYPES.map(type => (
                <div key={type.id} onClick={() => { setSelectedType(type.id); setGenerated('') }} style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', background: selectedType === type.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', border: `1px solid ${selectedType === type.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                  <div style={{ fontWeight: 600, color: selectedType === type.id ? '#60a5fa' : '#f1f5f9', fontSize: 13 }}>{type.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{type.desc}</div>
                </div>
              ))}
            </div>

            {/* Form + output */}
            <div>
              {selectedType && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>
                    {EMAIL_TYPES.find(t => t.id === selectedType)?.icon} {EMAIL_TYPES.find(t => t.id === selectedType)?.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {[
                      { k: 'yourName', l: 'Your Name', p: profile?.name || 'Your full name' },
                      { k: 'recipientName', l: 'Recipient Name', p: 'Sarah Johnson' },
                      { k: 'recipientTitle', l: 'Their Title', p: 'Engineering Manager' },
                      { k: 'company', l: 'Company', p: 'Google / Flutterwave' },
                      { k: 'role', l: 'Role / Position', p: 'Software Engineer Intern' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.l}</label>
                        <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Additional Context</label>
                      <input value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} placeholder="Any extra details to personalise..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    </div>
                  </div>
                  <button onClick={generate} disabled={generating} style={{ padding: '11px 28px', borderRadius: 10, background: generating ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: generating ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: generating ? 'not-allowed' : 'pointer' }}>
                    {generating ? '⏳ Writing email...' : '✉️ Generate Email'}
                  </button>
                </div>
              )}

              {/* Generated email */}
              {(generated || generating) && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '32px 40px', color: '#1a1a1a', fontSize: 13, lineHeight: 1.9, minHeight: 200, whiteSpace: 'pre-wrap', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', fontFamily: '"Segoe UI", Arial, sans-serif', position: 'relative' }}>
                  {generated}
                  {generating && <span style={{ display: 'inline-block', width: 2, height: 16, background: '#2563eb', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
                </div>
              )}

              {generated && !generating && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={() => { navigator.clipboard.writeText(generated); showToast('📋 Copied!') }} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📋 Copy Email</button>
                  <button onClick={generate} style={{ padding: '9px 20px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>🔄 Regenerate</button>
                </div>
              )}

              {!selectedType && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>✉️</div>
                  <div>Select an email type on the left to get started</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes blink{50%{opacity:0}}`}</style>
    </div>
  )
}