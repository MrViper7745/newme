import { useState, useRef } from 'react'
import useHaptic from '../../hooks/useHaptic'

export default function SwipeableCards({ cards, onSwipeLeft, onSwipeRight, renderCard }) {
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState({ x: 0, dragging: false })
  const startX = useRef(null)
  const haptic = useHaptic()

  if (!cards?.length || idx >= cards.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>All done!</div>
      </div>
    )
  }

  const card = cards[idx]
  const rotation = drag.x * 0.08
  const opacity = 1 - Math.abs(drag.x) / 300
  const leftSignal = drag.x < -40
  const rightSignal = drag.x > 40

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setDrag({ x: 0, dragging: true }) }
  const onTouchMove = (e) => {
    if (!drag.dragging || startX.current === null) return
    setDrag({ x: e.touches[0].clientX - startX.current, dragging: true })
  }
  const onTouchEnd = () => {
    if (Math.abs(drag.x) > 80) {
      if (drag.x < 0) { haptic.wrong(); if (onSwipeLeft) onSwipeLeft(card) }
      else { haptic.correct(); if (onSwipeRight) onSwipeRight(card) }
      setIdx(i => i + 1)
    }
    setDrag({ x: 0, dragging: false })
    startX.current = null
  }

  return (
    <div style={{ position: 'relative', padding: '20px 16px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
        {cards.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < idx ? '#10b981' : i === idx ? '#2563eb' : 'var(--surface2)' }} />)}
      </div>

      {/* Swipe indicators */}
      <div style={{ position: 'absolute', top: '50%', left: 24, fontSize: 28, opacity: leftSignal ? 1 : 0, transition: 'opacity 0.1s', color: '#ef4444', transform: 'translateY(-50%)' }}>✗</div>
      <div style={{ position: 'absolute', top: '50%', right: 24, fontSize: 28, opacity: rightSignal ? 1 : 0, transition: 'opacity 0.1s', color: '#10b981', transform: 'translateY(-50%)' }}>✓</div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${drag.x}px) rotate(${rotation}deg)`,
          opacity,
          transition: drag.dragging ? 'none' : 'transform 0.3s, opacity 0.3s',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}>
        {renderCard(card, idx)}
      </div>

      {/* Swipe hint */}
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--text3)' }}>
        ← Swipe left to review again · Swipe right if you know it →
      </div>
    </div>
  )
}