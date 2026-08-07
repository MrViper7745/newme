import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function useSwipeBack(enabled = true) {
  const router = useRouter()
  const startX = useRef(null)
  const startY = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const onStart = (e) => {
      const t = e.touches?.[0]
      if (!t) return
      startX.current = t.clientX
      startY.current = t.clientY
    }
    const onEnd = (e) => {
      if (startX.current === null) return
      const t = e.changedTouches?.[0]
      if (!t) return
      const dx = t.clientX - startX.current
      const dy = Math.abs(t.clientY - startY.current)
      if (dx > 80 && dy < 60 && startX.current < 40) router.back()
      startX.current = null
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [enabled, router])
}