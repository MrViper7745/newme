import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '../lib/useUser'
import { useRouter } from 'next/router'

const FEATURES_GROUPED = [
  {
    group: '🚀 Career Building',
    color: '#2563eb',
    items: ['AI CV Builder with ATS Score', 'Cover Letter Generator', 'Portfolio Builder', 'LinkedIn Profile Optimizer', 'Career Roadmap (5-Year Plan)'],
  },
  {
    group: '🎓 Job Hunting',
    color: '#7c3aed',
    items: ['500+ Internship Listings', '200+ Scholarships', 'Application Tracker (Kanban)', 'AI Mock Interviews', 'Interview Simulator with Scoring'],
  },
  {
    group: '🤖 AI Tools',
    color: '#10b981',
    items: ['EduBot AI Career Assistant', 'Study AI (7 tools)', 'Email Generator (8 types)', 'AI Job Match Recommendations', 'Research Paper Finder + Summaries'],
  },
  {
    group: '📚 Learning & Growth',
    color: '#f59e0b',
    items: ['Course Recommendations', 'Language Learning (German, French)', 'Career Readiness Quiz', 'Exam Timetable Planner', 'Internship Logbook'],
  },
  {
    group: '💼 Professional Tools',
    color: '#06b6d4',
    items: ['Salary Explorer', 'Freelance & Side Hustle Tracker', 'Networking Contact Manager', 'Mentorship Matching', 'Visa & Work Permit Guide'],
  },
  {
    group: '🌱 Personal Development',
    color: '#ef4444',
    items: ['Goal Tracker with Milestones', 'Wellness & Mental Health Check-in', 'Budget Calculator (10 Cities)', 'Reminders & Deadline Alerts', 'Leaderboard & Achievement Badges'],
  },
]

const PLANS = [
  {
    id: 'student',
    name: 'Student',
    price: '$9',
    period: '/month',
    annualPrice: '$79',
    color: '#2563eb',
    popular: false,
    description: 'Everything you need to land your first internship',
    features: [
      'All 40+ career tools',
      'AI CV Builder + ATS checker',
      'Cover Letter Generator',
      'EduBot AI assistant',
      '10 mock interviews/month',
      'Application tracker',
      'Scholarship database',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID || 'price_student',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    annualPrice: '$149',
    color: '#7c3aed',
    popular: true,
    description: 'For serious career builders who want every advantage',
    features: [
      'Everything in Student',
      'Unlimited mock interviews',
      'Portfolio website hosting',
      'LinkedIn optimizer with AI rewrite',
      'Mentorship matching',
      'Priority AI response',
      'Career roadmap planning',
      'Export all data as PDF',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    period: '/month',
    annualPrice: '$399',
    color: '#10b981',
    popular: false,
    description: 'For university career offices and student groups',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Admin dashboard',
      'Bulk CV reviews',
      'Group study tools',
      'University branding',
      'Usage analytics',
      'Priority support',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || 'price_team',
  },
]

const STATS = [
  { value: '120+', label: 'Countries' },
  { value: '40+', label: 'Career Tools' },
  { value: '500+', label: 'Internships' },
  { value: '200+', label: 'Scholarships' },
  { value: '14 Days', label: 'Free Trial' },
]

const TESTIMONIALS = [
  { name: 'Amara Osei', country: '🇬🇭 Ghana → London', text: 'EduLink helped me land a software internship at a UK fintech in 3 months. The CV builder and mock interviews were game changers.', role: 'Software Intern, London' },
  { name: 'Fatima Al-Hassan', country: '🇳🇬 Nigeria → Canada', text: 'The scholarship database and cover letter generator saved me weeks of work. I got full funding for my Masters.', role: 'MSc Student, Toronto' },
  { name: 'Sipho Dlamini', country: '🇿🇦 South Africa', text: 'I built my portfolio, fixed my LinkedIn, and got 3 interview calls in one week. This platform is genuinely different.', role: 'Data Analyst, Johannesburg' },
]

export default function Landing() {
  const { user, hasAccess } = useUser()
  const router = useRouter()
  const [billing, setBilling] = useState('monthly')
  const [checkingOut, setCheckingOut] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  const handleGetStarted = () => {
    if (user && hasAccess) router.push('/dashboard')
    else if (user) router.push('/subscription')
    else router.push('/register')
  }

  const handlePlanCheckout = async (plan) => {
    if (!user) { router.push('/register'); return }
    setCheckingOut(plan.id)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, planName: plan.name, billing }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {}
    setCheckingOut(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>E</div>
          <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EduLink Global</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="#features" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', padding: '6px 12px', display: window?.innerWidth < 640 ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', padding: '6px 12px', display: window?.innerWidth < 640 ? 'none' : 'block' }}>Pricing</a>
          {user ? (
            <button onClick={() => router.push(hasAccess ? '/dashboard' : '/subscription')} style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Dashboard →</button>
          ) : (
            <>
              <Link href="/login" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', padding: '8px 14px' }}>Sign In</Link>
              <Link href="/register" style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Start Free Trial</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(37,99,235,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '20%', width: 300, height: 300, background: 'radial-gradient(ellipse,rgba(124,58,237,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)', fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          Free 14-day trial · No credit card required
        </div>

        <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.08, marginBottom: 24, maxWidth: 800 }}>
          <span style={{ background: 'linear-gradient(135deg,#f1f5f9 30%,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Career Starts</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Here. Now. Free.</span>
        </h1>

        <p style={{ fontSize: 'clamp(15px,2vw,20px)', color: '#94a3b8', lineHeight: 1.7, maxWidth: 600, marginBottom: 40 }}>
          EduLink Global gives students from 120+ countries the AI tools, internships, scholarships, and career guidance they need to compete with anyone — anywhere in the world.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 }}>
          <button onClick={handleGetStarted} style={{ padding: '15px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 32px rgba(37,99,235,0.4)' }}>
            {user ? (hasAccess ? 'Go to Dashboard →' : 'View Plans →') : 'Start Free Trial →'}
          </button>
          <a href="#features" style={{ padding: '15px 36px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            See All Features
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexWrap: 'wrap', justifyContent: 'center' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ padding: '18px 32px', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Everything You Need</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 14 }}>40+ Tools. One Platform.</h2>
          <p style={{ color: '#64748b', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>Every career tool a student needs, grouped by what you are trying to achieve.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
          {FEATURES_GROUPED.map((group) => (
            <div key={group.group} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${group.color}25`, borderRadius: 16, padding: 24, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${group.color}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${group.color}25`}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color }} />
                {group.group}
              </div>
              {group.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ color: group.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 48 }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Sign Up Free', desc: 'Create your account. No credit card needed. 14-day full access trial starts immediately.', icon: '👤' },
              { step: '02', title: 'Build Your Profile', desc: 'Complete your CV, set your career goals, and let AI personalise your experience.', icon: '📄' },
              { step: '03', title: 'Use the Tools', desc: 'Apply to internships, generate cover letters, practise interviews, and track everything.', icon: '🛠' },
              { step: '04', title: 'Land Opportunities', desc: 'Get hired, win scholarships, and build the career you deserve from anywhere in the world.', icon: '🎯' },
            ].map((s, i) => (
              <div key={i} style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(124,58,237,0.2))', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {s.step}</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '90px 24px', maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Simple Pricing</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 14 }}>Start Free. Upgrade When Ready.</h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 28 }}>14-day free trial on all plans. Cancel anytime.</p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
            {['monthly', 'annual'].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: billing === b ? 'rgba(37,99,235,0.3)' : 'transparent', color: billing === b ? '#60a5fa' : '#64748b', transition: 'all 0.2s' }}>
                {b === 'monthly' ? 'Monthly' : 'Annual'} {b === 'annual' && <span style={{ fontSize: 10, color: '#10b981', marginLeft: 4 }}>Save 30%</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24, alignItems: 'start' }}>
          {PLANS.map((plan) => (
            <div key={plan.id} style={{ background: plan.popular ? `linear-gradient(135deg,${plan.color}15,rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)', border: `2px solid ${plan.popular ? plan.color : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: 30, position: 'relative', transform: plan.popular ? 'scale(1.03)' : 'scale(1)' }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${plan.color},${plan.color}cc)`, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Most Popular
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{plan.description}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 46, fontWeight: 900, color: plan.color }}>{billing === 'annual' ? plan.annualPrice : plan.price}</span>
                  <span style={{ fontSize: 14, color: '#64748b' }}>{billing === 'annual' ? '/year' : '/month'}</span>
                </div>
                {billing === 'annual' && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Saves vs monthly billing</div>}
              </div>

              <button onClick={() => handlePlanCheckout(plan)} disabled={checkingOut === plan.id} style={{ width: '100%', padding: '13px', borderRadius: 11, background: plan.popular ? `linear-gradient(135deg,${plan.color},${plan.color}cc)` : `rgba(${plan.color === '#2563eb' ? '37,99,235' : plan.color === '#10b981' ? '16,185,129' : '124,58,237'},0.2)`, color: plan.popular ? '#fff' : plan.color, border: plan.popular ? 'none' : `1px solid ${plan.color}40`, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 24, opacity: checkingOut === plan.id ? 0.7 : 1 }}>
                {checkingOut === plan.id ? '⏳ Redirecting...' : user ? 'Subscribe Now →' : 'Start Free Trial →'}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: plan.color, fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Free trial note */}
        <div style={{ textAlign: 'center', marginTop: 40, padding: '20px 24px', borderRadius: 14, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: 15, marginBottom: 6 }}>🎉 All plans start with a 14-day free trial</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Full access to all features. No credit card required to start. Cancel or downgrade at any time.</div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 40 }}>Students Already Winning</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 20, marginBottom: 12 }}>⭐⭐⭐⭐⭐</div>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>"{t.text}"</p>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{t.country}</div>
                  <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 16 }}>Ready to build your future?</h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32 }}>Join thousands of students from 120+ countries who are using EduLink to land internships, win scholarships, and build careers they love.</p>
          <button onClick={handleGetStarted} style={{ padding: '16px 44px', borderRadius: 14, background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 0 40px rgba(37,99,235,0.35)' }}>
            {user ? 'Go to Dashboard →' : 'Start Free — No Credit Card →'}
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>E</div>
          <span style={{ fontWeight: 800, color: '#94a3b8' }}>EduLink Global</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[['Features', '#features'], ['Pricing', '#pricing'], ['Login', '/login'], ['Register', '/register']].map(([label, href]) => (
            href.startsWith('#')
              ? <a key={label} href={href} style={{ color: '#374151', fontSize: 13, textDecoration: 'none' }}>{label}</a>
              : <Link key={label} href={href} style={{ color: '#374151', fontSize: 13, textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <div style={{ color: '#374151', fontSize: 12 }}>© {new Date().getFullYear()} EduLink Global. Built for students. 🌍</div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        html { scroll-behavior: smooth }
        * { box-sizing: border-box; margin: 0; padding: 0 }
      `}</style>
    </div>
  )
}