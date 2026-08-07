import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import BottomTabBar from './BottomTabBar'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import useNetworkStatus from '../../hooks/useNetworkStatus'
import useBattery from '../../hooks/useBattery'

export default function MobileLayout({
  children,
  title,
  showBack = false,
  onBack,
  rightAction,
  noPadding = false,
}) {
  const router = useRouter()
  const { user } = useUser()
  const { online, slow } = useNetworkStatus()
  const { low: batteryLow } = useBattery()
  const [notifications, setNotifications] = useState({ unread_messages: 0, unread_insights: 0 })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?user_id=${user.id}`)
        const d = await res.json()
        if (!d.error) setNotifications(d)
      } catch {}
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [user])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {!online && (
        <div style={{ background: '#ef4444', color: '#fff', textAlign: 'center', padding: '6px 16px', fontSize: 12, fontWeight: 700, position: 'sticky', top: 0, zIndex: 1002 }}>
          📴 You are offline — showing cached content
        </div>
      )}

      {online && slow && (
        <div style={{ background: 'rgba(245,158,11,0.9)', color: '#fff', textAlign: 'center', padding: '4px 16px', fontSize: 11, fontWeight: 600 }}>
          🐌 Slow connection — data saver active
        </div>
      )}

      {batteryLow && (
        <div style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', textAlign: 'center', padding: '4px 16px', fontSize: 11, fontWeight: 600, borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          🔋 Battery low — reduced mode active
        </div>
      )}

      {title !== false && (
        <div style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(20px)', flexShrink: 0 }}>
          {showBack ? (
            <button onClick={onBack || (() => router.back())}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, flexShrink: 0 }}>
              ← Back
            </button>
          ) : (
            <div onClick={() => router.push('/dashboard')} style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>
              🎓
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </div>
            )}
          </div>

          {rightAction && <div style={{ flexShrink: 0 }}>{rightAction}</div>}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: noPadding ? 65 : 80, WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>

      <BottomTabBar notifications={notifications} />
    </div>
  )
}