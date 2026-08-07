import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'
import NotificationPanel from './NotificationPanel'

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: '🏠' },
  { href: '/library',     label: 'Library',      icon: '📚' },
  { href: '/study-ai',    label: 'Study AI',     icon: '🤖' },
  { href: '/assistant',   label: 'EduBot',       icon: '💬' },
  { href: '/exams',       label: 'Exams',        icon: '📅' },
  { href: '/community',   label: 'Community',    icon: '🌍' },
  { href: '/messages',    label: 'Messages',     icon: '✉️', badge: 'messages' },
  { href: '/challenges',  label: 'Challenges',   icon: '🏆', badge: 'new' },
  { href: '/income',      label: 'Income Hub',   icon: '💰' },
]

const TOOL_LINKS = [
  { href: '/language',            label: 'Language Learning',   icon: '🌐' },
  { href: '/cv-builder',          label: 'CV Builder',          icon: '📄' },
  { href: '/cover-letter',        label: 'Cover Letter',        icon: '📝' },
  { href: '/interview-simulator', label: 'Interview Sim',       icon: '🎙️' },
  { href: '/tracker',             label: 'App Tracker',         icon: '📊' },
  { href: '/nearby',              label: 'Near Me',             icon: '📍' },
  { href: '/upload',              label: 'Upload Files',        icon: '📤' },
  { href: '/search',              label: 'Search Library',      icon: '🔍' },
  { href: '/analytics',           label: 'Study Analytics',     icon: '📈' },
]

const BOTTOM_LINKS = [
  { href: '/profile',  label: 'My Profile', icon: '👤' },
  { href: '/settings', label: 'Settings',   icon: '⚙️' },
]

export default function Navbar() {
  const { user, profile, signOut } = useUser()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [showMobile, setShowMobile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState({
    unread_messages: 0, unread_insights: 0, upcoming_exams: [],
  })
  const notifBtnRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('navbar_collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => { setShowMobile(false); setShowNotifications(false) }, [router.pathname])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?user_id=${user.id}`)
      const data = await res.json()
      if (!data.error) setNotifications(data)
    } catch {}
  }

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('navbar_collapsed', String(next))
  }

  const go = (href) => {
    setShowMobile(false)
    setShowNotifications(false)
    router.push(href)
  }

  const handleSignOut = async () => {
    setShowMobile(false)
    setShowNotifications(false)
    await signOut()
    router.push('/')
  }

  const isActive = (href) =>
    router.pathname === href || router.pathname.startsWith(href + '/')

  const totalUnread = (notifications.unread_messages || 0) + (notifications.unread_insights || 0)

  const NavItem = ({ href, icon, label, badge, section }) => {
    const active = isActive(href)
    const msgCount = badge === 'messages' ? notifications.unread_messages : 0
    const isNew = badge === 'new'
    return (
      <div
        onClick={() => go(href)}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '10px 0' : '9px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 10, cursor: 'pointer',
          background: active ? 'rgba(37,99,235,0.15)' : 'transparent',
          color: active ? '#60a5fa' : '#64748b',
          transition: 'all 0.15s',
          position: 'relative', marginBottom: 1,
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = '#e2e8f0'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#64748b'
          }
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
        {!collapsed && (
          <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        )}
        {/* Unread message badge */}
        {!collapsed && msgCount > 0 && (
          <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', flexShrink: 0 }}>
            {msgCount > 99 ? '99+' : msgCount}
          </span>
        )}
        {/* "NEW" badge for challenges */}
        {!collapsed && isNew && (
          <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 800, border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>NEW</span>
        )}
        {/* Dot for collapsed state */}
        {collapsed && (msgCount > 0 || isNew) && (
          <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: isNew ? '#f59e0b' : '#ef4444' }} />
        )}
        {/* Active left indicator */}
        {active && (
          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 2px 2px 0', background: '#2563eb' }} />
        )}
      </div>
    )
  }

  const SectionLabel = ({ label }) => !collapsed ? (
    <div style={{ fontSize: 9, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 4px 6px', userSelect: 'none' }}>
      {label}
    </div>
  ) : <div style={{ height: 8 }} />

  return (
    <>
      {/* ── DESKTOP LEFT SIDEBAR ─────────────────────────────── */}
      <div
        className="sidebar-desktop"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1000,
          width: collapsed ? 64 : 224,
          background: 'rgba(10,10,20,0.98)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Logo + collapse button */}
        <div style={{ padding: collapsed ? '14px 0' : '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'space-between', flexShrink: 0 }}>
          {!collapsed ? (
            <div onClick={() => go('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flex: 1, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎓</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#f1f5f9', lineHeight: 1.1, whiteSpace: 'nowrap' }}>EduLink</div>
                <div style={{ fontSize: 9, color: '#60a5fa', fontWeight: 700 }}>Global</div>
              </div>
            </div>
          ) : (
            <div onClick={() => go('/dashboard')} style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>🎓</div>
          )}
          <button
            onClick={toggleCollapse}
            style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 14, padding: 4, flexShrink: 0, borderRadius: 6, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#374151'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Scrollable nav */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.04) transparent' }}>
          <SectionLabel label="Main" />
          {NAV_LINKS.map(link => <NavItem key={link.href} {...link} />)}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

          <SectionLabel label="Career & Tools" />
          {TOOL_LINKS.map(link => <NavItem key={link.href} {...link} />)}
        </div>

        {/* Notification bell */}
        <div style={{ padding: '0 8px', position: 'relative', flexShrink: 0 }}>
          <div
            ref={notifBtnRef}
            onClick={() => setShowNotifications(s => !s)}
            title={collapsed ? 'Notifications' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
              padding: collapsed ? '10px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, cursor: 'pointer',
              background: showNotifications ? 'rgba(37,99,235,0.15)' : 'transparent',
              color: '#64748b', transition: 'all 0.15s', position: 'relative', marginBottom: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { if (!showNotifications) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Notifications</span>}
            {totalUnread > 0 && (
              !collapsed
                ? <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{totalUnread > 99 ? '99+' : totalUnread}</span>
                : <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            )}
          </div>

          {showNotifications && user && (
            <div style={{ position: 'absolute', bottom: '100%', left: collapsed ? 72 : 8, right: collapsed ? 'auto' : 8, zIndex: 9999 }}>
              <NotificationPanel userId={user.id} onClose={() => setShowNotifications(false)} />
            </div>
          )}
        </div>

        {/* Upcoming exam warning */}
        {!collapsed && notifications.upcoming_exams?.[0] && (
          <div onClick={() => go('/exams')} style={{ margin: '0 8px 4px', padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>⏰</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notifications.upcoming_exams[0].module_name?.split(' ').slice(0, 2).join(' ')} soon
              </div>
            </div>
          </div>
        )}

        {/* AI insights alert */}
        {notifications.unread_insights > 0 && (
          <div onClick={() => go('/dashboard')} style={{ margin: '0 8px 4px', padding: collapsed ? '8px 0' : '8px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, justifyContent: collapsed ? 'center' : 'flex-start', flexShrink: 0 }}>
            <span style={{ fontSize: collapsed ? 18 : 14 }}>🤖</span>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700 }}>{notifications.unread_insights} AI insight{notifications.unread_insights !== 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
        )}

        {/* Bottom section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 8px 6px', flexShrink: 0 }}>
          {BOTTOM_LINKS.map(link => <NavItem key={link.href} {...link} />)}

          {/* User avatar */}
          {user && (
            <div
              onClick={() => go('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '8px 0' : '10px 12px', marginTop: 2, borderRadius: 10, cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(37,99,235,0.4)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile?.name || user.email || '?')[0]?.toUpperCase()
                }
              </div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Student'}</div>
                  {profile?.username && <div style={{ fontSize: 10, color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{profile.username}</div>}
                </div>
              )}
            </div>
          )}

          {/* Sign out */}
          <div
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '8px 0' : '8px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 10, cursor: 'pointer', color: '#64748b', transition: 'all 0.1s', marginTop: 2 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
            {!collapsed && <span style={{ fontSize: 13 }}>Sign Out</span>}
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP BAR ────────────────────────────────────── */}
      <div
        className="mobile-topbar"
        style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: 'rgba(10,10,20,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 1000, alignItems: 'center', padding: '0 16px', gap: 12 }}
      >
        <div onClick={() => go('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎓</div>
          <span style={{ fontWeight: 900, fontSize: 14, color: '#f1f5f9' }}>EduLink</span>
          <span style={{ fontSize: 8, color: '#60a5fa', fontWeight: 700, background: 'rgba(37,99,235,0.15)', padding: '1px 5px', borderRadius: 4 }}>Global</span>
        </div>

        {/* Notification bell mobile */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowNotifications(s => !s)} style={{ cursor: 'pointer', padding: 4, position: 'relative' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            {totalUnread > 0 && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 800 }}>{totalUnread}</div>
            )}
          </div>
          {showNotifications && user && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 9999 }}>
              <NotificationPanel userId={user.id} onClose={() => setShowNotifications(false)} />
            </div>
          )}
        </div>

        <button onClick={() => setShowMobile(s => !s)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', padding: 4 }}>
          {showMobile ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {showMobile && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'rgba(10,10,20,0.99)', overflowY: 'auto', padding: '12px 16px 80px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.name || user.email || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{profile?.name || 'Student'}</div>
                {profile?.username && <div style={{ fontSize: 12, color: '#60a5fa' }}>@{profile.username}</div>}
              </div>
              {totalUnread > 0 && (
                <div style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444', fontWeight: 700 }}>{totalUnread} unread</div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[...NAV_LINKS, ...TOOL_LINKS, ...BOTTOM_LINKS].map(link => (
              <div key={link.href + link.label} onClick={() => go(link.href)}
                style={{ padding: '11px 12px', borderRadius: 10, background: isActive(link.href) ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)', color: isActive(link.href) ? '#60a5fa' : '#e2e8f0', fontSize: 13, fontWeight: isActive(link.href) ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{link.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</span>
              </div>
            ))}
          </div>
          <div onClick={handleSignOut} style={{ marginTop: 14, padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
            🚪 Sign Out
          </div>
        </div>
      )}

      {/* Layout CSS */}
      <style>{`
        body { padding-left: ${collapsed ? 64 : 224}px !important; transition: padding-left 0.22s; }
        @media (max-width: 768px) {
          body { padding-left: 0 !important; padding-top: 56px !important; }
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </>
  )
}