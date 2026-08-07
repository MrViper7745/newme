import { useState, useRef, useCallback } from 'react'

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullY, setPullY] = useState(0)
  const startY = useRef(null)
  const ref = useRef(null)
  const THRESHOLD = 70

  const onTouchStart = useCallback((e) => {
    if (ref.current?.scrollTop === 0) startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0 && ref.current?.scrollTop === 0) {
      setPulling(true)
      setPullY(Math.min(dy * 0.5, THRESHOLD + 20))
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true)
      setPullY(40)
      try { await onRefresh() } catch {}
      setRefreshing(false)
    }
    setPulling(false)
    setPullY(0)
    startY.current = null
  }, [pullY, onRefresh])

  return (
    <div ref={ref}
      style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(pulling || refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: `${pullY}px`, overflow: 'hidden', transition: pulling ? 'none' : 'height 0.3s' }}>
          {refreshing
            ? <div style={{ width: 22, height: 22, border: '2px solid rgba(37,99,235,0.2)', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <span style={{ fontSize: 20, transform: `rotate(${pullY * 3}deg)`, display: 'block' }}>↓</span>
          }
        </div>
      )}
      {children}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}