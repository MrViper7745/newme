import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the access token in the URL hash on redirect
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      setReady(true)
    } else {
      // Try checking if there's an active session
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) setReady(true)
        else setError('Invalid or expired reset link. Please request a new one.')
      })
    }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (!password || !confirmPassword) { setError('Fill in both fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) setError(err.message)
    else { setSuccess(true); setTimeout(() => router.push('/login'), 3000) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>E</div>
            <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EduLink Global</span>
          </Link>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '32px 28px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 20, marginBottom: 8 }}>Password updated!</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Redirecting you to sign in...</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Set new password</h1>
                <p style={{ color: '#64748b', fontSize: 13 }}>Choose a strong password for your account</p>
              </div>

              {!ready && !error && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Verifying reset link...</div>}

              {ready && (
                <form onSubmit={handleReset}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }} />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPass ? '🙈' : '👁'}</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : confirmPassword && confirmPassword === password ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`, color: '#f1f5f9', outline: 'none' }} />
                    {confirmPassword && confirmPassword === password && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>✓ Passwords match</div>}
                  </div>

                  {error && <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                    {loading ? '⏳ Updating...' : '🔐 Update Password'}
                  </button>
                </form>
              )}

              {error && !ready && (
                <Link href="/login" style={{ display: 'block', marginTop: 16, textAlign: 'center', color: '#60a5fa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to Sign In</Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}