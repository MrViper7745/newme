import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileLayout from '../../components/mobile/MobileLayout'
import StudyStreakCelebration from '../../components/mobile/StudyStreakCelebration'
import QuickNoteCapture from '../../components/mobile/QuickNoteCapture'
import CameraScanner from '../../components/mobile/CameraScanner'
import MobileEduBotBubble from '../../components/mobile/MobileEduBotBubble'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import { timerState, useTimer } from '../../components/FloatingTimer'

function MiniTimer() {
  const t = useTimer()
  const MODES = { study: { label: 'Study', color: '#2563eb' }, break: { label: 'Short Break', color: '#10b981' }, long: { label: 'Long Break', color: '#7c3aed' } }
  const mins = String(Math.floor(t.seconds / 60)).padStart(2, '0')
  const secs = String(t.seconds % 60).padStart(2, '0')
  const c = MODES[t.mode]?.color || '#2563eb'
  const progress = t.seconds / timerState.modeSecs(t.mode)
  const R = 20, circ = 2 * Math.PI * R
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={52} height={52} viewBox="0 0 52 52">
          <circle cx={26} cy={26} r={R} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={4} />
          <circle cx={26} cy={26} r={R} fill="none" stroke={c} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
            transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text)', fontFamily: 'monospace' }}>{mins}:{secs}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>⏱️ {MODES[t.mode]?.label} Timer</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.running ? '▶ Running' : t.everStarted ? '⏸ Paused' : 'Not started'}{t.sessions > 0 ? ` · 🍅 ${t.sessions} sessions` : ''}</div>
      </div>
      <button onClick={() => timerState.toggle()}
        style={{ width: 38, height: 38, borderRadius: '50%', background: t.running ? 'rgba(239,68,68,0.12)' : `${c}20`, border: `2px solid ${t.running ? 'rgba(239,68,68,0.3)' : c + '40'}`, color: t.running ? '#ef4444' : c, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {t.running ? '⏸' : '▶'}
      </button>
    </div>
  )
}

export default function MobileDashboard() {
  const { user, profile } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState({ library: 0, exams: 0, messages: 0, streak: 0, sessions: 0, practice: 0 })
  const [insights, setInsights] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [upcomingExams, setUpcomingExams] = useState([])
  const [showNote, setShowNote] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('Good morning')
  const [runningAgent, setRunningAgent] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17) setGreeting('Good evening')
  }, [])

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [libRes, examRes, msgRes, langRes, insightRes, recentRes, upcomingRes] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('exam_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('exam_date', today),
      supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('read', false),
      supabase.from('language_progress').select('streak').eq('user_id', user.id).order('streak', { ascending: false }).limit(1),
      supabase.from('agent_insights').select('*').eq('user_id', user.id).eq('dismissed', false).order('created_at', { ascending: false }).limit(3),
      supabase.from('library_files').select('id,title,name,label,last_opened').eq('user_id', user.id).order('last_opened', { ascending: false, nullsFirst: false }).limit(3),
      supabase.from('exam_entries').select('module_name,exam_date,color').eq('user_id', user.id).gte('exam_date', today).lte('exam_date', weekAhead).order('exam_date').limit(2),
    ])
    setStats({ library: libRes.count || 0, exams: examRes.count || 0, messages: msgRes.count || 0, streak: langRes.data?.[0]?.streak || 0 })
    setInsights(insightRes.data || [])
    setRecentFiles(recentRes.data || [])
    setUpcomingExams(upcomingRes.data || [])
    setLoading(false)
  }

  const dismissInsight = async (id) => {
    await supabase.from('agent_insights').update({ dismissed: true }).eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const runAgent = async () => {
    setRunningAgent(true)
    try {
      const res = await fetch('/api/agent-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) })
      const d = await res.json()
      if (d.insights) setInsights(d.insights)
      showToast(`✅ ${d.insights_generated || 0} new insights`)
    } catch {}
    setRunningAgent(false)
  }

  const daysUntil = (date) => Math.ceil((new Date(date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))

  const QUICK_ACTIONS = [
    { icon: '📸', label: 'Scan Doc',   action: () => setShowCamera(true),         color: '#2563eb' },
    { icon: '📝', label: 'Quick Note', action: () => setShowNote(true),           color: '#7c3aed' },
    { icon: '🤖', label: 'Study AI',   action: () => router.push('/study-ai'),    color: '#10b981' },
    { icon: '✍️', label: 'Practice',   action: () => router.push('/library'),     color: '#f59e0b' },
    { icon: '📅', label: 'Exams',      action: () => router.push('/exams'),       color: '#ef4444' },
    { icon: '🏆', label: 'Challenge',  action: () => router.push('/challenges'),  color: '#f59e0b' },
  ]

  const priorityColor = (p) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#64748b'

  return (
    <MobileLayout
      title={false}
      rightAction={
        <button onClick={runAgent} disabled={runningAgent} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {runningAgent ? '⏳' : '🤖 AI'}
        </button>
      }
    >
      <PullToRefresh onRefresh={load}>
        <div style={{ padding: '14px 16px', paddingTop: 8 }}>

          {/* Greeting */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{new Date().toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>
              {greeting}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              {stats.library > 0 ? `${stats.library} files in library${stats.exams > 0 ? ` · ${stats.exams} exams coming` : ''}` : 'Welcome to EduLink Global'}
            </p>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            {[
              { label: 'Files',    value: stats.library,  color: '#2563eb', href: '/library' },
              { label: 'Exams',    value: stats.exams,    color: '#ef4444', href: '/exams' },
              { label: 'Messages', value: stats.messages,  color: stats.messages > 0 ? '#ef4444' : '#64748b', href: '/messages' },
              { label: 'Streak',   value: `${stats.streak}d`, color: '#f59e0b', href: '/language' },
            ].map(s => (
              <div key={s.label} onClick={() => router.push(s.href)}
                style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${s.color}25`, textAlign: 'center', cursor: 'pointer', minWidth: 72 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Upcoming exams */}
          {upcomingExams.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {upcomingExams.map((exam, i) => {
                const days = daysUntil(exam.exam_date)
                return (
                  <div key={i} onClick={() => router.push('/exams')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${exam.color || '#ef4444'}25`, borderLeft: `3px solid ${exam.color || '#ef4444'}`, marginBottom: 8, cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{exam.module_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(exam.exam_date + 'T12:00').toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>{days}</div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>days</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick actions */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {QUICK_ACTIONS.map((a, i) => (
                <div key={i} onClick={a.action}
                  style={{ padding: '16px 8px', borderRadius: 14, background: 'var(--surface)', border: `1px solid ${a.color}20`, textAlign: 'center', cursor: 'pointer', transition: 'transform 0.1s', WebkitTapHighlightColor: 'transparent' }}
                  onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{a.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{a.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤖 AI Insights</div>
                <button onClick={() => router.push('/dashboard')} style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>See all →</button>
              </div>
              {insights.map(insight => (
                <div key={insight.id}
                  style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', borderLeft: `3px solid ${priorityColor(insight.priority)}`, marginBottom: 10, border: `1px solid ${priorityColor(insight.priority)}20` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{insight.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{insight.message}</div>
                      {insight.action_url && (
                        <button onClick={() => router.push(insight.action_url)}
                          style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, background: `${priorityColor(insight.priority)}15`, border: `1px solid ${priorityColor(insight.priority)}30`, color: priorityColor(insight.priority), fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {insight.action_label || 'View'} →
                        </button>
                      )}
                    </div>
                    <button onClick={() => dismissInsight(insight.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pomodoro timer mini */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Study Timer</div>
            <MiniTimer />
            <button onClick={() => router.push('/dashboard')}
              style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Open Full Timer & Dashboard →
            </button>
          </div>

          {/* Recent files */}
          {recentFiles.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recently Studied</div>
                <button onClick={() => router.push('/library')} style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>Library →</button>
              </div>
              {recentFiles.map(file => (
                <div key={file.id} onClick={() => router.push('/library')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title || file.name}</div>
                    {file.label && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{file.label}</div>}
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: 14 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {stats.library === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Get started</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 18 }}>Scan a document or upload files to begin studying with AI</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setShowCamera(true)} style={{ padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📸 Scan</button>
                <button onClick={() => router.push('/upload')} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📤 Upload</button>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      <StudyStreakCelebration streak={stats.streak} />
      <QuickNoteCapture user={user} open={showNote} onClose={() => setShowNote(false)} />
      <CameraScanner open={showCamera} onClose={() => setShowCamera(false)} />
      <MobileEduBotBubble />
      {toast && <div className="toast">{toast}</div>}
    </MobileLayout>
  )
}