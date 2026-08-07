import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import { useUser } from '../../lib/useUser'

export default function MobileCampusMap() {
  const { profile } = useUser()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [category, setCategory] = useState('library')

  const CATEGORIES = [
    { id: 'library', icon: '📚', label: 'Libraries' },
    { id: 'computer_lab', icon: '💻', label: 'Computer Labs' },
    { id: 'study', icon: '📖', label: 'Study Spaces' },
    { id: 'food', icon: '🍽️', label: 'Food & Cafes' },
    { id: 'health', icon: '🏥', label: 'Health & Wellness' },
    { id: 'counselling', icon: '💚', label: 'Counselling' },
  ]

  const SEARCH_TERMS = {
    library: 'university library study',
    computer_lab: 'computer lab internet cafe',
    study: 'quiet study cafe wifi',
    food: 'student cafeteria food',
    health: 'clinic pharmacy health',
    counselling: 'counselling mental health support',
  }

  const search = async () => {
    const institution = profile?.institution || profile?.city || 'South Africa'
    const term = SEARCH_TERMS[category]
    const url = `https://www.google.com/maps/search/${encodeURIComponent(term + ' near ' + institution)}`
    window.open(url, '_blank')
  }

  const QUICK_LINKS = [
    { label: 'Find libraries near me', icon: '📚', query: 'university library' },
    { label: 'Find internet cafes', icon: '💻', query: 'internet cafe wifi' },
    { label: 'Find study spaces', icon: '📖', query: 'quiet cafe study wifi' },
    { label: 'Find tutoring centres', icon: '🎓', query: 'tutoring centre academic support' },
    { label: 'Find printing services', icon: '🖨️', query: 'printing services copy shop' },
    { label: 'Find campus counselling', icon: '💚', query: 'student counselling mental health' },
  ]

  return (
    <MobileLayout title="📍 Near Me">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
          Find study resources and services near your location or university. Tap any option to open Google Maps with relevant results.
        </div>

        {profile?.city && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 16, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📍</span>
            <span>Based near <strong>{profile.city}{profile.institution ? ` · ${profile.institution}` : ''}</strong></span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {QUICK_LINKS.map((link, i) => (
            <div key={i} onClick={() => {
              const loc = profile?.institution || profile?.city || 'South Africa'
              window.open(`https://www.google.com/maps/search/${encodeURIComponent(link.query + ' near ' + loc)}`, '_blank')
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
              onTouchEnd={e => e.currentTarget.style.background = 'var(--surface)'}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{link.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{link.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Opens Google Maps</div>
              </div>
              <span style={{ color: 'var(--text3)', fontSize: 16 }}>↗</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '16px', borderRadius: 14, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 8 }}>🔍 Custom Search</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for anything nearby..."
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={() => { if (query.trim()) { const loc = profile?.institution || profile?.city || 'South Africa'; window.open(`https://www.google.com/maps/search/${encodeURIComponent(query + ' near ' + loc)}`, '_blank') } }}
              disabled={!query.trim()}
              style={{ padding: '10px 14px', borderRadius: 10, background: query.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: query.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Search
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}