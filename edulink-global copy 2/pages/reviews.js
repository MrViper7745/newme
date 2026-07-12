import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS } from '../data/globalData'

export default function Reviews() {
  const { user } = useUser()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [regionFilter, setRegionFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState(0)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ company: '', role: '', rating: 5, review: '', pros: '', cons: '', country: '', region: 'all' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { fetchReviews() }, [])

  const fetchReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  const submitReview = async () => {
    if (!form.company || !form.role || !form.review) { showToast('Please fill in company, role, and review'); return }
    const { error } = await supabase.from('reviews').insert({ ...form, user_id: user.id })
    if (error) { showToast('❌ Failed: ' + error.message); return }
    showToast('✅ Review submitted!')
    setShowForm(false)
    setForm({ company: '', role: '', rating: 5, review: '', pros: '', cons: '', country: '', region: 'all' })
    fetchReviews()
  }

  const filtered = reviews.filter(r => {
    const matchRegion = regionFilter === 'all' || r.region === regionFilter
    const matchRating = ratingFilter === 0 || r.rating >= ratingFilter
    return matchRegion && matchRating
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1000, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>⭐ Student Reviews</h1>
            <p style={{ color: '#64748b' }}>{reviews.length} reviews from students worldwide</p>
          </div>
          {user && <button onClick={() => setShowForm(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Write Review</button>}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegionFilter(r.id)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: regionFilter === r.id ? r.color : 'var(--surface)',
              color: regionFilter === r.id ? '#fff' : '#94a3b8',
              border: `1px solid ${regionFilter === r.id ? r.color : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[0, 3, 4, 5].map(r => (
            <button key={r} onClick={() => setRatingFilter(r)} style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: ratingFilter === r ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
              color: ratingFilter === r ? '#f59e0b' : '#64748b',
              border: `1px solid ${ratingFilter === r ? '#f59e0b' : 'var(--border)'}`,
            }}>{r === 0 ? 'All Ratings' : `${r}★+`}</button>
          ))}
        </div>

        {filtered.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
            <div>No reviews yet. Be the first to share your experience!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(review => (
              <div key={review.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>{review.company}</div>
                    <div style={{ color: '#60a5fa', fontSize: 13 }}>{review.role}</div>
                    {review.country && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>📍 {review.country}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, marginBottom: 2 }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(review.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{review.review}</p>
                {(review.pros || review.cons) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {review.pros && (
                      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✅ PROS</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{review.pros}</div>
                      </div>
                    )}
                    {review.cons && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>❌ CONS</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{review.cons}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Review Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 20 }}>Write a Review</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'company', label: 'Company', placeholder: 'Google' },
                  { key: 'role', label: 'Role / Position', placeholder: 'Software Engineering Intern' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</label>
                    <input value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Country</label>
                  <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                    <option value="">Select country...</option>
                    {WORLD_REGIONS.map(r => (
                      <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                        {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Rating</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setForm(p => ({ ...p, rating: r }))} style={{
                        fontSize: 24, background: 'none', border: 'none', cursor: 'pointer',
                        color: r <= form.rating ? '#f59e0b' : '#374151',
                      }}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Your Review</label>
                  <textarea value={form.review} onChange={e => setForm(p => ({ ...p, review: e.target.value }))} rows={4} placeholder="Describe your overall experience..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#10b981', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Pros</label>
                    <textarea value={form.pros} onChange={e => setForm(p => ({ ...p, pros: e.target.value }))} rows={3} placeholder="Great mentorship, real projects..."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(16,185,129,0.3)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#ef4444', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Cons</label>
                    <textarea value={form.cons} onChange={e => setForm(p => ({ ...p, cons: e.target.value }))} rows={3} placeholder="Long hours, remote only..."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(239,68,68,0.3)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={submitReview} style={{ flex: 2, padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Submit Review</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}