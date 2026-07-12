import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useUser } from '../lib/useUser'

const PLANS = [
  {
    id: 'student',
    name: 'Student',
    price: '$9',
    annualPrice: '$79',
    color: '#2563eb',
    popular: false,
    features: ['All 40+ career tools', 'AI CV Builder + ATS checker', 'Cover Letter Generator', 'EduBot AI assistant', '10 mock interviews/month', 'Application tracker', 'Scholarship database'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID || 'price_student',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_ANNUAL_PRICE_ID || 'price_student_annual',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    annualPrice: '$149',
    color: '#7c3aed',
    popular: true,
    features: ['Everything in Student', 'Unlimited mock interviews', 'Portfolio website hosting', 'LinkedIn optimizer + AI rewrite', 'Mentorship matching', 'Priority AI response', 'Career roadmap', 'Export all data as PDF'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    annualPrice: '$399',
    color: '#10b981',
    popular: false,
    features: ['Everything in Pro', 'Up to 10 team members', 'Admin dashboard', 'Bulk CV reviews', 'Group study tools', 'University branding', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || 'price_team',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID || 'price_team_annual',
  },
]

export default function Subscription() {
  const { user, profile, trialDaysLeft, trialExpired, isSubscribed, signOut } = useUser()
  const router = useRouter()
  const [billing, setBilling] = useState('monthly')
  const [checkingOut, setCheckingOut] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  if (isSubscribed) {
    router.push('/dashboard')
    return null
  }

  const handleCheckout = async (plan) => {
    if (!user) { router.push('/login'); return }
    setCheckingOut(plan.id)
    try {
      const priceId = billing === 'annual' ? plan.annualPriceId : plan.priceId
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, planName: plan.name, billing }),
      })
      const { url, error } = await res.json()
      if (error) { showToast('❌ ' + error); setCheckingOut(null); return }
      if (url) window.location.href = url
    } catch (e) {
      showToast('❌ Checkout failed: ' + e.message)
    }
    setCheckingOut(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Background */}
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse,rgba(124,58,237,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>E</div>
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EduLink Global</span>
        </Link>
        {user && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Signed in as {profile?.email || user.email}</span>
            <button onClick={signOut} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Sign out</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '50px 24px 80px' }}>

        {/* Trial expired banner or trial active */}
        {trialExpired ? (
          <div style={{ textAlign: 'center', padding: '28px 24px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 48 }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⏰</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Your Free Trial Has Ended</h1>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              Your 14-day free trial is over. Subscribe to continue accessing all your career tools, saved CVs, cover letters, and progress.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 24px', borderRadius: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 40 }}>
            <div style={{ fontWeight: 800, color: '#10b981', fontSize: 18, marginBottom: 4 }}>🎉 {trialDaysLeft} days left in your free trial</div>
            <p style={{ color: '#6ee7b7', fontSize: 13 }}>Subscribe now to keep uninterrupted access when your trial ends.</p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 12 }}>Choose Your Plan</h2>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>Unlock all 40+ tools. Cancel anytime.</p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
            {['monthly', 'annual'].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: billing === b ? 'rgba(37,99,235,0.3)' : 'transparent', color: billing === b ? '#60a5fa' : '#64748b', transition: 'all 0.2s' }}>
                {b === 'monthly' ? 'Monthly' : <span>Annual <span style={{ fontSize: 10, color: '#10b981' }}>Save 30%</span></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 20, marginBottom: 36 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: plan.popular ? `linear-gradient(135deg,${plan.color}12,rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)', border: `2px solid ${plan.popular ? plan.color : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: 28, position: 'relative', transform: plan.popular ? 'scale(1.02)' : 'scale(1)' }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Most Popular
                </div>
              )}
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20, marginBottom: 16 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: plan.color }}>{billing === 'annual' ? plan.annualPrice : plan.price}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{billing === 'annual' ? '/year' : '/month'}</span>
              </div>

              <button onClick={() => handleCheckout(plan)} disabled={checkingOut === plan.id} style={{ width: '100%', padding: '13px', borderRadius: 11, background: plan.popular ? `linear-gradient(135deg,${plan.color},${plan.color}cc)` : `${plan.color}25`, color: plan.popular ? '#fff' : plan.color, border: plan.popular ? 'none' : `1px solid ${plan.color}50`, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 22, opacity: checkingOut === plan.id ? 0.7 : 1 }}>
                {checkingOut === plan.id ? '⏳ Redirecting to Stripe...' : '💳 Subscribe Now →'}
              </button>

              {plan.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: '🔒', title: 'Secure Payments', desc: 'Powered by Stripe — bank-grade security' },
            { icon: '❌', title: 'Cancel Anytime', desc: 'No contracts. Cancel with one click.' },
            { icon: '💳', title: 'All Cards Accepted', desc: 'Visa, Mastercard, PayPal and more' },
            { icon: '📧', title: 'Instant Access', desc: 'Your account unlocks immediately after payment' },
          ].map((t, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 3 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
          🔒 Your payment is processed securely by Stripe. EduLink never sees or stores your card details. By subscribing you agree to our Terms of Service.
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: 12, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: 14, fontWeight: 600, zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}