import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useUser() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (u) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (data) {
      setProfile(data)
    } else {
      // Create profile if missing — set trial_start now
      const newProfile = {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
        avatar_url: u.user_metadata?.avatar_url || '',
        trial_start: new Date().toISOString(),
        subscription_status: 'trial',
      }
      await supabase.from('profiles').insert(newProfile)
      setProfile(newProfile)
    }
    setLoading(false)
  }

  // ── Trial & subscription helpers ──────────────────────
  const trialDaysLeft = (() => {
    if (!profile?.trial_start) return 14
    const start = new Date(profile.trial_start)
    const now = new Date()
    const diff = Math.ceil(14 - (now - start) / 86400000)
    return Math.max(0, diff)
  })()

  const trialExpired = trialDaysLeft === 0
  const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'subscribed'
  const hasAccess = isSubscribed || !trialExpired

  // ── Auth methods ───────────────────────────────────────
  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        trial_start: new Date().toISOString(),
        subscription_status: 'trial',
      })
    }
    return { data, error }
  }

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

  const signOut = () => supabase.auth.signOut()

  return {
    user, profile, loading,
    isSubscribed, trialDaysLeft, trialExpired, hasAccess,
    signInWithGoogle, signInWithEmail, signUpWithEmail,
    resetPassword, signOut,
  }
}