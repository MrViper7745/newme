import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/library', label: 'Library', icon: '📚' },
  { href: '/study-ai', label: 'Study AI', icon: '🤖' },
  { href: '/assistant', label: 'EduBot', icon: '💬' },
  { href: '/exams', label: 'Exams', icon: '📅' },
  { href: '/community', label: 'Community', icon: '🌍' },
  { href: '/messages', label: 'Messages', icon: '✉️', badge: 'messages' },
  { href: '/income', label: 'Income', icon: '💰' },
]

const MORE_LINKS = [
  { href: '/language', label: '🌐 Language Learning' },
  { href: '/cv-builder', label: '📄 CV Builder' },
  { href: '/cover-letter', label: '📝 Cover Letter' },
  { href: '/interview-simulator', label: '🎙️ Interview Simulator' },
  { href: '/tracker', label: '📊 Application Tracker' },
  { href: '/nearby', label: '📍 Near Me' },
  { href: '/profile', label: '👤 My Profile' },
  { href: '/settings', label: '⚙️ Settings' },
]

export default function Navbar() {
  const { user, profile, signOut } = useUser()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [showMobile, setShowMobile] = useState(false)
  const [notifications, setNotifications] = useState({
    unread_messages: 0,
    unread_insights: 0,
    upcoming_exams: [],
  })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    setShowMore(false)
    setShowMobile(false)
  }, [router.pathname])

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/notifications?user_id=${user.id}`)
      const data = await res.json()
      if (!data.error) setNotifications(data)
    } catch {}
  }

  const handleSignOut = async () => {
    setShowMore(false)
    setShowMobile(false)
    await signOut()
    router.push('/')
  }

  const isActive = (href) =>
    router.pathname === href || router.pathname.startsWith(href + '/')

  const Badge = ({ count }) =>
    count > 0 ? (
      <span style={{
        position: 'absolute', top: -4, right: -4,
        minWidth: 16, height: 16, borderRadius: 8,
        background: '#ef4444', color: '#fff',
        fontSize: 9, fontWeight: 800,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '0 3px', lineHeight: 1,
        pointerEvents: 'none',
      }}>
        {count > 99 ? '99+' : count}
      </span>
    ) : null

  const handleMoreLinkClick = (href) => {
    setShowMore(false)
    setShowMobile(false)
    router.push(href)
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(10,10,20,0.97)' : 'rgba(10,10,20,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          maxWidth: 1300, margin: '0 auto', padding: '0 16px',
          height: 60, display: 'flex', alignItems: 'center',
        }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🎓</div>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#f1f5f9', letterSpacing: '-0.02em' }}>EduLink</span>
            <span style={{ fontSize: 9, color: '#60a5fa', fontWeight: 700, background: 'rgba(37,99,235,0.15)', padding: '2px 6px', borderRadius: 5, border: '1px solid rgba(37,99,235,0.3)' }}>Global</span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, overflow: 'hidden' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  fontWeight: isActive(link.href) ? 700 : 500,
                  color: isActive(link.href) ? '#60a5fa' : '#94a3b8',
                  background: isActive(link.href) ? 'rgba(37,99,235,0.12)' : 'transparent',
                  whiteSpace: 'nowrap', transition: 'all 0.1s', cursor: 'pointer',
                }}
                  onMouseEnter={e => { if (!isActive(link.href)) { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' } }}
                  onMouseLeave={e => { if (!isActive(link.href)) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' } }}
                >
                  <span style={{ fontSize: 14 }}>{link.icon}</span>
                  <span className="nav-label">{link.label}</span>
                  {link.badge === 'messages' && <Badge count={notifications.unread_messages} />}
                </div>
              </Link>
            ))}

            {/* More dropdown */}
            <div style={{ position: 'relative', flexShrink: 0, zIndex: 200 }}>
              <button
                onMouseDown={e => { e.preventDefault(); setShowMore(s => !s) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  fontWeight: 500, color: showMore ? '#60a5fa' : '#94a3b8',
                  background: showMore ? 'rgba(37,99,235,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  position: 'relative', transition: 'all 0.1s',
                }}
              >
                More {showMore ? '▲' : '▾'}
                {notifications.unread_insights > 0 && <Badge count={notifications.unread_insights} />}
              </button>

              {showMore && (
                <div style={{
                  position: 'absolute', top: 40, left: 0,
                  background: 'rgba(12,12,22,0.99)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '8px 6px', minWidth: 220,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(24px)', zIndex: 500,
                }}>
                  {MORE_LINKS.map(link => (
                    <div
                      key={link.href}
                      onMouseDown={() => handleMoreLinkClick(link.href)}
                      style={{
                        padding: '10px 14px', borderRadius: 9, fontSize: 13,
                        color: isActive(link.href) ? '#60a5fa' : '#e2e8f0',
                        fontWeight: isActive(link.href) ? 700 : 400,
                        cursor: 'pointer', transition: 'background 0.1s',
                        background: isActive(link.href) ? 'rgba(37,99,235,0.12)' : 'transparent',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => { if (!isActive(link.href)) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                      onMouseLeave={e => { if (!isActive(link.href)) e.currentTarget.style.background = 'transparent' }}
                    >
                      {link.label}
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 6, paddingTop: 6 }}>
                    <div
                      onMouseDown={handleSignOut}
                      style={{ padding: '10px 14px', borderRadius: 9, color: '#ef4444', fontSize: 13, cursor: 'pointer', transition: 'background 0.1s', userSelect: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      🚪 Sign Out
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>

            {/* Upcoming exam warning */}
            {notifications.upcoming_exams?.[0] && (
              <Link href="/exams" style={{ textDecoration: 'none' }} className="hide-mobile">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11 }}>⏰</span>
                  <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notifications.upcoming_exams[0].module_name?.split(' ').slice(0, 2).join(' ')} soon
                  </span>
                </div>
              </Link>
            )}

            {/* Insights bell */}
            {notifications.unread_insights > 0 && (
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>
                  🤖
                  <Badge count={notifications.unread_insights} />
                </div>
              </Link>
            )}

            {/* Avatar */}
            {user && (
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(37,99,235,0.4)', flexShrink: 0 }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile?.name || user.email || '?')[0]?.toUpperCase()
                  }
                </div>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onMouseDown={() => setShowMobile(s => !s)}
              className="mobile-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22, padding: 4, display: 'none' }}
            >
              {showMobile ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobile && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.99)', padding: '12px 16px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile?.name || user.email || '?')[0]?.toUpperCase()
                  }
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{profile?.name || 'Student'}</div>
                  {profile?.username && <div style={{ fontSize: 12, color: '#60a5fa' }}>@{profile.username}</div>}
                </div>
                {notifications.unread_messages > 0 && (
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: '#ef4444', fontWeight: 700 }}>
                    {notifications.unread_messages} unread
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {[...NAV_LINKS, ...MORE_LINKS].map(link => (
                <div
                  key={link.href + link.label}
                  onMouseDown={() => handleMoreLinkClick(link.href)}
                  style={{ padding: '10px 12px', borderRadius: 9, background: isActive(link.href) ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)', color: isActive(link.href) ? '#60a5fa' : '#e2e8f0', fontSize: 13, fontWeight: isActive(link.href) ? 700 : 400, cursor: 'pointer', userSelect: 'none' }}>
                  {'icon' in link ? `${link.icon} ` : ''}{link.label}
                </div>
              ))}
            </div>

            <button onMouseDown={handleSignOut} style={{ width: '100%', marginTop: 6, padding: '11px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🚪 Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Overlay — closes dropdowns using onMouseDown so links register first */}
      {(showMore || showMobile) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onMouseDown={() => {
            setTimeout(() => {
              setShowMore(false)
              setShowMobile(false)
            }, 100)
          }}
        />
      )}

      <style>{`
        @media (max-width: 780px) {
          .nav-label { display: none !important; }
          .mobile-btn { display: block !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}