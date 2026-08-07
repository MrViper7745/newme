import { useState, useRef } from 'react'

export default function useWakeLock() {
  const [active, setActive] = useState(false)
  const lock = useRef(null)

  const request = async () => {
    try {
      if ('wakeLock' in navigator) {
        lock.current = await navigator.wakeLock.request('screen')
        lock.current.addEventListener('release', () => setActive(false))
        setActive(true)
      }
    } catch {}
  }

  const release = async () => {
    try {
      if (lock.current) { await lock.current.release(); lock.current = null; setActive(false) }
    } catch {}
  }

  return { active, request, release }
}