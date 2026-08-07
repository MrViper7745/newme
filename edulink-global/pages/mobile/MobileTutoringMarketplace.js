import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function MobileTutoringMarketplace() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [tutors, setTutors] = useState([])
  const [myListing, setMyListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('browse')
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showBookSheet, setShowBookSheet] = useState(null)
  const [form, setForm] = useState({ subjects: '', rate_per_hour: '', availability: '', bio: '', mode: 'online' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterSubject, setFilterSubject] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const [tutorsRes, myRes] = await Promise.all([
      supabase.from('tutor_listings')
        .select('*, tutor:profiles!tutor_id(id,name,username,avatar_url,field,institution)')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('tutor_listings').select('*').eq('tutor_id', user.id).single(),
    ])
    setTutors(tutorsRes.data || [])
    setMyListing(myRes.data)
    if (myRes.data) setForm({
      subjects: myRes.data.subjects || '',
      rate_per_hour: myRes.data.rate_per_hour || '',
      availability: myRes.data.availability || '',
      bio: myRes.data.bio || '',
      mode: myRes.data.mode || 'online',
    })
    setLoading(false)
  }

  const saveListing = async () => {
    if (!form.subjects || !form.rate_per_hour) { showToast('⚠️ Subjects and rate are required'); return }
    setSaving(true)
    const listing = {
      tutor_id: user.id,
      subjects: form.subjects,
      rate_per_hour: parseFloat(form.rate_per_hour),
      availability: form.availability,
      bio: form.bio,
      mode: form.mode,
      active: true,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('tutor_listings').upsert(listing, { onConflict: 'tutor_id' })
    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }
    haptic.success()
    showToast('✅ Listing saved!')
    setShowCreateSheet(false)
    load()
  }

  const bookSession = async (tutor) => {
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: tutor.tutor_id,
      content: `Hi ${tutor.tutor?.name?.split(' ')[0]}! I found your tutoring listing on EduLink. I would love to book a session for ${tutor.subjects}. Are you available?`,
      read: false,
    })
    showToast('✅ Message sent! Check your messages.')
    setShowBookSheet(null)
  }

  const toggleListing = async () => {
    if (!myListing) return
    await supabase.from('tutor_listings').update({ active: !myListing.active }).eq('tutor_id', user.id)
    load()
  }

  const filtered = filterSubject
    ? tutors.filter(t => t.subjects?.toLowerCase().includes(filterSubject.toLowerCase()))
    : tutors

  return (
    <MobileLayout title="📚 Tutoring Marketplace">
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 56, zIndex: 10 }}>
        {[{ id: 'browse', label: '🔍 Browse Tutors' }, { id: 'my', label: '👤 My Listing' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: activeTab === t.id ? '#60a5fa' : 'var(--text3)', fontWeight: activeTab === t.id ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${activeTab === t.id ? '#2563eb' : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {activeTab === 'browse' && (
          <>
            <input value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              placeholder="Filter by subject..."
              style={{ width: '100%', padding: '10px 13px', borderRadius: 11, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', marginBottom: 14 }} />

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                Loading tutors...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No tutors available yet</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>Be the first to offer tutoring!</div>
                <button onClick={() => { setActiveTab('my'); setShowCreateSheet(true) }}
                  style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Become a Tutor
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(tutor => (
                  <div key={tutor.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                          {tutor.tutor?.avatar_url ? <img src={tutor.tutor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (tutor.tutor?.name || '?')[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{tutor.tutor?.name || 'Tutor'}</div>
                          {tutor.tutor?.username && <div style={{ fontSize: 11, color: '#60a5fa' }}>@{tutor.tutor.username}</div>}
                          {tutor.tutor?.field && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{tutor.tutor.field}{tutor.tutor.institution ? ` · ${tutor.tutor.institution}` : ''}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>R{tutor.rate_per_hour}/hr</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{tutor.mode}</div>
                        </div>
                      </div>

                      {tutor.subjects && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {tutor.subjects.split(',').map((s, i) => (
                            <span key={i} style={{ padding: '3px 9px', borderRadius: 10, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {tutor.bio && (
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>
                          {tutor.bio.slice(0, 100)}{tutor.bio.length > 100 ? '...' : ''}
                        </div>
                      )}

                      {tutor.availability && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                          🕐 {tutor.availability}
                        </div>
                      )}

                      {tutor.tutor_id !== user?.id && (
                        <button onClick={() => setShowBookSheet(tutor)}
                          style={{ width: '100%', padding: '11px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                          📩 Message to Book
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'my' && (
          <div>
            {myListing ? (
              <div>
                <div style={{ padding: '16px', borderRadius: 14, background: myListing.active ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${myListing.active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>Your Listing</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: myListing.active ? '#10b981' : '#ef4444' }}>
                      {myListing.active ? '✅ Active' : '⏸ Paused'}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>📚 {myListing.subjects}</div>
                  <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>R{myListing.rate_per_hour}/hour</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowCreateSheet(true)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={toggleListing}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, background: myListing.active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${myListing.active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, color: myListing.active ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {myListing.active ? '⏸ Pause' : '▶ Activate'}
                    </button>
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                  💡 Students who book you will send a message to your inbox. Respond promptly to build your reputation. EduLink takes a 15% platform fee on sessions booked through the platform.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🎓</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Become a Tutor</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
                  If you score consistently above 85% in challenges, you can offer tutoring. Set your rate, subjects, and availability — students will find you and book sessions.
                </div>
                <button onClick={() => setShowCreateSheet(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  🎓 Create Tutor Listing
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit listing sheet */}
      <MobileBottomSheet open={showCreateSheet} onClose={() => setShowCreateSheet(false)} title="🎓 Tutor Listing" height="80vh">
        <div style={{ padding: '16px' }}>
          {[
            { key: 'subjects', label: 'Subjects (comma separated)', placeholder: 'e.g. Engineering Mathematics, Physics, Thermodynamics', type: 'text' },
            { key: 'rate_per_hour', label: 'Rate per hour (ZAR)', placeholder: 'e.g. 150', type: 'number' },
            { key: 'availability', label: 'Availability', placeholder: 'e.g. Weekdays 6-9pm, Weekends', type: 'text' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Bio / About You</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell students about your qualifications and tutoring style..." rows={3}
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['online', 'in-person', 'both'].map(m => (
                <button key={m} onClick={() => setForm(p => ({ ...p, mode: m }))}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.mode === m ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: form.mode === m ? '#60a5fa' : 'var(--text3)', border: `1px solid ${form.mode === m ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, textTransform: 'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button onClick={saveListing} disabled={saving || !form.subjects || !form.rate_per_hour}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: form.subjects && form.rate_per_hour ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: form.subjects && form.rate_per_hour ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? '⏳ Saving...' : '💾 Save Listing'}
          </button>
        </div>
      </MobileBottomSheet>

      {/* Book session sheet */}
      {showBookSheet && (
        <MobileBottomSheet open={!!showBookSheet} onClose={() => setShowBookSheet(null)} title="📩 Book a Session" height="50vh">
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {(showBookSheet.tutor?.name || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{showBookSheet.tutor?.name}</div>
                <div style={{ fontSize: 12, color: '#10b981' }}>R{showBookSheet.rate_per_hour}/hour · {showBookSheet.mode}</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
              Booking sends a direct message to this tutor with your request. They will reply to confirm availability and payment details.
            </div>
            <button onClick={() => bookSession(showBookSheet)}
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              📩 Send Booking Request
            </button>
          </div>
        </MobileBottomSheet>
      )}

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}