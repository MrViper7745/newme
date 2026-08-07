import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'

function MiniBar({ value, max, color = '#2563eb', label, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{sub}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, max ? (value / max) * 100 : 0)}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function MobileAnalytics() {
  const { user } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => { if (user) load() }, [user, period])

  const load = async () => {
    setLoading(true)
    const from = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]
    const [libRes, practiceRes, sessionsRes, weakRes, langRes, convsRes] = await Promise.all([
      supabase.from('library_files').select('id,label,priority').eq('user_id', user.id),
      supabase.from('practice_attempts').select('*').eq('user_id', user.id).gte('created_at', from),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('session_date', from.split('T')[0]),
      supabase.from('weak_topics').select('*').eq('user_id', user.id).eq('resolved', false),
      supabase.from('language_progress').select('*').eq('user_id', user.id),
      supabase.from('bot_conversations').select('id,created_at').eq('user_id', user.id).gte('created_at', from),
    ])

    const completedPractice = (practiceRes.data || []).filter(p => p.completed && p.total_score && p.max_score)
    const avgScore = completedPractice.length
      ? Math.round(completedPractice.reduce((s, p) => s + (p.total_score / p.max_score) * 100, 0) / completedPractice.length)
      : null

    const completedSessions = (sessionsRes.data || []).filter(s => s.completed).length
    const totalStudyMins = (sessionsRes.data || []).reduce((s, x) => s + (x.duration_minutes || 45), 0)

    const labelCounts = {}
    ;(libRes.data || []).forEach(f => { if (f.label) labelCounts[f.label] = (labelCounts[f.label] || 0) + 1 })

    let streak = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const hasActivity = (sessionsRes.data || []).some(s => s.session_date === ds) || (convsRes.data || []).some(c => c.created_at?.startsWith(ds))
      if (hasActivity) streak++
      else if (i > 0) break
    }

    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      const ds = d.toISOString().split('T')[0]
      return {
        label: d.toLocaleDateString('en-ZA', { weekday: 'short' }).slice(0, 1),
        value: (sessionsRes.data || []).filter(s => s.session_date === ds).length + (convsRes.data || []).filter(c => c.created_at?.startsWith(ds)).length,
        isToday: ds === today,
      }
    })

    setData({ library: libRes.data || [], practice: practiceRes.data || [], sessions: sessionsRes.data || [], weak: weakRes.data || [], languages: langRes.data || [], convos: convsRes.data || [], avgScore, completedSessions, totalStudyMins, labelCounts, streak, daily })
    setLoading(false)
  }

  return (
    <MobileLayout title="📈 Study Analytics">
      <PullToRefresh onRefresh={load}>
        <div style={{ padding: '12px 16px' }}>

          {/* Period selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[['7', '7 days'], ['30', '30 days'], ['90', '3 months']].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                style={{ flex: 1, padding: '8px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: period === v ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: period === v ? '#60a5fa' : 'var(--text3)', border: `1px solid ${period === v ? 'rgba(37,99,235,0.35)' : 'var(--border)'}` }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Crunching your data...
            </div>
          ) : data && (
            <>
              {/* Key stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { icon: '📚', label: 'Library Files', value: data.library.length, color: '#2563eb' },
                  { icon: '✍️', label: 'Practice Exams', value: data.practice.length, color: '#7c3aed', sub: data.avgScore ? `Avg ${data.avgScore}%` : null },
                  { icon: '📅', label: 'Sessions Done', value: data.completedSessions, color: '#10b981', sub: `of ${data.sessions.length}` },
                  { icon: '⏱️', label: 'Study Time', value: data.totalStudyMins >= 60 ? `${Math.floor(data.totalStudyMins / 60)}h` : `${data.totalStudyMins}m`, color: '#f59e0b' },
                  { icon: '🔥', label: 'Activity Streak', value: `${data.streak}d`, color: data.streak >= 7 ? '#f59e0b' : '#64748b' },
                  { icon: '💬', label: 'EduBot Chats', value: data.convos.length, color: '#60a5fa' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 12px' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: s.sub ? 1 : 0 }}>{s.label}</div>
                    {s.sub && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Daily activity chart */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 14 }}>📅 Daily Activity — Last 14 Days</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                  {data.daily.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.value > 0 ? (d.isToday ? '#60a5fa' : '#2563eb') : 'var(--surface2)', height: `${Math.max(d.value > 0 ? 8 : 2, (d.value / Math.max(...data.daily.map(x => x.value), 1)) * 70)}px`, border: d.isToday ? '1px solid rgba(37,99,235,0.5)' : 'none' }} />
                      <span style={{ fontSize: 8, color: d.isToday ? '#60a5fa' : 'var(--text3)', fontWeight: d.isToday ? 700 : 400 }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Library breakdown */}
              {Object.keys(data.labelCounts).length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 14 }}>📚 Library Breakdown</div>
                  {Object.entries(data.labelCounts).sort(([, a], [, b]) => b - a).map(([label, count]) => (
                    <MiniBar key={label} label={label} value={count} max={data.library.length} sub={`${count} file${count !== 1 ? 's' : ''}`}
                      color={label === 'Past Exam Paper' ? '#ef4444' : label === 'Lecture Slides' ? '#2563eb' : label === 'Study Notes' ? '#8b5cf6' : '#10b981'} />
                  ))}
                </div>
              )}

              {/* Weak topics */}
              {data.weak.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 4 }}>⚠️ Topics Needing Attention</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>These topics the AI detected you struggling with</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.weak.slice(0, 5).map(t => (
                      <div key={t.id} style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.topic}</div>
                          {t.module && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t.module}</div>}
                        </div>
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>Flagged {t.occurrence_count || 1}×</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Language progress */}
              {data.languages.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 14 }}>🌐 Language Progress</div>
                  {data.languages.map(l => (
                    <div key={l.id} style={{ padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{l.language}</div>
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>🔥 {l.streak || 0}d</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                        <span>Level {l.level || 1}</span>
                        <span>{l.xp || 0} XP</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, ((l.xp || 0) % 200) / 2)}%`, background: '#f59e0b', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}