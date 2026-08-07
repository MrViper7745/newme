import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import UsernameSetup from '../components/UsernameSetup'
import FloatingTimer from '../components/FloatingTimer'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/register', '/reset-password', '/offline']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        localStorage.setItem('edulink_token', session.access_token)
        localStorage.setItem('edulink_user_id', session.user.id)
        checkUsername(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        localStorage.setItem('edulink_token', session.access_token)
        localStorage.setItem('edulink_user_id', session.user.id)
        if (event === 'SIGNED_IN') checkUsername(session.user.id)
      } else {
        localStorage.removeItem('edulink_token')
        localStorage.removeItem('edulink_user_id')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkUsername = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, username_set')
        .eq('id', userId)
        .single()
      if (!data?.username_set) {
        const skip = localStorage.getItem('username_skip_until')
        if (!skip || Date.now() > parseInt(skip)) {
          setTimeout(() => setShowUsernameSetup(true), 2000)
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (!loading && !user && !PUBLIC_ROUTES.includes(router.pathname)) {
      router.push('/login')
    }
  }, [user, loading, router.pathname])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px' }}>🎓</div>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const isPublic = PUBLIC_ROUTES.includes(router.pathname)

  return (
    <>
      <Component {...pageProps} />
      {user && !isPublic && (
        <>
          <FloatingTimer />
          {showUsernameSetup && (
            <UsernameSetup
              onComplete={() => setShowUsernameSetup(false)}
              onSkip={() => {
                setShowUsernameSetup(false)
                localStorage.setItem('username_skip_until', String(Date.now() + 24 * 60 * 60 * 1000))
              }}
            />
          )}
        </>
      )}
    </>
  )
}