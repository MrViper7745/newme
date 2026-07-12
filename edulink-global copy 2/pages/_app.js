import '../styles/globals.css'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useUser } from '../lib/useUser'
import LocationBanner from '../components/LocationBanner'
import { useLocation } from '../lib/useLocation'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/subscription', '/auth/callback', '/auth/reset-password']

function AppContent({ Component, pageProps }) {
  const { user, loading, hasAccess } = useUser()
  const { permission } = useLocation()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (isPublic) return
    if (!user) { router.push('/login'); return }
    if (!hasAccess) { router.push('/subscription'); return }
  }, [loading, user, hasAccess, router.pathname])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading EduLink...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <Component {...pageProps} />
      {/* Show location banner on dashboard pages — not on public pages */}
      {user && !PUBLIC_ROUTES.includes(router.pathname) && permission !== 'granted' && (
        <LocationBanner />
      )}
    </>
  )
}

export default function App(props) {
  return <AppContent {...props} />
}