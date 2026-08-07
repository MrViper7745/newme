import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const MobileAnalytics = dynamic(() => import('./mobile/MobileAnalytics'), { ssr: false })

export default function AnalyticsPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileAnalytics />
  return <Analytics />
}

function StatCard({ icon, label, value, sub, color = '#2563eb' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, label, color = '#2563eb', max }) {
  const m = max || Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      {label && <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>{label}</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{d.value || ''}</div>
            <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.value > 0 ? color : 'var(--surface2)', height: `${(d.value / m) * 90}px`, minHeight: d.value > 0 ? 4 : 0, transition: 'height 0.5s ease', border: d.highlight ? `2px solid ${color}` : 'none' }} />
            <div style={{ fontSize: 9, color: d.highlight ? '#f1f5f9' : '#64748b', fontWeight: d.highlight ? 700 : 400, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

 function Analytics() {
  
  const { user, profile } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30') // days

  useEffect(() => { if (user) loadAnalytics() }, [user, period])

  const loadAnalytics = async () => {
    setLoading(true)
    const days = parseInt(period)
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: library },
      { data: practice },
      { data: sessions },
      { data: weakTopics },
      { data: languages },
      { data: conversations },
      { data: libSessions },
    ] = await Promise.all([
      supabase.from('library_files').select('id,label,priority,last_opened,saved_at').eq('user_id', user.id),
      supabase.from('practice_attempts').select('*').eq('user_id', user.id).gte('created_at', from),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('session_date', from.split('T')[0]),
      supabase.from('weak_topics').select('*').eq('user_id', user.id).eq('resolved', false),
      supabase.from('language_progress').select('*').eq('user_id', user.id),
      supabase.from('bot_conversations').select('id,created_at').eq('user_id', user.id).gte('created_at', from),
      supabase.from('library_sessions').select('file_id,updated_at').eq('user_id', user.id).gte('updated_at', from),
    ])

    // Build daily activity for last 14 days
    const dailyActivity = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      const dateStr = d.toISOString().split('T')[0]
      const isToday = dateStr === today
      const sessionCount = (sessions || []).filter(s => s.session_date === dateStr).length
      const convCount = (conversations || []).filter(c => c.created_at?.startsWith(dateStr)).length
      const libCount = (libSessions || []).filter(s => s.updated_at?.startsWith(dateStr)).length
      return {
        label: isToday ? 'Today' : d.toLocaleDateString('en-ZA', { weekday: 'short' }),
        value: sessionCount + convCount + libCount,
        highlight: isToday,
      }
    })

    // Practice score trend
    const scoreTrend = (practice || [])
      .filter(p => p.completed && p.total_score && p.max_score)
      .slice(-10)
      .map((p, i) => ({
        label: `#${i + 1}`,
        value: Math.round((p.total_score / p.max_score) * 100),
      }))

    // Label breakdown
    const labelCounts = {}
    ;(library || []).forEach(f => { if (f.label) labelCounts[f.label] = (labelCounts[f.label] || 0) + 1 })

    // Study time estimate (sessions * avg duration)
    const totalStudyMins = (sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 45), 0)

    // Avg practice score
    const completedPractice = (practice || []).filter(p => p.completed && p.total_score && p.max_score)
    const avgScore = completedPractice.length
      ? Math.round(completedPractice.reduce((s, p) => s + (p.total_score / p.max_score) * 100, 0) / completedPractice.length)
      : null

    // Study streak (consecutive days with activity)
    let streak = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const hasActivity =
        (sessions || []).some(s => s.session_date === ds) ||
        (conversations || []).some(c => c.created_at?.startsWith(ds)) ||
        (libSessions || []).some(s => s.updated_at?.startsWith(ds))
      if (hasActivity) streak++
      else if (i > 0) break
    }

    setData({
      library: library || [],
      practice: practice || [],
      sessions: sessions || [],
      weakTopics: weakTopics || [],
      languages: languages || [],
      conversations: conversations || [],
      libSessions: libSessions || [],
      dailyActivity,
      scoreTrend,
      labelCounts,
      totalStudyMins,
      avgScore,
      streak,
      completedSessions: (sessions || []).filter(s => s.completed).length,
    })
    setLoading(false)
  }

  const topStreak = data?.languages?.reduce((max, l) => Math.max(max, l.streak || 0), 0) || 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '90px 16px 80px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>📈 Study Analytics</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Track your learning habits, progress, and patterns over time</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['7', '7 days'], ['30', '30 days'], ['90', '3 months']].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: period === v ? 'rgba(37,99,235,0.18)' : 'var(--surface)', color: period === v ? '#60a5fa' : '#64748b', border: `1px solid ${period === v ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            Crunching your data...
          </div>
        ) : data && (
          <>
            {/* Key stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard icon="📚" label="Files in Library" value={data.library.length} sub={`${data.library.filter(f => f.label === 'Past Exam Paper').length} past papers`} color="#2563eb" />
              <StatCard icon="✍️" label="Practice Exams" value={data.practice.length} sub={data.avgScore ? `Avg score: ${data.avgScore}%` : 'None completed'} color="#7c3aed" />
              <StatCard icon="📅" label="Sessions Done" value={data.completedSessions} sub={`of ${data.sessions.length} planned`} color="#10b981" />
              <StatCard icon="⏱️" label="Study Time" value={data.totalStudyMins >= 60 ? `${Math.floor(data.totalStudyMins / 60)}h ${data.totalStudyMins % 60}m` : `${data.totalStudyMins}m`} sub="estimated" color="#f59e0b" />
              <StatCard icon="🔥" label="Activity Streak" value={`${data.streak}d`} sub="consecutive days" color={data.streak >= 7 ? '#f59e0b' : '#64748b'} />
              <StatCard icon="💬" label="EduBot Chats" value={data.conversations.length} sub={`in last ${period} days`} color="#60a5fa" />
              <StatCard icon="🌐" label="Language Streak" value={`${topStreak}d`} sub={data.languages.length > 0 ? data.languages[0].language : '—'} color="#ec4899" />
              <StatCard icon="⚠️" label="Weak Topics" value={data.weakTopics.length} sub="needing attention" color={data.weakTopics.length > 3 ? '#ef4444' : '#64748b'} />
            </div>

            {/* Daily activity chart */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>📅 Daily Activity (last 14 days)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Study sessions + EduBot conversations + Library activity</div>
              <BarChart data={data.dailyActivity} color="#2563eb" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Score trend */}
              {data.scoreTrend.length > 1 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>✍️ Practice Score Trend</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Last {data.scoreTrend.length} practice attempts</div>
                  <BarChart data={data.scoreTrend} color="#7c3aed" max={100} />
                </div>
              )}

              {/* Library breakdown */}
              {Object.keys(data.labelCounts).length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>📚 Library Breakdown</div>
                  {Object.entries(data.labelCounts).sort(([,a],[,b]) => b - a).map(([label, count]) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: '#e2e8f0' }}>{label}</span>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / data.library.length) * 100}%`, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weak topics */}
            {data.weakTopics.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>⚠️ Topics Needing Attention</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>The AI detected these topics where you asked for help or showed confusion</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                  {data.weakTopics.slice(0, 8).map(t => (
                    <div key={t.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{t.topic}</div>
                      {t.module && <div style={{ fontSize: 10, color: '#64748b' }}>{t.module}</div>}
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>Flagged {t.occurrence_count || 1}× </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language progress */}
            {data.languages.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>🌐 Language Progress</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  {data.languages.map(l => (
                    <div key={l.id} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 8 }}>{l.language}</div>
                      <div style={{ display: 'flex', justify: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        <span>Level {l.level || 1}</span>
                        <span>{l.xp || 0} XP</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${Math.min(100, ((l.xp || 0) % 200) / 2)}%`, background: '#f59e0b', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>🔥 {l.streak || 0}-day streak</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}