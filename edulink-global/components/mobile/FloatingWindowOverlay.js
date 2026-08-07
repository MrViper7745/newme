import { useState, useRef } from 'react'
import { useRouter } from 'next/router'

export default function FloatingWindowOverlay({ children, title, onClose }) {
  const [pos, setPos] = useState({ x: 20, y: 100 })
  const [size, setSize] = useState({ w: 300, h: 250 })
  const [minimized, setMinimized] = useState(false)
  const dragStart = useRef(null)

  const onTouchStart = (e) => {
    dragStart.current = { x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y }
  }

  const onTouchMove = (e) => {
    if (!dragStart.current) return
    const newX = Math.max(0, Math.min(window.innerWidth - size.w, e.touches[0].clientX - dragStart.current.x))
    const newY = Math.max(0, Math.min(window.innerHeight - 56, e.touches[0].clientY - dragStart.current.y))
    setPos({ x: newX, y: newY })
  }

  const onTouchEnd = () => { dragStart.current = null }

  return (
    <div style={{
      position: 'fixed',
      left: pos.x, top: pos.y,
      width: minimized ? 160 : size.w,
      height: minimized ? 40 : size.h,
      zIndex: 2000,
      background: 'var(--surface)',
      border: '1px solid rgba(37,99,235,0.4)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      transition: 'width 0.2s, height 0.2s',
    }}>
      {/* Drag handle / header */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ height: 40, background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.1))', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, cursor: 'move', userSelect: 'none' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', cursor: 'pointer', flexShrink: 0 }} onClick={onClose} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', cursor: 'pointer', flexShrink: 0 }} onClick={() => setMinimized(m => !m)} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      </div>
      {!minimized && <div style={{ height: size.h - 40, overflowY: 'auto' }}>{children}</div>}
    </div>
  )
}