import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useLocation } from '../lib/useLocation'
import Link from 'next/link'

const TABS = [
  { id: 'internships', label: '💼 Internships', icon: '💼' },
  { id: 'universities', label: '🎓 Universities', icon: '🎓' },
  { id: 'scholarships', label: '🏆 Scholarships', icon: '🏆' },
  { id: 'events', label: '📅 Events', icon: '📅' },
]

const safeParseJSON = (text) => {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
    return JSON.parse(clean.slice(s, e + 1))
  } catch { return null }
}

export default function Nearby() {
  const { location, country, city, permission, requestLocation, loading: locLoading } = useLocation()
  const [tab, setTab] = useState('internships')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [expandGlobal, setExpandGlobal] = useState(false)
  const [field, setField] = useState('Technology')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const loadResults = async (type, global = false) => {
    setLoading(true)
    let full = ''
    try {
      const res = await fetch('/api/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, location, field, expandGlobal: global }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') {
            const parsed = safeParseJSON(full)
            if (parsed) setResults(p => ({ ...p, [type]: parsed }))
            else showToast('⚠️ Could not load results')
            setLoading(false)
            return
          }
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
    } catch (e) { showToast('❌ ' + e.message) }
    setLoading(false)
  }

  useEffect(() => {
    if (location && !results[tab]) loadResults(tab)
  }, [location, tab])

  const currentResults = results[tab] || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📍 Near You</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            {location
              ? `Showing opportunities in and around ${city ? city + ', ' : ''}${country}`
              : 'Enable location to see opportunities near you'}
          </p>
        </div>

        {/* Location prompt */}
        {!location && (
          <div style={{ marginBottom: 28, padding: '32px', borderRadius: 16, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📍</div>
            <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20, marginBottom: 8 }}>Enable Location Access</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>
              EduLink uses your location to find internships, scholarships, universities, and events that are actually near you — not just anywhere in the world.
            </p>
            <button onClick={requestLocation} disabled={locLoading} style={{ padding: '12px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: locLoading ? 0.7 : 1 }}>
              {locLoading ? '📍 Detecting location...' : '📍 Enable My Location'}
            </button>
          </div>
        )}

        {location && (
          <>
            {/* Location bar */}
            <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                📍 {city && `${city}, `}{country} — {expandGlobal ? 'Showing global + local' : 'Showing nearby only'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => { setExpandGlobal(!expandGlobal); loadResults(tab, !expandGlobal) }} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 7, background: expandGlobal ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${expandGlobal ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, color: expandGlobal ? '#a78bfa' : '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                  {expandGlobal ? '🌍 Global On' : '🌍 Show Global'}
                </button>
                <button onClick={() => loadResults(tab, expandGlobal)} disabled={loading} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 7, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Field filter */}
            <div style={{ marginBottom: 20, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['Technology', 'Business', 'Engineering', 'Medicine', 'Finance', 'Design', 'Law'].map(f => (
                <button key={f} onClick={() => { setField(f); setResults({}); }} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: field === f ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: field === f ? '#60a5fa' : '#64748b', border: `1px solid ${field === f ? '#2563eb' : 'var(--border)'}` }}>{f}</button>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); if (!results[t.id]) loadResults(t.id, expandGlobal) }} style={{
                  padding: '12px 20px', border: 'none', cursor: 'pointer', background: 'transparent',
                  color: tab === t.id ? '#60a5fa' : '#64748b',
                  fontWeight: tab === t.id ? 700 : 500, fontSize: 14,
                  borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Results */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Finding what's near you...</div>
                <div style={{ fontSize: 13 }}>Searching in {city || country}...</div>
              </div>
            ) : currentResults.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 18 }}>
                {currentResults.map((item, i) => (
                  <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${item.isNearby || item.isLocal ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>{item.icon || item.logo || '📌'}</span>
                      {(item.isNearby || item.isLocal) && (
                        <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', fontWeight: 700 }}>📍 Near You</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{item.title || item.name}</div>
                    <div style={{ color: '#60a5fa', fontSize: 13, marginBottom: 4 }}>{item.company || item.provider || item.organizer || item.location}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: item.description || item.nearby_reason ? 8 : 12 }}>
                      📍 {item.distance || item.location}
                    </div>
                    {(item.description || item.nearby_reason || item.local_reason) && (
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 12 }}>
                        {item.description || item.nearby_reason || item.local_reason}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {item.field && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>{item.field}</span>}
                      {item.type && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>{item.type}</span>}
                      {item.salary && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>{item.salary}</span>}
                      {item.amount && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>{item.amount}</span>}
                      {item.free && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>Free</span>}
                      {item.deadline && <span style={{ fontSize: 10, color: '#64748b' }}>Due: {item.deadline}</span>}
                    </div>
                    {item.apply_url || item.register_url ? (
                      <a href={item.apply_url || item.register_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        {tab === 'events' ? 'Register →' : 'Apply Now →'}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                <div>Click Refresh to load {tab} near {city || country}</div>
                <button onClick={() => loadResults(tab, expandGlobal)} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Load Results
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}