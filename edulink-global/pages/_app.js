import '../styles/globals.css'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import LocationBanner from '../components/LocationBanner'
import { useLocation } from '../lib/useLocation'
import UsernameSetup from '../components/UsernameSetup'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/subscription',
  '/auth/callback',
  '/auth/reset-password',
]

function AppContent({ Component, pageProps }) {
  const { user, profile, loading, hasAccess } = useUser()
  const { permission } = useLocation()
  const router = useRouter()
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (isPublic) return
    if (!user) { router.push('/login'); return }
    if (!hasAccess) { router.push('/subscription'); return }
  }, [loading, user, hasAccess, router.pathname])

  // ── Share auth credentials with browser extension ─────────────
  useEffect(() => {
    if (!user) return
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        localStorage.setItem('edulinkToken', data.session.access_token)
        localStorage.setItem('edulinkUserId', user.id)
      }
    })
  }, [user])

  // ── Username setup prompt ─────────────────────────────────────
  useEffect(() => {
    if (!user || !profile || loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (isPublic) return
    if (profile.username_set === false || (!profile.username && !profile.username_set)) {
      const skippedAt = localStorage.getItem('edulink_username_skipped_at')
      if (skippedAt) {
        const hoursSinceSkip = (Date.now() - parseInt(skippedAt)) / (1000 * 60 * 60)
        if (hoursSinceSkip < 24) return // Don't re-prompt within 24 hours of skipping
      }
      const timer = setTimeout(() => setShowUsernameSetup(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [user, profile, loading, router.pathname])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        border: '3px solid rgba(37,99,235,0.2)',
        borderTop: '3px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading EduLink...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <Component {...pageProps} />
      {user && !PUBLIC_ROUTES.includes(router.pathname) && permission !== 'granted' && (
        <LocationBanner />
      )}
      {showUsernameSetup && user && (
        <UsernameSetup
          onComplete={() => setShowUsernameSetup(false)}
          onSkip={() => {
            setShowUsernameSetup(false)
            localStorage.setItem('edulink_username_skipped_at', Date.now().toString())
          }}
        />
      )}
    </>
  )
}

export default function App(props) {
  return <AppContent {...props} />
}