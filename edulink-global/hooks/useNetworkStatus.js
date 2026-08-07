import { useState, useEffect } from 'react'

export default function useNetworkStatus() {
  const [online, setOnline] = useState(true)
  const [type, setType] = useState('unknown')
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine)
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (conn) {
        setType(conn.effectiveType || 'unknown')
        setSlow(['slow-2g', '2g'].includes(conn.effectiveType))
      }
    }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    const conn = navigator.connection
    if (conn) conn.addEventListener('change', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      if (conn) conn.removeEventListener('change', update)
    }
  }, [])

  return { online, type, slow }
}