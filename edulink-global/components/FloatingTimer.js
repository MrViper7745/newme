import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

// ── Shared global state so dashboard and floating widget are the same timer ──
export const timerState = {
  mode: 'study',
  seconds: 25 * 60,
  running: false,
  sessions: 0,
  everStarted: false,
  listeners: new Set(),
  emit() { this.listeners.forEach(fn => fn({ ...this })) },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) },
  start()  { this.running = true;  this.everStarted = true; this.emit() },
  pause()  { this.running = false; this.emit() },
  toggle() { this.running ? this.pause() : this.start() },
  reset()  { this.running = false; this.seconds = this.modeSecs(this.mode); this.emit() },
  setMode(m) { this.mode = m; this.seconds = this.modeSecs(m); this.running = false; this.emit() },
  tick()   { this.seconds--; this.emit() },
  modeSecs(m) { return m === 'study' ? 25*60 : m === 'break' ? 5*60 : 15*60 },
  addSecs(s)  { this.seconds += s; this.emit() },
}

const MODES = {
  study: { label: 'Study',       color: '#2563eb' },
  break: { label: 'Short Break', color: '#10b981' },
  long:  { label: 'Long Break',  color: '#7c3aed' },
}

// ── Hook that any component can use to subscribe to timer ──
export function useTimer() {
  const [state, setState] = useState({ ...timerState })
  useEffect(() => timerState.subscribe(setState), [])
  return state
}

// ── The interval lives here — singleton so it never runs twice ──
let intervalId = null
function ensureInterval() {
  if (intervalId) return
  intervalId = setInterval(() => {
    if (!timerState.running) return
    if (timerState.seconds <= 0) {
      timerState.running = false
      if (timerState.mode === 'study') {
        timerState.sessions++
        const next = timerState.sessions % 4 === 0 ? 'long' : 'break'
        timerState.mode = next
        timerState.seconds = timerState.modeSecs(next)
        // Play a soft beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const o = ctx.createOscillator(); const g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination)
          o.frequency.value = 880; g.gain.value = 0.2
          o.start(); o.stop(ctx.currentTime + 0.4)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        } catch {}
      } else {
        timerState.mode = 'study'
        timerState.seconds = timerState.modeSecs('study')
      }
      timerState.emit()
      return
    }
    timerState.tick()
  }, 1000)
}

if (typeof window !== 'undefined') ensureInterval()

// ── Floating mini widget ── only renders after timer has been started ──
export default function FloatingTimer() {
  const router = useRouter()
  const t = useTimer()
  const [minimized, setMinimized] = useState(true)
  const [visible, setVisible] = useState(false)

  const HIDE_PAGES = ['/', '/login', '/signup', '/register', '/offline', '/dashboard']

  useEffect(() => {
    setVisible(t.everStarted && !HIDE_PAGES.includes(router.pathname))
  }, [t.everStarted, router.pathname])

  if (!visible) return null

  const mins = String(Math.floor(t.seconds / 60)).padStart(2, '0')
  const secs = String(t.seconds % 60).padStart(2, '0')
  const progress = t.seconds / timerState.modeSecs(t.mode)
  const c = MODES[t.mode]?.color || '#2563eb'
  const R = 14, circ = 2 * Math.PI * R

  const goToDashboard = () => router.push('/dashboard')

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 998,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px 8px 10px',
          borderRadius: 40,
          background: 'rgba(13,13,28,0.96)',
          border: `1px solid ${c}50`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 20px ${c}25`,
          cursor: 'pointer',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {/* Mini ring */}
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <svg width={36} height={36} viewBox="0 0 36 36">
            <circle cx={18} cy={18} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
            <circle cx={18} cy={18} r={R} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              transform="rotate(-90 18 18)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#f1f5f9', fontFamily: 'monospace' }}>{mins}:{secs}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: c, lineHeight: 1.1 }}>{MODES[t.mode]?.label}</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>{t.running ? '▶ Running' : '⏸ Paused'}{t.sessions > 0 ? ` · 🍅${t.sessions}` : ''}</div>
        </div>

        {/* Play/pause inline */}
        <button
          onClick={e => { e.stopPropagation(); timerState.toggle() }}
          style={{ width: 24, height: 24, borderRadius: '50%', background: t.running ? 'rgba(239,68,68,0.2)' : `${c}25`, border: `1px solid ${t.running ? 'rgba(239,68,68,0.4)' : c + '50'}`, color: t.running ? '#ef4444' : c, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
          {t.running ? '⏸' : '▶'}
        </button>
      </div>
    )
  }

  // Expanded panel
  const R2 = 44, circ2 = 2 * Math.PI * R2

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 998, width: 256, background: 'rgba(13,13,28,0.97)', border: `1px solid ${c}40`, borderRadius: 18, backdropFilter: 'blur(20px)', boxShadow: `0 8px 40px ${c}20`, overflow: 'hidden' }}>

      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c}15` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>⏱️ Pomodoro</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={goToDashboard} title="Open full timer" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            ↗ Full
          </button>
          <button onClick={() => setMinimized(true)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
        </div>
      </div>

      <div style={{ padding: '14px', textAlign: 'center' }}>
        {/* Mode pills */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {Object.entries(MODES).map(([k, v]) => (
            <button key={k} onClick={() => timerState.setMode(k)} style={{ flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer', background: t.mode === k ? `${v.color}20` : 'transparent', color: t.mode === k ? v.color : '#64748b', border: `1px solid ${t.mode === k ? v.color + '40' : 'transparent'}` }}>
              {k === 'study' ? '📖' : k === 'break' ? '☕' : '🛌'} {v.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Circle */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          <svg width={116} height={116} viewBox="0 0 116 116">
            <circle cx={58} cy={58} r={R2} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <circle cx={58} cy={58} r={R2} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={circ2}
              strokeDashoffset={circ2 * (1 - progress)}
              transform="rotate(-90 58 58)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{mins}:{secs}</div>
            <div style={{ fontSize: 9, color: c, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{MODES[t.mode]?.label}</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button onClick={() => timerState.reset()} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>↺</button>
          <button onClick={() => timerState.toggle()} style={{ flex: 1, padding: '7px', borderRadius: 8, background: t.running ? 'rgba(239,68,68,0.12)' : `${c}20`, border: `1px solid ${t.running ? 'rgba(239,68,68,0.3)' : c + '40'}`, color: t.running ? '#ef4444' : c, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t.running ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>

        {/* +time buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[1, 5, 10].map(m => (
            <button key={m} onClick={() => timerState.addSecs(m * 60)} style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b', fontSize: 10, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = `${c}40` }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
              +{m}m
            </button>
          ))}
        </div>

        {t.sessions > 0 && (
          <div style={{ fontSize: 10, color: '#64748b' }}>🍅 {t.sessions} session{t.sessions !== 1 ? 's' : ''} today</div>
        )}
      </div>
    </div>
  )
}