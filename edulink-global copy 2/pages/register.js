import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useUser } from '../lib/useUser'

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useUser()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const validatePassword = (p) => {
    if (p.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(p)) return 'Password must include at least one uppercase letter'
    if (!/[0-9]/.test(p)) return 'Password must include at least one number'
    return null
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!name || !email || !password || !confirmPassword) { setError('Please fill in all fields'); return }
    if (!agreed) { setError('Please agree to the Terms of Service to continue'); return }
    const pwError = validatePassword(password)
    if (pwError) { setError(pwError); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true); setError('')
    const { data, error: err } = await signUpWithEmail(email, password, name)
    if (err) {
      if (err.message.includes('already registered')) setError('An account with this email already exists. Try signing in instead.')
      else setError(err.message)
      setLoading(false)
      return
    }
    if (data?.user && !data?.session) {
      setSuccess('✅ Check your email to confirm your account, then sign in!')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    if (!agreed) { setError('Please agree to the Terms of Service to continue'); return }
    setGoogleLoading(true); setError('')
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const pwStrength = (() => {
    if (!password) return null
    const err = validatePassword(password)
    if (!err && password.length >= 12) return { label: 'Strong', color: '#10b981' }
    if (!err) return { label: 'Good', color: '#f59e0b' }
    return { label: 'Weak', color: '#ef4444' }
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 400, background: 'radial-gradient(ellipse,rgba(124,58,237,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>E</div>
            <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EduLink Global</span>
          </Link>
        </div>

        {/* Trial banner */}
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, color: '#10b981', fontSize: 14, marginBottom: 2 }}>🎉 14-Day Free Trial</div>
          <div style={{ fontSize: 12, color: '#6ee7b7' }}>Full access to all 40+ tools. No credit card required.</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '32px 28px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 4 }}>Create your account</h1>
          <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>Join students from 120+ countries</p>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading} style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, opacity: googleLoading ? 0.7 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {googleLoading ? 'Connecting...' : 'Sign up with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: '#374151' }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={handleRegister}>
            {[
              { label: 'Full Name', val: name, set: setName, type: 'text', ph: 'Amara Osei' },
              { label: 'Email Address', val: email, set: setEmail, type: 'email', ph: 'you@email.com' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }} />
              </div>
            ))}

            {/* Password with strength */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 chars, 1 uppercase, 1 number" style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPass ? '🙈' : '👁'}</button>
              </div>
              {pwStrength && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pwStrength.label === 'Strong' ? '100%' : pwStrength.label === 'Good' ? '60%' : '30%', background: pwStrength.color, borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: pwStrength.color, fontWeight: 700 }}>{pwStrength.label}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : confirmPassword && confirmPassword === password ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`, color: '#f1f5f9', outline: 'none' }} />
              {confirmPassword && confirmPassword !== password && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords do not match</div>}
              {confirmPassword && confirmPassword === password && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>✓ Passwords match</div>}
            </div>

            {/* Terms */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
              <div onClick={() => setAgreed(!agreed)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${agreed ? '#2563eb' : 'rgba(255,255,255,0.2)'}`, background: agreed ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}>
                {agreed && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                I agree to the <span style={{ color: '#60a5fa', cursor: 'pointer' }}>Terms of Service</span> and <span style={{ color: '#60a5fa', cursor: 'pointer' }}>Privacy Policy</span>. I understand my 14-day free trial begins immediately.
              </span>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}
            {success && <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7', fontSize: 13, marginBottom: 16 }}>{success}</div>}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 11, background: loading ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Creating account...' : '🚀 Start Free Trial'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}