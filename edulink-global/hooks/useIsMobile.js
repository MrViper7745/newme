import { useState, useEffect } from 'react'

export default function useIsMobile(breakpoint = 768) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setIsMobile(w < breakpoint)
      setIsTablet(w >= breakpoint && w < 1024)
      setIsLandscape(w > h)
    }
    check()
    setMounted(true)
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [breakpoint])

  // Always return desktop during SSR and first render
  if (!mounted) return { isMobile: false, isTablet: false, isLandscape: false }
  return { isMobile, isTablet, isLandscape }
}