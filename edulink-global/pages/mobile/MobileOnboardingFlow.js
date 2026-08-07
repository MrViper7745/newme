import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MobileOnboardingFlow() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [])
  return null
}