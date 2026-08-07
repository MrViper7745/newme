import { useState, useEffect } from 'react'
import useHaptic from '../../hooks/useHaptic'

export default function GhostModeToggle({ style }) {
  const haptic = useHaptic()
  const [active, setActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('ghost_mode_until')
    if (stored && Date.now() < parseInt(stored)) {
      setActive(true)
      setTimeLeft(Math.ceil((parseInt(stored) - Date.now()) / 60000))
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const stored = localStorage.getItem('ghost_mode_until')
      if (!stored || Date.now() >= parseInt(stored)) { setActive(false); setTimeLeft(null); clearInterval(t) }
      else setTimeLeft(Math.ceil((parseInt(stored) - Date.now()) / 60000))
    }, 30000)
    return () => clearInterval(t)
  }, [active])

  const toggle = () => {
    haptic.tap()
    if (active) {
      localStorage.removeItem('ghost_mode_until')
      setActive(false); setTimeLeft(null)
    } else {
      const until = Date.now() + 60 * 60 * 1000 // 1 hour
      localStorage.setItem('ghost_mode_until', String(until))
      setActive(true); setTimeLeft(60)
    }
  }

  return (
    <div style={style}>
      <div onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: active ? 'rgba(124,58,237,0.1)' : 'var(--surface)', border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
        <span style={{ fontSize: 20 }}>{active ? '👻' : '👤'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#a78bfa' : 'var(--text)' }}>
            Ghost Mode {active ? 'ON' : 'OFF'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {active ? `No tracking for ${timeLeft}min · No points earned` : 'Study without recording anything'}
          </div>
        </div>
        <div style={{ width: 42, height: 24, borderRadius: 12, background: active ? '#7c3aed' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: active ? 20 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </div>
      </div>
      {active && (
        <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 9, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', fontSize: 11, color: '#a78bfa', lineHeight: 1.5 }}>
          👻 Ghost Mode active — nothing is being saved, no points are being earned, and you are shown as offline to other students.
        </div>
      )}
    </div>
  )
}