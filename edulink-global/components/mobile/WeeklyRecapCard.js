import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function WeeklyRecapCard({ userId, onDismiss }) {
  const haptic = useHaptic()
  const [data, setData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!userId) return
    const key = `weekly_recap_${getWeekKey()}`
    if (localStorage.getItem(key)) return
    loadData()
  }, [userId])

  const getWeekKey = () => {
    const d = new Date()
    const week = Math.ceil(d.getDate() / 7)
    return `${d.getFullYear()}_${d.getMonth()}_w${week}`
  }

  const loadData = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [sessRes, chalRes, convsRes, langRes] = await Promise.all([
      supabase.from('study_sessions').select('id').eq('user_id', userId).gte('session_date', weekAgo.split('T')[0]).eq('completed', true),
      supabase.from('challenge_attempts').select('id,percentage,passed').eq('user_id', userId).gte('completed_at', weekAgo).eq('completed', true),
      supabase.from('bot_conversations').select('id').eq('user_id', userId).gte('created_at', weekAgo),
      supabase.from('language_progress').select('streak,language').eq('user_id', userId).order('streak', { ascending: false }).limit(1),
    ])

    const challenges = chalRes.data || []
    const passed = challenges.filter(c => c.passed).length
    const avgScore = challenges.length ? Math.round(challenges.reduce((s, c) => s + (c.percentage || 0), 0) / challenges.length) : 0

    setData({
      sessions: sessRes.data?.length || 0,
      challenges: challenges.length,
      challengesPassed: passed,
      avgScore,
      conversations: convsRes.data?.length || 0,
      streak: langRes.data?.[0]?.streak || 0,
      language: langRes.data?.[0]?.language || null,
    })
    setVisible(true)
  }

  const dismiss = () => {
    localStorage.setItem(`weekly_recap_${getWeekKey()}`, '1')
    setVisible(false)
    if (onDismiss) onDismiss()
  }

  const share = async () => {
    if (!data) return
    setSharing(true)
    haptic.success()
    const text = `📊 My EduLink Week:\n✅ ${data.sessions} study sessions\n🏆 ${data.challengesPassed}/${data.challenges} challenges passed\n💬 ${data.conversations} EduBot chats\n🔥 ${data.streak}-day streak\n\nStudying smarter with EduLink Global 🎓`
    try {
      if (navigator.share) await navigator.share({ title: 'My EduLink Week', text })
      else await navigator.clipboard.writeText(text)
    } catch {}
    setSharing(false)
  }

  if (!visible || !data) return null

  const ITEMS = [
    { icon: '📅', label: 'Study Sessions', value: data.sessions, color: '#2563eb' },
    { icon: '🏆', label: 'Challenges', value: `${data.challengesPassed}/${data.challenges}`, color: '#f59e0b' },
    { icon: '💬', label: 'EduBot Chats', value: data.conversations, color: '#7c3aed' },
    { icon: '🔥', label: 'Language Streak', value: `${data.streak}d`, color: '#10b981' },
  ]

  return (
    <div style={{ position: 'fixed', bottom: 78, left: 16, right: 16, zIndex: 990, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 18, padding: '18px 18px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>📊 Your Week in Review</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Here is how you did this week</div>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {ITEMS.map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{item.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={share} disabled={sharing}
          style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {sharing ? '⏳' : '📤 Share My Stats'}
        </button>
        <button onClick={dismiss}
          style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
          Done
        </button>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}