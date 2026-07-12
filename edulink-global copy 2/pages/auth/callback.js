import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data?.session) {
        // Ensure profile exists with trial_start
        const user = data.session.user
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            trial_start: new Date().toISOString(),
            subscription_status: 'trial',
          })
        }
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
    handleCallback()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Completing sign in...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}