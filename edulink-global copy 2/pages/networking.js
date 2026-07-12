import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

export default function Networking() {
  const { user } = useUser()
  const [contacts, setContacts] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('contacts')
  const [form, setForm] = useState({ name: '', title: '', company: '', email: '', linkedin: '', how_met: '', last_contact: new Date().toISOString().slice(0, 10), notes: '', follow_up_date: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }
  useEffect(() => { if (user) fetchContacts() }, [user])

  const fetchContacts = async () => {
    const { data } = await supabase.from('networking_contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setContacts(data || [])
  }

  const saveContact = async () => {
    if (!form.name.trim()) { showToast('Enter contact name'); return }
    if (!user) { showToast('Sign in to save contacts'); return }
    await supabase.from('networking_contacts').insert({ user_id: user.id, ...form })
    setForm({ name: '', title: '', company: '', email: '', linkedin: '', how_met: '', last_contact: new Date().toISOString().slice(0, 10), notes: '', follow_up_date: '' })
    setShowNew(false); fetchContacts(); showToast('✅ Contact added!')
  }

  const deleteContact = async (id) => {
    await supabase.from('networking_contacts').delete().eq('id', id)
    fetchContacts(); showToast('Removed')
  }

  const markContacted = async (id) => {
    await supabase.from('networking_contacts').update({ last_contact: new Date().toISOString().slice(0, 10) }).eq('id', id)
    fetchContacts(); showToast('✅ Marked as contacted today!')
  }

  const followUpDue = contacts.filter(c => c.follow_up_date && new Date(c.follow_up_date) <= new Date())
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()))

  const avatarLetter = (name) => name?.[0]?.toUpperCase() || '?'
  const avatarColor = (name) => { const colors = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444']; return colors[name?.charCodeAt(0) % colors.length] || '#2563eb' }

  const I = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🤝 Networking Hub</h1>
            <p style={{ color: '#64748b' }}>Track your professional contacts, follow-ups, and build your network systematically</p>
          </div>
          {tab === 'contacts' && <button onClick={() => setShowNew(!showNew)} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add Contact</button>}
        </div>

        {/* Follow-up alerts */}
        {followUpDue.length > 0 && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 14, marginBottom: 8 }}>⏰ {followUpDue.length} Follow-up{followUpDue.length > 1 ? 's' : ''} Due</div>
            {followUpDue.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                <span style={{ fontSize: 13, color: '#fca5a5' }}>{c.name} @ {c.company}</span>
                <button onClick={() => markContacted(c.id)} style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Contacted</button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ id: 'contacts', l: `👥 All Contacts (${contacts.length})` }, { id: 'tips', l: '💡 Networking Tips' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: tab === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${tab === t.id ? '#2563eb' : 'var(--border)'}` }}>{t.l}</button>
          ))}
        </div>

        {tab === 'contacts' && (
          <div>
            {/* New contact form */}
            {showNew && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>Add Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    { k: 'name', l: 'Full Name *', p: 'Sarah Johnson' },
                    { k: 'title', l: 'Job Title', p: 'Engineering Manager' },
                    { k: 'company', l: 'Company', p: 'Google' },
                    { k: 'email', l: 'Email Address', p: 'sarah@company.com' },
                    { k: 'linkedin', l: 'LinkedIn URL', p: 'linkedin.com/in/sarah' },
                    { k: 'how_met', l: 'How did you meet?', p: 'Career fair, LinkedIn, mutual contact...' },
                  ].map(f => (
                    <div key={f.k}><label style={L}>{f.l}</label><input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={I} /></div>
                  ))}
                  <div>
                    <label style={L}>Last Contact Date</label>
                    <input type="date" value={form.last_contact} onChange={e => setForm(p => ({ ...p, last_contact: e.target.value }))} style={I} />
                  </div>
                  <div>
                    <label style={L}>Follow-up Date</label>
                    <input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} style={I} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={L}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Conversation topics, interests, things to follow up on..." style={{ ...I, resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveContact} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Contact 🤝</button>
                </div>
              </div>
            )}

            {contacts.length > 0 && (
              <input type="text" placeholder="🔍 Search contacts..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 16 }} />
            )}

            {filtered.length === 0 && !showNew ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🤝</div>
                <div>No contacts yet. Add people you meet at events, LinkedIn, career fairs...</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {filtered.map(contact => {
                  const daysSince = contact.last_contact ? Math.floor((new Date() - new Date(contact.last_contact)) / 86400000) : null
                  const needsTouch = daysSince !== null && daysSince > 30
                  return (
                    <div key={contact.id} style={{ background: 'var(--surface)', border: `1px solid ${needsTouch ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: 18 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(contact.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{avatarLetter(contact.name)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{contact.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{contact.title}{contact.title && contact.company ? ' · ' : ''}{contact.company}</div>
                        </div>
                      </div>
                      {contact.how_met && <div style={{ fontSize: 11, color: '#374151', marginBottom: 8 }}>Met via: {contact.how_met}</div>}
                      {contact.notes && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 }}>{contact.notes}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: needsTouch ? '#f59e0b' : '#374151' }}>
                          {daysSince === 0 ? 'Contacted today' : daysSince === 1 ? '1 day ago' : daysSince !== null ? `${daysSince} days ago` : 'Never contacted'}
                        </span>
                        {needsTouch && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700 }}>Reach out!</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {contact.linkedin && <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '6px', borderRadius: 7, background: 'rgba(0,119,181,0.12)', border: '1px solid rgba(0,119,181,0.2)', color: '#0077b5', fontSize: 11, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>LinkedIn</a>}
                        {contact.email && <a href={`mailto:${contact.email}`} style={{ flex: 1, padding: '6px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Email</a>}
                        <button onClick={() => markContacted(contact.id)} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 11, cursor: 'pointer' }}>✓</button>
                        <button onClick={() => deleteContact(contact.id)} style={{ padding: '6px 8px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'tips' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[
              { title: '🎯 The 5-Minute Rule', content: 'After meeting someone new, send a LinkedIn request or email within 5 minutes or 5 hours — when you are still fresh in their mind.' },
              { title: '💬 Give Before You Get', content: 'Before asking for anything, offer value. Share an article they would like, congratulate a promotion, or offer your skills to help with something.' },
              { title: '📅 Schedule Follow-ups', content: 'Set a reminder to reach out every 30-90 days. A simple "Saw this article and thought of you" keeps the relationship warm.' },
              { title: '🎤 Events Strategy', content: 'At events, aim to have 3-5 deep conversations rather than collecting 20 business cards. Follow up within 24 hours with a personalised message.' },
              { title: '🔵 Optimise Your LinkedIn', content: 'Before networking online, make sure your profile is complete and your headline says what you are seeking. People check your profile before accepting.' },
              { title: '📧 The Perfect Ask', content: 'When requesting something, make it specific, easy to say yes to, and include a deadline. "Could we have a 20-minute call next week?" beats "Can we chat sometime?"' },
              { title: '🌍 Think Long Term', content: 'Your classmates are your most valuable network. They will hire you, refer you, and collaborate with you for the next 40 years. Invest in those relationships now.' },
              { title: '🎓 Leverage Alumni', content: 'Alumni are usually very willing to help students from their university. Search LinkedIn filters for your university + target company and message those alumni.' },
            ].map((tip, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 10 }}>{tip.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{tip.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}