import { useEffect, useRef } from 'react'

export default function useDeviceMotion(onShake, threshold = 15) {
  const last = useRef({ x: 0, y: 0, z: 0 })
  const lastShake = useRef(0)

  useEffect(() => {
    if (!('DeviceMotionEvent' in window)) return
    const handler = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const dx = Math.abs((a.x || 0) - last.current.x)
      const dy = Math.abs((a.y || 0) - last.current.y)
      const dz = Math.abs((a.z || 0) - last.current.z)
      last.current = { x: a.x || 0, y: a.y || 0, z: a.z || 0 }
      if (dx + dy + dz > threshold) {
        const now = Date.now()
        if (now - lastShake.current > 1000) {
          lastShake.current = now
          if (onShake) onShake()
        }
      }
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [onShake, threshold])
}