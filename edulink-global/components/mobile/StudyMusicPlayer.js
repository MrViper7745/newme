import { useState, useRef, useEffect } from 'react'
import useHaptic from '../../hooks/useHaptic'

const STATIONS = [
  { id: 'focus',    label: 'Deep Focus',          emoji: '🎯', color: '#2563eb', url: 'https://www.youtube.com/results?search_query=lofi+hip+hop+study+focus+mix' },
  { id: 'light',    label: 'Light Review',         emoji: '📖', color: '#10b981', url: 'https://www.youtube.com/results?search_query=lofi+chill+study+beats' },
  { id: 'creative', label: 'Creative Problem Solve',emoji: '💡', color: '#7c3aed', url: 'https://www.youtube.com/results?search_query=ambient+music+studying+creativity' },
  { id: 'exam',     label: 'Exam Prep',            emoji: '📝', color: '#ef4444', url: 'https://www.youtube.com/results?search_query=classical+music+study+exam+preparation' },
  { id: 'nature',   label: 'Nature Sounds',        emoji: '🌿', color: '#059669', url: 'https://www.youtube.com/results?search_query=nature+sounds+rain+studying+focus' },
]

export default function StudyMusicPlayer({ minimized = false }) {
  const haptic = useHaptic()
  const [active, setActive] = useState(null)
  const [expanded, setExpanded] = useState(!minimized)
  const [volume, setVolume] = useState(70)

  const openStation = (station) => {
    haptic.tap()
    setActive(station)
    window.open(station.url, '_blank')
  }

  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
        <span style={{ fontSize: 18 }}>🎵</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Study Music</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{active ? `Playing: ${active.label}` : 'Tap to select a station'}</div>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 14 }}>›</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>🎵 Study Music</div>
        <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>−</button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
          Opens YouTube search in a new tab. No ads built in — use YouTube Premium or an ad blocker for distraction-free studying.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STATIONS.map(station => (
            <div key={station.id} onClick={() => openStation(station)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, background: active?.id === station.id ? `${station.color}12` : 'var(--surface2)', border: `1px solid ${active?.id === station.id ? station.color + '30' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{station.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: active?.id === station.id ? station.color : 'var(--text)' }}>{station.label}</div>
              </div>
              <span style={{ fontSize: 11, color: station.color, fontWeight: 600 }}>▶</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}