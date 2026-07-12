import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'
import Navbar from '../components/Navbar'
import { INTERNSHIPS, RESOURCES } from '../data/globalData'
import AgentInsights from '../components/AgentInsights'
import WeakTopics from '../components/WeakTopics'

const FEATURE_GROUPS = [
  {
    group: '🚀 Career Building',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.2)',
    tools: [
      { href: '/cv-builder', icon: '📄', label: 'CV Builder', desc: 'AI-guided with ATS score' },
      { href: '/cover-letter', icon: '📝', label: 'Cover Letter', desc: 'Auto-generate letters' },
      { href: '/portfolio', icon: '🚀', label: 'Portfolio', desc: 'Showcase projects' },
      { href: '/linkedin-optimizer', icon: '🔵', label: 'LinkedIn Optimizer', desc: 'AI profile rewrite' },
      { href: '/career-roadmap', icon: '🗺️', label: 'Career Roadmap', desc: 'Your 5-year plan' },
      { href: '/income', icon: '💰', label: 'Income Hub', desc: 'Remote jobs + money tracker' },
    ],
  },
  {
    group: '🎓 Job Hunting',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    tools: [
      { href: '/nearby', icon: '📍', label: 'Near Me', desc: 'Local opportunities' },
      { href: '/interview-simulator', icon: '🎙️', label: 'Interview Sim', desc: 'AI personalised practice' },
      { href: '/tracker', icon: '📊', label: 'App Tracker', desc: 'Kanban board' },
    ],
  },
  {
    group: '🤖 AI Tools',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    tools: [
      { href: '/assistant', icon: '🤖', label: 'EduBot AI', desc: 'Career assistant' },
      { href: '/study-ai', icon: '📚', label: 'Study AI', desc: '7 learning tools' },
      { href: '/email-generator', icon: '✉️', label: 'Email Generator', desc: '8 career types' },
      { href: '/research', icon: '🔬', label: 'Research Papers', desc: 'AI summaries' },
      { href: '/courses', icon: '🎓', label: 'Courses', desc: 'AI picks for you' },
    ],
  },
  {
    group: '📚 Learning & Growth',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    tools: [
      { href: '/library', icon: '📚', label: 'Library', desc: 'Files + AI tutor + practice' },
      { href: '/study-groups', icon: '👥', label: 'Study Groups', desc: 'Real-time chat' },
      { href: '/exams', icon: '📅', label: 'Exam Planner', desc: 'Countdowns + plans' },
      { href: '/quiz', icon: '🧠', label: 'Career Quiz', desc: 'Test readiness' },
      { href: '/language', icon: '🌐', label: 'Language Learning', desc: 'German, French+' },
      { href: '/logbook', icon: '📓', label: 'Intern Logbook', desc: 'Log daily work' },
    ],
  },
  {
    group: '💼 Professional Tools',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    tools: [
      { href: '/salary-explorer', icon: '💰', label: 'Salary Explorer', desc: 'Market rates' },
      { href: '/freelance', icon: '💻', label: 'Freelance', desc: 'Track side income' },
      { href: '/networking', icon: '🤝', label: 'Networking', desc: 'Manage contacts' },
      { href: '/mentorship', icon: '🧑‍🏫', label: 'Mentorship', desc: 'Find mentors' },
      { href: '/visa-guide', icon: '🌍', label: 'Visa Guide', desc: 'Work abroad info' },
    ],
  },
  {
    group: '🌱 Personal Development',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    tools: [
      { href: '/goals', icon: '🎯', label: 'Goal Tracker', desc: 'Track milestones' },
      { href: '/wellness', icon: '🌱', label: 'Wellness', desc: 'Mental health' },
      { href: '/budget', icon: '💸', label: 'Budget Calc', desc: 'Plan abroad costs' },
      { href: '/reminders', icon: '⏰', label: 'Reminders', desc: 'Deadline alerts' },
      { href: '/leaderboard', icon: '🏅', label: 'Leaderboard', desc: 'Points & badges' },
    ],
  },
]

export default function Dashboard() {
  const { user, profile, loading, isSubscribed, trialDaysLeft, trialExpired } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  if (loading) return <LoadingScreen />
  if (!user) return null

  const name = profile?.name || user?.user_metadata?.full_name || 'Student'
  const avatarUrl = user?.user_metadata?.avatar_url
  const firstName = name.split(' ')[0]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* ── TRIAL WARNING BANNER ── */}
      {!isSubscribed && !trialExpired && trialDaysLeft <= 5 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.1))', borderBottom: '1px solid rgba(245,158,11,0.3)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <div>
              <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: 14 }}>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your free trial</span>
              <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>Subscribe now to keep all your data and access.</span>
            </div>
          </div>
          <Link href="/subscription" style={{ padding: '8px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', textDecoration: 'none', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>Subscribe Now →</Link>
        </div>
      )}

      {/* ── TRIAL ACTIVE SOFT BANNER ── */}
      {!isSubscribed && !trialExpired && trialDaysLeft > 5 && (
        <div style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)', padding: '9px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#6ee7b7' }}>🎉 Free trial active — <strong>{trialDaysLeft} days</strong> remaining. Enjoying EduLink?</span>
          <Link href="/subscription" style={{ fontSize: 12, color: '#10b981', textDecoration: 'none', fontWeight: 700 }}>View Plans →</Link>
        </div>
      )}

      {/* ── SUBSCRIBED BANNER ── */}
      {isSubscribed && router.query.subscribed === 'true' && (
        <div style={{ background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid rgba(16,185,129,0.2)', padding: '12px 24px', textAlign: 'center', fontSize: 14, color: '#10b981', fontWeight: 700 }}>
          🎉 Welcome to EduLink Pro! Your subscription is now active. Full access unlocked.
        </div>
      )}

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── WELCOME ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: 54, height: 54, borderRadius: '50%', border: '2px solid #2563eb', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {firstName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>Welcome back, {firstName}! 👋</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {!isSubscribed && ` · ${trialDaysLeft} trial day${trialDaysLeft !== 1 ? 's' : ''} left`}
            </p>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Profile Status', value: profile?.bio ? 'Complete ✅' : 'Incomplete', icon: '👤', color: profile?.bio ? '#10b981' : '#f59e0b' },
            { label: 'Internships', value: `${INTERNSHIPS.length}+`, icon: '💼', color: '#2563eb' },
            { label: 'Resources', value: `${RESOURCES.length}+`, icon: '📚', color: '#10b981' },
            { label: 'Countries', value: '120+', icon: '🌍', color: '#8b5cf6' },
            { label: 'Tools Available', value: '40+', icon: '🛠', color: '#06b6d4' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── PROFILE COMPLETION PROMPT ── */}
        {!profile?.bio && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 3 }}>⚠️ Complete Your Profile</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Add your bio, skills, and CV to be visible to employers.</div>
            </div>
            <Link href="/profile" style={{ padding: '9px 20px', borderRadius: 9, background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Complete Profile →</Link>
          </div>
        )}

        {/* ── AGENT INSIGHTS ── */}
        <AgentInsights />

        {/* ── WEAK TOPICS ── */}
        <WeakTopics />

        {/* ── EDUBOT CTA ── */}
        <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14, padding: '18px 22px', marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontSize: 15 }}>🤖 Ask EduBot AI</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Get personalised internship, scholarship, and career advice for your country and field.</div>
          </div>
          <Link href="/assistant" style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>Chat with EduBot →</Link>
        </div>

        {/* ── GROUPED FEATURE CARDS ── */}
        <div style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Your Tools</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>All 40+ tools organised by what you are trying to achieve</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURE_GROUPS.map(group => (
              <div key={group.group} style={{ background: group.bg, border: `1px solid ${group.border}`, borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>{group.group}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                  {group.tools.map(tool => (
                    <Link key={tool.href + tool.label} href={tool.href} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 14px', transition: 'all 0.15s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = group.color + '60'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{tool.icon}</div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12, marginBottom: 2, lineHeight: 1.3 }}>{tool.label}</div>
                        <div style={{ fontSize: 11, color: group.color, lineHeight: 1.3 }}>{tool.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACCESS ROW ── */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>⚡ Quick Access</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { href: '/cv-builder', label: '📄 Build CV', color: '#2563eb' },
              { href: '/cover-letter', label: '📝 Cover Letter', color: '#7c3aed' },
              { href: '/library', label: '📚 Library', color: '#f59e0b' },
              { href: '/interview-simulator', label: '🎙️ Mock Interview', color: '#ef4444' },
              { href: '/tracker', label: '📊 Applications', color: '#8b5cf6' },
              { href: '/language', label: '🌐 Language', color: '#06b6d4' },
              { href: '/income', label: '💰 Income Hub', color: '#10b981' },
              { href: '/nearby', label: '📍 Near Me', color: '#10b981' },
              { href: '/study-ai', label: '🤖 Study AI', color: '#7c3aed' },
              { href: '/goals', label: '🎯 Goals', color: '#ef4444' },
              { href: '/settings', label: '⚙️ Settings', color: '#64748b' },
            ].map(q => (
              <Link key={q.href} href={q.href} style={{ padding: '9px 18px', borderRadius: 10, background: `${q.color}15`, border: `1px solid ${q.color}30`, color: q.color, textDecoration: 'none', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${q.color}25` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${q.color}15` }}
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── FEATURED INTERNSHIPS ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Featured Internships</h2>
            <Link href="/internships" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {INTERNSHIPS.slice(0, 4).map(job => (
              <div key={job.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{job.logo}</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 2 }}>{job.title}</div>
                <div style={{ color: '#60a5fa', fontSize: 12, marginBottom: 2 }}>{job.company}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 10 }}>📍 {job.location}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>{job.field}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{job.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── POPULAR RESOURCES ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Popular Resources</h2>
            <Link href="/resources" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
            {RESOURCES.slice(0, 4).map(res => (
              <div key={res.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{res.icon}</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 2 }}>{res.title}</div>
                <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 10 }}>{res.subject} · {res.type}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>⬇ {res.downloads?.toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: '#f59e0b' }}>★ {res.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMMUNITY LINKS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {[
            { href: '/community', icon: '🌍', label: 'Community', desc: 'Connect with students', color: '#2563eb' },
            { href: '/events', icon: '📅', label: 'Events & Webinars', desc: 'Upcoming sessions', color: '#7c3aed' },
            { href: '/reviews', icon: '⭐', label: 'Company Reviews', desc: 'Real intern reviews', color: '#f59e0b' },
            { href: '/countries', icon: '🗺️', label: 'Country Guides', desc: 'Career by country', color: '#10b981' },
            { href: '/messages', icon: '💬', label: 'Messages', desc: 'Student network', color: '#06b6d4' },
            { href: '/settings', icon: '⚙️', label: 'Settings', desc: 'Account & preferences', color: '#64748b' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '50'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading your dashboard...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}