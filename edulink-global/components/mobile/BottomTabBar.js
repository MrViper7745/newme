import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useHaptic from '../../hooks/useHaptic'

const TABS = [
  { href: '/dashboard',  icon: '🏠', label: 'Home',      active: ['/dashboard'] },
  { href: '/library',    icon: '📚', label: 'Library',   active: ['/library', '/upload', '/search'] },
  { href: '/community',  icon: '🌍', label: 'Community', active: ['/community', '/messages'] },
  { href: '/challenges', icon: '🏆', label: 'Challenges',active: ['/challenges'] },
  { href: null,          icon: '⋯',  label: 'More',      active: [] },
]

const MORE_ITEMS = [
  { href: '/study-ai',            icon: '🤖', label: 'Study AI' },
  { href: '/assistant',           icon: '💬', label: 'EduBot' },
  { href: '/exams',               icon: '📅', label: 'Exams' },
  { href: '/analytics',           icon: '📈', label: 'Analytics' },
  { href: '/language',            icon: '🌐', label: 'Language' },
  { href: '/cv-builder',          icon: '📄', label: 'CV Builder' },
  { href: '/cover-letter',        icon: '📝', label: 'Cover Letter' },
  { href: '/interview-simulator', icon: '🎙️', label: 'Interview' },
  { href: '/tracker',             icon: '📊', label: 'App Tracker' },
  { href: '/income',              icon: '💰', label: 'Income' },
  { href: '/nearby',              icon: '📍', label: 'Near Me' },
  { href: '/profile',             icon: '👤', label: 'Profile' },
  { href: '/settings',            icon: '⚙️', label: 'Settings' },
]

export default function BottomTabBar({ notifications = {} }) {
  const router = useRouter()
  const haptic = useHaptic()
  const [showMore, setShowMore] = useState(false)

  useEffect(() => { setShowMore(false) }, [router.pathname])

  const go = (href) => { haptic.tap(); setShowMore(false); router.push(href) }

  const isActive = (tab) => {
    if (!tab.active?.length) return false
    return tab.active.some(p => router.pathname === p || router.pathname.startsWith(p + '/'))
  }

  const msgBadge  = notifications.unread_messages  || 0
  const aisBadge  = notifications.unread_insights   || 0

  return (
    <>
      {showMore && (
        <>
          <div onClick={() => setShowMore(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 65, left: 0, right: 0, zIndex: 999,
            background: 'var(--surface)', borderTop: '1px solid var(--border)',
            borderRadius: '20px 20px 0 0', padding: '12px 16px 20px',
            maxHeight: '72vh', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>All Pages</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {MORE_ITEMS.map(item => {
                const active = router.pathname === item.href
                return (
                  <div key={item.href} onClick={() => go(item.href)}
                    style={{ padding: '14px 8px', borderRadius: 12, background: active ? 'rgba(37,99,235,0.12)' : 'var(--surface2)', border: `1px solid ${active ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{item.icon}</div>
                    <div style={{ fontSize: 10, color: active ? '#60a5fa' : 'var(--text2)', fontWeight: active ? 700 : 400 }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 997,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', height: 65,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map((tab, i) => {
          const active = isActive(tab)
          const isMore = tab.href === null
          const badge =
            tab.href === '/community' || tab.href === '/messages' ? msgBadge :
            tab.href === '/dashboard' ? aisBadge : 0

          return (
            <div key={i}
              onClick={() => isMore ? setShowMore(s => !s) : go(tab.href)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', position: 'relative', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}>

              {active && (
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, borderRadius: '0 0 3px 3px', background: 'var(--accent)' }} />
              )}

              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: 22, lineHeight: 1, display: 'block', transform: active ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s' }}>
                  {isMore && showMore ? '✕' : tab.icon}
                </span>
                {badge > 0 && (
                  <div style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7, background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </div>

              <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.15s' }}>
                {tab.label}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}