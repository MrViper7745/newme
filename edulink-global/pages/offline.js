import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Offline() {
  const router = useRouter()
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const check = () => setOnline(navigator.onLine)
    window.addEventListener('online', check)
    if (navigator.onLine) router.replace('/dashboard')
    return () => window.removeEventListener('online', check)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 70, height: 70, borderRadius: 18, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 24px' }}>🎓</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>You're offline</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
          No internet connection right now. Any pages you previously visited are available — go back to access them.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => window.history.back()} style={{ padding: '11px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ← Go Back
          </button>
          <button onClick={() => window.location.reload()} style={{ padding: '11px 22px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            🔄 Retry
          </button>
        </div>
      </div>
    </div>
  )
}