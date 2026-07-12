import { useLocation } from '../lib/useLocation'
import { useState } from 'react'

export default function LocationBanner({ onLocationGranted }) {
  const { location, country, city, loading, error, permission, requestLocation, clearLocation } = useLocation()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (permission === 'granted' && location) {
    if (onLocationGranted) onLocationGranted(location)
    return null
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: 'linear-gradient(135deg,rgba(30,42,70,0.97),rgba(17,24,39,0.97))',
      border: '1px solid rgba(37,99,235,0.4)',
      borderRadius: 16, padding: '18px 20px', maxWidth: 340,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 22 }}>📍</div>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>
        Enable Location for Better Results
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
        EduLink will find internships, scholarships, universities, and opportunities near you. Your location is never shared.
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={requestLocation} disabled={loading} style={{
          flex: 1, padding: '9px', borderRadius: 9,
          background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
          color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
        }}>
          {loading ? '📍 Locating...' : '📍 Enable Location'}
        </button>
        <button onClick={() => setDismissed(true)} style={{
          padding: '9px 14px', borderRadius: 9, background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 13, cursor: 'pointer'
        }}>
          Not now
        </button>
      </div>
    </div>
  )
}