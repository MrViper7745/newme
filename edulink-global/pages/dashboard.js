import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'

import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import { timerState, useTimer } from '../components/FloatingTimer'

const MobileDashboard = dynamic(
  () => import('./mobile/MobileDashboard'),
  { ssr: false, loading: () => null }
)

// ── Thin wrapper — only ONE hook, no other logic ──
export default function DashboardPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileDashboard />
  return <DesktopDashboard />
}

function PomodoroTimer() {
  const t = useTimer()
  const [showCustom, setShowCustom] = useState(false)
  const [customInput, setCustomInput] = useState('25')

  const MODES = {
    study: { label: 'Study',       color: '#2563eb' },
    break: { label: 'Short Break', color: '#10b981' },
    long:  { label: 'Long Break',  color: '#7c3aed' },
  }

  const mins = String(Math.floor(t.seconds / 60)).padStart(2, '0')
  const secs = String(t.seconds % 60).padStart(2, '0')
  const progress = t.seconds / timerState.modeSecs(t.mode)
  const c = MODES[t.mode]?.color || '#2563eb'
  const R = 44, circ = 2 * Math.PI * R

  const applyCustom = () => {
    const m = Math.max(1, Math.min(120, parseInt(customInput) || 25))
    setCustomInput(String(m))
    timerState.seconds = m * 60
    timerState.running = false
    timerState.emit()
    setShowCustom(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 14 }}>⏱️ Pomodoro Timer</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => timerState.setMode(k)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: t.mode === k ? `${v.color}20` : 'transparent', color: t.mode === k ? v.color : 'var(--text3)', border: `1px solid ${t.mode === k ? v.color + '40' : 'transparent'}` }}>
            {k === 'study' ? '📖' : k === 'break' ? '☕' : '🛌'} {v.label}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        <svg width={130} height={130} viewBox="0 0 130 130">
          <circle cx={65} cy={65} r={R} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={9} />
          <circle cx={65} cy={65} r={R} fill="none" stroke={c} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{mins}:{secs}</div>
          <div style={{ fontSize: 9, color: c, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{MODES[t.mode]?.label}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        <button onClick={() => timerState.reset()} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>↺ Reset</button>
        <button onClick={() => timerState.toggle()} style={{ padding: '8px 24px', borderRadius: 9, background: t.running ? 'rgba(239,68,68,0.12)' : `${c}20`, border: `1px solid ${t.running ? 'rgba(239,68,68,0.3)' : c + '40'}`, color: t.running ? '#ef4444' : c, fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
          {t.running ? '⏸ Pause' : t.everStarted ? '▶ Resume' : '▶ Start'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {[1, 5, 10].map(m => (
          <button key={m} onClick={() => timerState.addSecs(m * 60)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = c; e.currentTarget.style.borderColor = `${c}50` }}
            onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = '' }}>
            +{m} min
          </button>
        ))}
        <button onClick={() => setShowCustom(s => !s)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: showCustom ? `${c}15` : 'var(--surface2)', border: `1px solid ${showCustom ? c + '40' : 'var(--border)'}`, color: showCustom ? c : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
          Custom
        </button>
      </div>
      {showCustom && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input type="number" min={1} max={120} value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCustom()} placeholder="Minutes"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: `1px solid ${c}40`, color: 'var(--text)', outline: 'none' }} autoFocus />
          <button onClick={applyCustom} style={{ padding: '7px 14px', borderRadius: 8, background: `${c}20`, border: `1px solid ${c}40`, color: c, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Set</button>
        </div>
      )}
      {t.sessions > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          🍅 {t.sessions} session{t.sessions !== 1 ? 's' : ''} completed today
          {t.sessions >= 4 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>— excellent focus!</span>}
        </div>
      )}
      {t.everStarted && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>Timer stays visible as a mini widget when you navigate away</div>
      )}
    </div>
  )
}

// ── The desktop dashboard — ALL hooks live here, no early returns ──
function DesktopDashboard() {
  const { user, profile } = useUser()
  const router = useRouter()
  const [insights, setInsights] = useState([])
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [runningAgent, setRunningAgent] = useState(false)
  const [stats, setStats] = useState({ library: 0, practice: 0, exams: 0, messages: 0, streak: 0, sessions: 0 })
  const [recentFiles, setRecentFiles] = useState([])
  const [upcomingExams, setUpcomingExams] = useState([])
  const [weekSessions, setWeekSessions] = useState([])
  const [toast, setToast] = useState(null)
  const [greeting, setGreeting] = useState('Good morning')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17) setGreeting('Good evening')
  }, [])

  useEffect(() => { if (!user) return; loadDashboardData(); loadInsights() }, [user])

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [
      { count: libCount }, { count: practiceCount }, { count: examCount }, { count: msgCount },
      { data: langData }, { data: recentFilesData }, { data: examsData }, { data: sessionsData },
    ] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('practice_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      supabase.from('exam_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('exam_date', today),
      supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('read', false),
      supabase.from('language_progress').select('streak').eq('user_id', user.id).order('streak', { ascending: false }).limit(1),
      supabase.from('library_files').select('id,title,label,last_opened,saved_at').eq('user_id', user.id).order('last_opened', { ascending: false, nullsFirst: false }).limit(4),
      supabase.from('exam_entries').select('module_name,exam_date,color').eq('user_id', user.id).gte('exam_date', today).lte('exam_date', sevenDaysAhead).order('exam_date', { ascending: true }).limit(3),
      supabase.from('study_sessions').select('session_date,completed,duration_minutes,module_name').eq('user_id', user.id).gte('session_date', weekAgo).order('session_date', { ascending: true }).limit(20),
    ])
    setStats({ library: libCount || 0, practice: practiceCount || 0, exams: examCount || 0, messages: msgCount || 0, streak: langData?.[0]?.streak || 0, sessions: (sessionsData || []).filter(s => s.completed).length })
    setRecentFiles(recentFilesData || [])
    setUpcomingExams(examsData || [])
    setWeekSessions(sessionsData || [])
  }

  const loadInsights = async () => {
    setLoadingInsights(true)
    try {
      const { data } = await supabase.from('agent_insights').select('*').eq('user_id', user.id).eq('dismissed', false).order('priority', { ascending: true }).limit(5)
      setInsights(data || [])
    } catch {}
    setLoadingInsights(false)
  }

  const runAgent = async () => {
    setRunningAgent(true)
    try {
      const res = await fetch('/api/agent-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) })
      const data = await res.json()
      if (data.insights) { setInsights(data.insights); showToast(`✅ Agent ran — ${data.insights_generated || 0} new insight${data.insights_generated !== 1 ? 's' : ''}`) }
    } catch (e) { showToast('❌ ' + e.message) }
    setRunningAgent(false)
  }

  const dismissInsight = async (id) => {
    await supabase.from('agent_insights').update({ dismissed: true }).eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const downloadProgressReport = async () => {
    showToast('📊 Generating your progress report...')
    try {
      const res = await fetch('/api/progress-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `EduLink_Report_${new Date().toISOString().split('T')[0]}.html`; a.click(); URL.revokeObjectURL(url)
        showToast('✅ Downloaded — open in browser then Ctrl+P → Save as PDF')
      }
    } catch (e) { showToast('❌ ' + e.message) }
  }

  const priorityColor = (p) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#64748b'
  const daysUntil = (date) => Math.ceil((new Date(date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
  const urgencyColor = (days) => days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#10b981'
  const LABEL_COLOR = { 'Past Exam Paper': '#ef4444', 'Memo / Marking Guide': '#10b981', 'Lecture Slides': '#2563eb', 'Study Notes': '#8b5cf6', 'Textbook / Chapter': '#f59e0b', 'Tutorial / Worksheet': '#06b6d4' }
  const QUICK_LINKS = [
    { href: '/library', icon: '📚', label: 'Library', desc: `${stats.library} files`, color: '#2563eb' },
    { href: '/study-ai', icon: '🤖', label: 'Study AI', desc: '7 AI tools', color: '#7c3aed' },
    { href: '/exams', icon: '📅', label: 'Exams', desc: `${stats.exams} upcoming`, color: '#ef4444' },
    { href: '/community', icon: '🌍', label: 'Community', desc: 'Posts & groups', color: '#10b981' },
    { href: '/messages', icon: '✉️', label: 'Messages', desc: stats.messages > 0 ? `${stats.messages} unread` : 'Direct messages', color: stats.messages > 0 ? '#ef4444' : '#60a5fa' },
    { href: '/assistant', icon: '💬', label: 'EduBot', desc: 'AI assistant', color: '#f59e0b' },
    { href: '/interview-simulator', icon: '🎙️', label: 'Interview', desc: 'Practice now', color: '#ec4899' },
    { href: '/nearby', icon: '📍', label: 'Near Me', desc: 'Local opportunities', color: '#06b6d4' },
  ]
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d.toISOString().split('T')[0] })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{new Date().toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.1 }}>{greeting}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>{stats.library > 0 ? `You have ${stats.library} files in your library${upcomingExams.length > 0 ? ` and ${upcomingExams.length} exam${upcomingExams.length !== 1 ? 's' : ''} coming up` : ''}.` : 'Welcome to EduLink — your AI-powered academic and career platform.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={downloadProgressReport} style={{ padding: '9px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📊 Progress Report</button>
            <button onClick={runAgent} disabled={runningAgent} style={{ padding: '9px 16px', borderRadius: 10, background: runningAgent ? 'var(--surface2)' : 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: runningAgent ? '#64748b' : '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{runningAgent ? '⏳ Running...' : '🤖 Run AI Agent'}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Library Files', value: stats.library, icon: '📚', color: '#2563eb', href: '/library' },
            { label: 'Practice Exams', value: stats.practice, icon: '✍️', color: '#7c3aed', href: '/library' },
            { label: 'Upcoming Exams', value: stats.exams, icon: '📅', color: stats.exams > 0 ? '#ef4444' : '#64748b', href: '/exams' },
            { label: 'Unread Messages', value: stats.messages, icon: '✉️', color: stats.messages > 0 ? '#ef4444' : '#64748b', href: '/messages' },
            { label: 'Language Streak', value: `${stats.streak}d`, icon: '🔥', color: stats.streak >= 3 ? '#f59e0b' : '#64748b', href: '/language' },
            { label: 'Sessions Done', value: stats.sessions, icon: '✅', color: '#10b981', href: '/exams' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.href)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${s.color}40` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* AI Insights */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>🤖 AI Behavioural Insights</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Your personal AI monitors your activity and surfaces personalised guidance</div>
                </div>
                <button onClick={runAgent} disabled={runningAgent} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: runningAgent ? 0.5 : 1 }}>
                  {runningAgent ? '⏳' : '🔄 Refresh'}
                </button>
              </div>
              {loadingInsights ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                  Loading insights...
                </div>
              ) : insights.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>No insights right now</div>
                  <button onClick={runAgent} disabled={runningAgent} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {runningAgent ? '⏳ Analysing...' : '🤖 Analyse Now'}
                  </button>
                </div>
              ) : insights.map(insight => (
                <div key={insight.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${priorityColor(insight.priority)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 5 }}>{insight.title}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{insight.message}</div>
                      {insight.action_label && insight.action_url && (
                        <button onClick={() => router.push(insight.action_url)} style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, background: `${priorityColor(insight.priority)}15`, border: `1px solid ${priorityColor(insight.priority)}35`, color: priorityColor(insight.priority), fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {insight.action_label} →
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, background: `${priorityColor(insight.priority)}15`, color: priorityColor(insight.priority), fontWeight: 700, textTransform: 'uppercase' }}>{insight.priority}</span>
                      <button onClick={() => dismissInsight(insight.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>⚡ Quick Access</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {QUICK_LINKS.map(link => (
                  <div key={link.href} onClick={() => router.push(link.href)}
                    style={{ padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${link.color}50`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{link.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{link.label}</div>
                    <div style={{ fontSize: 11, color: link.desc.includes('unread') ? link.color : '#64748b', fontWeight: link.desc.includes('unread') ? 700 : 400 }}>{link.desc}</div>
                    {link.desc.includes('unread') && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent files */}
            {recentFiles.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>📚 Recently Opened</div>
                  <button onClick={() => router.push('/library')} style={{ fontSize: 12, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
                </div>
                {recentFiles.map(file => (
                  <div key={file.id} onClick={() => router.push('/library')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 8 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title || file.name || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {file.label && <span style={{ color: LABEL_COLOR[file.label] || '#94a3b8', marginRight: 6 }}>{file.label}</span>}
                        {file.last_opened && `Opened ${new Date(file.last_opened).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', flexShrink: 0 }}>→</div>
                  </div>
                ))}
              </div>
            )}

            {/* Week sessions */}
            {weekSessions.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>📆 This Week's Study Plan</div>
                  <button onClick={() => router.push('/exams')} style={{ fontSize: 12, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
                    const date = weekDays[i]
                    const daySessions = weekSessions.filter(s => s.session_date === date)
                    const completed = daySessions.filter(s => s.completed).length
                    const total = daySessions.length
                    const isToday = date === new Date().toISOString().split('T')[0]
                    return (
                      <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: isToday ? '#60a5fa' : '#64748b', marginBottom: 5, fontWeight: isToday ? 700 : 400 }}>{day}</div>
                        <div style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: total === 0 ? 'var(--surface2)' : completed === total ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)', border: `1px solid ${isToday ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#f1f5f9', fontWeight: 700 }}>
                          {total > 0 ? `${completed}/${total}` : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {weekSessions.filter(s => s.session_date === new Date().toISOString().split('T')[0]).map((session, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 9, background: session.completed ? 'rgba(16,185,129,0.06)' : 'var(--surface2)', border: `1px solid ${session.completed ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: session.completed ? '#64748b' : '#f1f5f9', textDecoration: session.completed ? 'line-through' : 'none' }}>{session.module_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>⏱ {session.duration_minutes}min</div>
                    </div>
                    {session.completed ? <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✅ Done</span> : <button onClick={() => router.push('/exams')} style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Mark done</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {upcomingExams.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>📅 Coming Up</div>
                  <button onClick={() => router.push('/exams')} style={{ fontSize: 12, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>All exams →</button>
                </div>
                {upcomingExams.map((exam, i) => {
                  const days = daysUntil(exam.exam_date)
                  return (
                    <div key={i} onClick={() => router.push('/exams')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 11, background: 'var(--surface2)', border: `1px solid ${exam.color || '#2563eb'}25`, borderLeft: `3px solid ${exam.color || '#2563eb'}`, marginBottom: 8, cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.module_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{new Date(exam.exam_date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: urgencyColor(days), lineHeight: 1 }}>{days}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>days</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <PomodoroTimer />

            {!profile?.field && (
              <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 6 }}>🎓 Complete your academic profile</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>Add your field of study, modules, and year to personalise EduLink.</div>
                <button onClick={() => router.push('/profile')} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Set Up Profile →</button>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>💼 Career Tools</div>
              {[
                { href: '/cv-builder', icon: '📄', label: 'CV Builder', desc: 'AI-guided CV creation' },
                { href: '/cover-letter', icon: '📝', label: 'Cover Letter', desc: 'Professional letters' },
                { href: '/interview-simulator', icon: '🎙️', label: 'Interview Practice', desc: 'Mock interviews with AI feedback' },
                { href: '/tracker', icon: '📊', label: 'Application Tracker', desc: 'Track your applications' },
              ].map(tool => (
                <div key={tool.href} onClick={() => router.push(tool.href)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{tool.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{tool.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{tool.desc}</div>
                  </div>
                  <span style={{ color: '#374151', fontSize: 12 }}>→</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>📖 Study Tools</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { href: '/study-ai', icon: '🤖', label: 'AI Study', desc: '7 tools' },
                  { href: '/library', icon: '📚', label: 'Library', desc: 'AI Tutor' },
                  { href: '/assistant', icon: '💬', label: 'EduBot', desc: 'Chat AI' },
                  { href: '/language', icon: '🌐', label: 'Language', desc: `${stats.streak}d streak` },
                ].map(tool => (
                  <div key={tool.href} onClick={() => router.push(tool.href)} style={{ padding: '12px 10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ fontSize: 20, marginBottom: 5 }}>{tool.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{tool.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{tool.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {stats.library === 0 && (
          <div style={{ marginTop: 24, padding: '32px', borderRadius: 20, background: 'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.06))', border: '1px solid rgba(37,99,235,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Get started with EduLink</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 24px' }}>Install the browser extension to scan your university's website and save your study materials.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/settings')} style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🧩 Install Extension</button>
              <button onClick={() => router.push('/study-ai')} style={{ padding: '11px 24px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>🤖 Try Study AI</button>
              <button onClick={() => router.push('/assistant')} style={{ padding: '11px 24px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>💬 Chat with EduBot</button>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}