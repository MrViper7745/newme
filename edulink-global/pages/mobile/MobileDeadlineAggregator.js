// pages/mobile/MobileDeadlineAggregator.js
import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'

export default function MobileDeadlineAggregator() {
  const { user } = useUser()
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [exams, apps, challenges] = await Promise.all([
      supabase.from('exam_entries').select('module_name,exam_date').eq('user_id', user.id).gte('exam_date', today).order('exam_date').limit(10),
      supabase.from('applications').select('role,company,deadline,status').eq('user_id', user.id).gte('deadline', today).neq('status', 'submitted').order('deadline').limit(10),
      supabase.from('challenges').select('title,ends_at').eq('is_active', true).gte('ends_at', new Date().toISOString()).order('ends_at').limit(5),
    ])

    const all = [
      ...(exams.data || []).map(e => ({ type: 'exam', icon: '📅', color: '#ef4444', title: e.module_name, date: new Date(e.exam_date + 'T12:00:00'), desc: 'Exam' })),
      ...(apps.data || []).map(a => ({ type: 'application', icon: '📋', color: '#f59e0b', title: `${a.role} at ${a.company}`, date: new Date(a.deadline + 'T23:59:59'), desc: 'Application deadline' })),
      ...(challenges.data || []).map(c => ({ type: 'challenge', icon: '🏆', color: '#2563eb', title: c.title, date: new Date(c.ends_at), desc: 'Challenge ends' })),
    ].sort((a, b) => a.date - b.date)

    setDeadlines(all)
    setLoading(false)
  }

  const daysUntil = (date) => Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
  const urgencyColor = (days) => days <= 1 ? '#ef4444' : days <= 3 ? '#f97316' : days <= 7 ? '#f59e0b' : '#10b981'

  return (
    <MobileLayout title="⏰ All Deadlines">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Everything due — exams, applications, and active challenges in one place.</div>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>Loading...</div>
        : deadlines.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}><div style={{ fontSize: 36, marginBottom: 10 }}>✅</div><div>No upcoming deadlines!</div></div>
        : deadlines.map((d, i) => {
          const days = daysUntil(d.date)
          return (
            <div key={i} style={{ padding: '13px 16px', borderRadius: 13, background: 'var(--surface)', border: `1px solid ${d.color}20`, borderLeft: `3px solid ${d.color}`, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.desc} · {d.date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: urgencyColor(days), lineHeight: 1 }}>{days}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>days</div>
              </div>
            </div>
          )
        })}
      </div>
    </MobileLayout>
  )
}