import MobileOnboarding from '../../components/mobile/MobileOnboarding'
import { useRouter } from 'next/router'
import { useUser } from '../../lib/useUser'

export default function MobileOnboardingFlow() {
  const router = useRouter()
  const { user } = useUser()

  return (
    <MobileOnboarding
      userId={user?.id}
      onComplete={() => router.push('/dashboard')}
    />
  )
}