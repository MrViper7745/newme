import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'

export default function Navbar() {
  const router = useRouter()
  const { user, profile, signInWithGoogle, signOut } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setDropdownOpen(false) }, [router.pathname])

  const MAIN_LINKS = [
    { href: '/resources', label: '📚 Resources' },
    { href: '/assistant', label: '🤖 EduBot' },
    { href: '/study-ai', label: '📚 Study AI' },
  ]

  const MORE_LINKS = [
    { href: '/cv-builder', label: '📄 CV Builder' },
    { href: '/cover-letter', label: '📝 Cover Letter' },
    { href: '/tracker', label: '📊 Applications' },
    { href: '/mentorship', label: '🤝 Mentors' },
    { href: '/leaderboard', label: '🏆 Points' },
    { href: '/courses', label: '🎓 Courses' },
    { href: '/career-roadmap', label: '🗺️ Roadmap' },
    { href: '/messages', label: '💬 Messages' },
    { href: '/study-groups', label: '👥 Groups' },
    { href: '/reviews', label: '⭐ Reviews' },
    { href: '/community', label: '💬 Community' },
    { href: '/countries', label: '🌍 Countries' },
    { href: '/employers', label: '🏢 Employers' },
    { href: '/analytics', label: '📉 Analytics' },
    { href: '/goals', label: '🎯 Goal Tracker' },
    { href: '/logbook', label: '📓 Internship Logbook' },
    { href: '/budget', label: '💰 Budget Calculator' },
    { href: '/linkedin-optimizer', label: '🔵 LinkedIn Optimizer' },
    { href: '/wellness', label: '🌱 Wellness Check-in' },
    { href: '/exams', label: '📅 Exam Timetable' },
    { href: '/notifications', label: '🔔 Notifications' },
    { href: '/quiz', label: '🧠 Career Quiz' },
    { href: '/visa-guide', label: '🌍 Visa Guide' },
    { href: '/portfolio', label: '🚀 Portfolio Builder' },
    { href: '/email-generator', label: '✉️ Email Generator' },
    { href: '/networking', label: '🤝 Networking Hub' },
    { href: '/research', label: '🔬 Research Papers' },
    { href: '/interview-simulator', label: '🎙️ Interview Simulator' },
    { href: '/language', label: '🌐 Language Learning' },
    { href: '/nearby', label: '📍 Near Me' },
    { href: '/nearby', label: '📍 Near Me — Opportunities' },
    { href: '/income', label: '💰 Income & Money Hub' },
    { href: '/interview-simulator', label: '🎙️ Interview Simulator' },
    { href: '/address-finder', label: '🗺️ Address Finder' },
    { href: '/library', label: '📚 EduLink Library' },
    { href: '/classroom', label: '🏫 Teaching Hub' },
    { href: '/about', label: 'ℹ️ About' },
  ]

  const avatarUrl = user?.user_metadata?.avatar_url
  const avatarLetter = profile?.name?.[0] || user?.email?.[0] || '?'

  return (
    <>
      <nav className="nav-blur" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: isMobile ? '10px 16px' : '12px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌐</div>
            <span style={{ fontWeight: 800, fontSize: isMobile ? 15 : 16, color: '#e2e8f0' }}>
              Edu<span style={{ color: '#60a5fa' }}>Link</span>
              {!isMobile && <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 400, marginLeft: 4 }}>Global</span>}
            </span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
              {MAIN_LINKS.map(l => (
                <Link key={l.href} href={l.href} style={{
                  padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: 'none',
                  color: router.pathname === l.href ? '#60a5fa' : '#94a3b8',
                  background: router.pathname === l.href ? 'rgba(37,99,235,0.12)' : 'transparent',
                  whiteSpace: 'nowrap',
                }}>{l.label}</Link>
              ))}

              {/* More dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                  padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer',
                }}>More ▾</button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 36, left: 0, width: 220,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 8, zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    maxHeight: 400, overflowY: 'auto',
                  }}>
                    {MORE_LINKS.map(l => (
                      <Link key={l.href} href={l.href} style={{
                        display: 'block', padding: '8px 12px', borderRadius: 8,
                        color: router.pathname === l.href ? '#60a5fa' : '#94a3b8',
                        textDecoration: 'none', fontSize: 13, fontWeight: 500,
                        background: router.pathname === l.href ? 'rgba(37,99,235,0.12)' : 'transparent',
                      }}>{l.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Auth — desktop */}
            {!isMobile && (
              user ? (
                <>
                  <Link href="/dashboard" style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>Dashboard</Link>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setDropdownOpen(d => d === 'user' ? false : 'user')} style={{
                      width: 32, height: 32, borderRadius: '50%', border: '2px solid #2563eb',
                      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#1d4ed8,#06b6d4)',
                      cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 13, padding: 0,
                    }}>
                      {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetter.toUpperCase()}
                    </button>
                    {dropdownOpen === 'user' && (
                      <div style={{ position: 'absolute', top: 40, right: 0, width: 210, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                        <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{profile?.name || 'Student'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{user.email}</div>
                        </div>
                        {[{ href: '/profile', label: '👤 My Profile' }, { href: '/dashboard', label: '📊 Dashboard' }, { href: '/messages', label: '💬 Messages' }, { href: '/settings', label: '⚙️ Settings' }].map(item => (
                          <Link key={item.href} href={item.href} style={{ display: 'block', padding: '8px 12px', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>{item.label}</Link>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                          <button onClick={signOut} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🚪 Sign Out</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={signInWithGoogle} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, background: '#fff', color: '#1a1a1a',
                  border: '1px solid #e2e8f0', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>
                  <img src="https://www.google.com/favicon.ico" width={13} height={13} alt="G" />
                  Sign in
                </button>
              )
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                fontSize: 22, cursor: 'pointer', padding: '2px 6px',
              }}>
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, bottom: 0,
          background: 'var(--bg)', zIndex: 49, overflowY: 'auto',
          padding: '16px 0',
        }}>
          {/* Auth section */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            {user ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#1d4ed8,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{avatarLetter.toUpperCase()}</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{profile?.name || 'Student'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{user.email}</div>
                  </div>
                </div>
                <button onClick={() => { signOut(); setMenuOpen(false) }} style={{ width: '100%', padding: '10px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  🚪 Sign Out
                </button>
              </div>
            ) : (
              <button onClick={() => { signInWithGoogle(); setMenuOpen(false) }} style={{
                width: '100%', padding: '12px', borderRadius: 10, background: '#fff', color: '#1a1a1a',
                border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <img src="https://www.google.com/favicon.ico" width={16} height={16} alt="G" />
                Sign in with Google
              </button>
            )}
          </div>

          {/* All nav links */}
          {[...MAIN_LINKS, ...MORE_LINKS].map(l => (
            <Link key={l.href} href={l.href} style={{
              display: 'flex', alignItems: 'center', padding: '13px 20px',
              textDecoration: 'none', fontSize: 15, fontWeight: 500,
              color: router.pathname === l.href ? '#60a5fa' : '#94a3b8',
              background: router.pathname === l.href ? 'rgba(37,99,235,0.08)' : 'transparent',
              borderLeft: router.pathname === l.href ? '3px solid #2563eb' : '3px solid transparent',
            }}>{l.label}</Link>
          ))}
        </div>
      )}

      {/* Overlay to close dropdowns */}
      {(dropdownOpen && !isMobile) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setDropdownOpen(false)} />
      )}
    </>
  )
}