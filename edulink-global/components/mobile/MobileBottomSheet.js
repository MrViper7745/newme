import { useEffect, useRef, useState } from 'react'

export default function MobileBottomSheet({
  open, onClose, children, title,
  height = '70vh', fullscreen = false,
}) {
  const startY = useRef(null)
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const onTouchMove  = (e) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd   = () => {
    if (dragY > 100) onClose()
    else setDragY(0)
    startY.current = null
  }

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1998, backdropFilter: 'blur(4px)' }} />
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1999,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: fullscreen ? 0 : '20px 20px 0 0',
          height: fullscreen ? '100dvh' : height,
          display: 'flex', flexDirection: 'column',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' : 'none',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        <div style={{ padding: '10px 0 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', cursor: 'grab' }} />
          {title && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 16px' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{title}</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  )
}