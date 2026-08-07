import { useState } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import { useUser } from '../../lib/useUser'

const SPACES = [
  { type: 'Library', icon: '📚', query: 'university library open now', tips: 'Usually has designated quiet zones and power outlets. Bring earphones.' },
  { type: 'Computer Lab', icon: '💻', query: 'computer lab open university', tips: 'Free printing often available. Check if you need your student card.' },
  { type: 'Quiet Cafe', icon: '☕', query: 'quiet cafe study wifi laptop', tips: 'Buy something when you arrive. Look for spots with power outlets.' },
  { type: '24hr Study Hall', icon: '🌙', query: '24 hour study room university', tips: 'Perfect for late night study sessions before exams.' },
  { type: 'Co-working Space', icon: '🏢', query: 'co-working space student discount', tips: 'Some offer free day passes for students. Ask about student rates.' },
  { type: 'Public Library', icon: '🏛️', query: 'public library study open now', tips: 'Free wifi and quiet environment. Usually open to all.' },
]

export default function MobileStudySpaceFinder() {
  const { profile } = useUser()
  const [found, setFound] = useState(null)

  const findSpace = (space) => {
    const loc = profile?.institution || profile?.city || 'South Africa'
    const url = `https://www.google.com/maps/search/${encodeURIComponent(space.query + ' near ' + loc)}`
    window.open(url, '_blank')
    setFound(space)
  }

  const findWithLocation = (space) => {
    if (!navigator.geolocation) { findSpace(space); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://www.google.com/maps/search/${encodeURIComponent(space.query)}/@${pos.coords.latitude},${pos.coords.longitude},14z`
        window.open(url, '_blank')
      },
      () => findSpace(space),
      { timeout: 5000 }
    )
  }

  return (
    <MobileLayout title="📍 Study Spaces">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
          Find a study space near you right now. Tap any option to open Google Maps with live results for your location.
        </div>

        {profile?.city && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 16, fontSize: 12, color: '#10b981' }}>
            📍 Searching near: <strong>{profile.institution || profile.city}</strong>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SPACES.map((space, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{space.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{space.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{space.tips}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => findWithLocation(space)}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Find ↗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 10 }}>🔍 Custom Search</div>
          <button onClick={() => {
            const loc = profile?.institution || profile?.city || 'South Africa'
            window.open(`https://www.google.com/maps/search/${encodeURIComponent('study space near ' + loc)}`, '_blank')
          }}
            style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            🗺️ Open Google Maps — Study Spaces Near Me
          </button>
        </div>
      </div>
    </MobileLayout>
  )
}