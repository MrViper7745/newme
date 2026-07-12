import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useUser } from '../lib/useUser'

export default function Login() {
  const { signInWithEmail, signInWithGoogle, resetPassword } = useUser()
  const router = useRouter()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    const { error: err } = await signInWithEmail(email, password)
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : err.message
      )
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('')
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!email) { setError('Enter your email address'); return }
    setLoading(true); setError('')
    const { error: err } = await resetPassword(email)
    if (err) setError(err.message)
    else setSuccess('✅ Password reset email sent! Check your inbox and spam folder.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    fontSize: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: 12,
    color: '#64748b',
    display: 'block',
    marginBottom: 6,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 400,
        background: 'radial-gradient(ellipse,rgba(37,99,235,0.12) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff',
            }}>E</div>
            <span style={{
              fontSize: 20, fontWeight: 800,
              background: 'linear-gradient(135deg,#60a5fa,#a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>EduLink Global</span>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '36px 32px',
        }}>

          {/* ── LOGIN MODE ── */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 6 }}>
                Welcome back
              </h1>
              <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
                Sign in to your EduLink account
              </p>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 11,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f1f5f9', fontWeight: 600, fontSize: 14,
                  cursor: googleLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  marginBottom: 20, opacity: googleLoading ? 0.7 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 12, color: '#374151' }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Email/password form */}
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        color: '#64748b', cursor: 'pointer', fontSize: 16,
                      }}
                    >
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                    style={{
                      background: 'none', border: 'none',
                      color: '#60a5fa', fontSize: 13,
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 9,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5', fontSize: 13, marginBottom: 16,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 11,
                    background: loading
                      ? 'rgba(37,99,235,0.4)'
                      : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                    color: '#fff', border: 'none',
                    fontWeight: 800, fontSize: 15,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? '⏳ Signing in...' : 'Sign In →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 24 }}>
                Don't have an account?{' '}
                <Link href="/register" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
                  Start free trial →
                </Link>
              </p>
            </>
          )}

          {/* ── FORGOT PASSWORD MODE ── */}
          {mode === 'forgot' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>
                  Reset your password
                </h1>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                  Enter your email and we'll send a reset link to your inbox.
                </p>
              </div>

              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 9,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5', fontSize: 13, marginBottom: 16,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {success && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 9,
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#6ee7b7', fontSize: 13, marginBottom: 16,
                  }}>
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 11,
                    background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                    color: '#fff', border: 'none',
                    fontWeight: 800, fontSize: 15,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: 12, opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? '⏳ Sending...' : '📧 Send Reset Email'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 10,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ← Back to Sign In
                </button>
              </form>
            </>
          )}

        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #374151; }
        input:focus { border-color: rgba(37,99,235,0.5) !important; }
      `}</style>
    </div>
  )
}