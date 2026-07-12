import { useState } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import Link from 'next/link'

const FEATURES = [
  {
    category: '📚 Study & Learning',
    color: '#2563eb',
    tools: [
      { href: '/study-ai', icon: '🤖', title: 'AI Study Assistant', desc: 'Upload any lecture notes, textbook chapter, or PDF. AI generates summaries, flashcards, quizzes, exam questions, mind maps, timelines, and glossaries in seconds.', badge: 'Most Used' },
      { href: '/quiz', icon: '🧠', title: 'Career Readiness Quiz', desc: 'Interactive quizzes across Interview Skills, CV Knowledge, Finance, Networking, Workplace Etiquette — with explanations for every answer.', badge: null },
      { href: '/courses', icon: '🎓', title: 'AI Course Recommendations', desc: 'AI picks the best free courses from Coursera, edX, Harvard, MIT based on your field and learning goals.', badge: null },
      { href: '/research', icon: '🔬', title: 'Research Paper Finder', desc: 'Search 200M+ academic papers via Semantic Scholar. AI explains any abstract in plain language. Save papers for assignments.', badge: 'Academic' },
      { href: '/language', icon: '🌐', title: 'Language Learning', desc: 'German, French and more — essential phrases for international students, AI pronunciation feedback, free course links.', badge: null },
      { href: '/exams', icon: '📅', title: 'Exam Timetable Planner', desc: 'Track exam dates with live countdowns. AI generates a personalised study plan based on how many days you have left.', badge: null },
    ],
  },
  {
    category: '💼 Career Preparation',
    color: '#7c3aed',
    tools: [
      { href: '/cv-builder', icon: '📄', title: 'AI CV Builder', desc: 'Step-by-step AI-guided CV creation with an onboarding coach. AI improves every section, checks ATS score, and downloads as PDF.', badge: 'Essential' },
      { href: '/cover-letter', icon: '📝', title: 'Cover Letter Generator', desc: 'AI writes complete, professionally formatted cover letters with correct address blocks, subject line, and sign-off.', badge: null },
      { href: '/interview-simulator', icon: '🎙️', title: 'Interview Simulator', desc: '8-question AI interview sessions with per-answer feedback, overall score, grade, and model answers shown after.', badge: 'Popular' },
      { href: '/mock-interview', icon: '🏆', title: 'Mock Interview Practice', desc: 'Quick practice rounds for specific interview types. Great for classroom interview prep sessions.', badge: null },
      { href: '/linkedin-optimizer', icon: '🔵', title: 'LinkedIn Optimizer', desc: 'Score your LinkedIn profile out of 100. AI rewrites your headline, About section, and experience bullets with keywords.', badge: null },
      { href: '/salary-explorer', icon: '💰', title: 'Salary Explorer', desc: 'Market salary rates across countries and fields. Essential for negotiation preparation and career planning.', badge: null },
    ],
  },
  {
    category: '🌍 Opportunities',
    color: '#10b981',
    tools: [
      { href: '/nearby', icon: '📍', title: 'Near You — Local Opportunities', desc: 'Location-aware internships, scholarships, universities, and events near the user. Automatically detects their location.', badge: 'New' },
      { href: '/internships', icon: '💼', title: 'Global Internship Database', desc: '500+ internship listings worldwide. Filter by region, field, company. AI loads live opportunities on demand.', badge: null },
      { href: '/scholarships', icon: '🎓', title: 'Scholarship Database', desc: '200+ scholarships from Chevening, Fulbright, MasterCard Foundation, Commonwealth, DAAD, and more.', badge: null },
      { href: '/visa-guide', icon: '🌍', title: 'Visa & Work Permit Guide', desc: 'Detailed visa routes for UK, Germany, Canada, UAE, Australia with eligibility, costs, and official application links.', badge: null },
    ],
  },
  {
    category: '🛠 Professional Development',
    color: '#f59e0b',
    tools: [
      { href: '/mentorship', icon: '🧑‍🏫', title: 'Mentorship Matching', desc: 'Connect students with industry mentors in their field.', badge: null },
      { href: '/portfolio', icon: '🚀', title: 'Portfolio Builder', desc: 'Build a professional project portfolio. AI writes descriptions. Share with employers via a direct link.', badge: null },
      { href: '/networking', icon: '🤝', title: 'Networking Contact Manager', desc: 'CRM for professional contacts. Tracks follow-up dates, last contact, and alerts when it is time to reach out.', badge: null },
      { href: '/email-generator', icon: '✉️', title: 'Professional Email Generator', desc: '8 career email types: cold outreach, follow-up, thank you, rejection reply, internship inquiry, referral request.', badge: null },
      { href: '/freelance', icon: '💻', title: 'Freelance & Side Hustle Tracker', desc: 'Track freelance projects, log hours, calculate rates, discover side income ideas.', badge: null },
    ],
  },
  {
    category: '🌱 Student Wellbeing',
    color: '#06b6d4',
    tools: [
      { href: '/wellness', icon: '🌱', title: 'Mental Health & Wellness', desc: 'Daily mood/stress/energy check-in. 4-7-8 breathing exercise. Crisis helpline resources. Mood history chart.', badge: 'Important' },
      { href: '/goals', icon: '🎯', title: 'Goal Tracker', desc: 'Set career, academic, and personal goals with milestones. Track progress. Suggested goals for students.', badge: null },
      { href: '/budget', icon: '💸', title: 'Study Abroad Budget Calculator', desc: 'Realistic monthly costs in 10 cities worldwide in local currencies. Income and savings planning.', badge: null },
      { href: '/logbook', icon: '📓', title: 'Internship Logbook', desc: 'Daily work log for internship programmes. Log tasks, hours, learnings, supervisor feedback. Export to CSV for university submission.', badge: null },
    ],
  },
]

export default function Classroom() {
  const { user, profile } = useUser()
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')

  const allTools = FEATURES.flatMap(f => f.tools.map(t => ({ ...t, category: f.category, color: f.color })))
  const filtered = search
    ? allTools.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 20, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            🏫 UNIVERSITY EDITION
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, color: '#f1f5f9', marginBottom: 14, lineHeight: 1.1 }}>
            Teaching & Learning Hub
          </h1>
          <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.7, maxWidth: 600, margin: '0 auto 28px' }}>
            Every tool students need for academic success and career readiness — from AI-powered study tools to real internship opportunities near them.
          </p>

          {/* Search */}
          <input type="text" placeholder="🔍 Search tools..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 480, padding: '13px 20px', borderRadius: 12, fontSize: 14, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', color: '#e2e8f0', outline: 'none' }} />
        </div>

        {/* Search results */}
        {filtered && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>
              {filtered.length} tools found for "{search}"
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
              {filtered.map((tool, i) => (
                <Link key={i} href={tool.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--surface)', border: `1px solid ${tool.color}25`, borderRadius: 14, padding: 20, height: '100%', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = tool.color + '60'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = tool.color + '25'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>{tool.icon}</span>
                      {tool.badge && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: `${tool.color}20`, color: tool.color, border: `1px solid ${tool.color}30`, fontWeight: 700, textTransform: 'uppercase' }}>{tool.badge}</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>{tool.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{tool.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category sections */}
        {!filtered && FEATURES.map((group) => (
          <div key={group.category} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 4, height: 24, borderRadius: 2, background: group.color }} />
              <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20 }}>{group.category}</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>{group.tools.length} tools</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
              {group.tools.map((tool, i) => (
                <Link key={i} href={tool.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--surface)', border: `1px solid ${group.color}20`, borderRadius: 14, padding: 20, height: '100%', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = group.color + '50'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = group.color + '20'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 28 }}>{tool.icon}</span>
                      {tool.badge && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}30`, fontWeight: 700 }}>{tool.badge}</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 8 }}>{tool.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.65, flex: 1 }}>{tool.desc}</div>
                    <div style={{ marginTop: 12, fontSize: 12, color: group.color, fontWeight: 700 }}>Open tool →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* University CTA */}
        <div style={{ marginTop: 40, padding: '32px', borderRadius: 20, background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(124,58,237,0.08))', border: '1px solid rgba(37,99,235,0.25)', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🏫</div>
          <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22, marginBottom: 10 }}>Are you a University or Institution?</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            EduLink offers university partnerships with branded portals, bulk student access, analytics dashboards, and dedicated support.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/universities" style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              University Partnerships →
            </Link>
            <Link href="/assistant" style={{ padding: '11px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              Talk to EduBot →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}