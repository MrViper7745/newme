import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function StudyStreak({ userId, compact = false }) {
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [studiedToday, setStudiedToday] = useState(false)
  const [last30, setLast30] = useState([]) // which days had activity

  useEffect(() => {
    if (!userId) return
    loadStreak()
  }, [userId])

  const loadStreak = async () => {
    const today = new Date().toISOString().split('T')[0]

    // Check all activity tables for recent dates
    const [sessionsRes, convsRes, libRes] = await Promise.all([
      supabase.from('study_sessions').select('session_date').eq('user_id', userId).order('session_date', { ascending: false }).limit(60),
      supabase.from('bot_conversations').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('library_sessions').select('updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(30),
    ])

    const activeDates = new Set()
    ;(sessionsRes.data || []).forEach(s => activeDates.add(s.session_date))
    ;(convsRes.data || []).forEach(c => activeDates.add(c.created_at?.split('T')[0]))
    ;(libRes.data || []).forEach(l => activeDates.add(l.updated_at?.split('T')[0]))

    // Build last 30 days array
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      return d.toISOString().split('T')[0]
    })
    setLast30(days.map(d => ({ date: d, active: activeDates.has(d) })))

    // Calculate current streak
    let s = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      if (activeDates.has(ds)) { s++; if (ds === today) setStudiedToday(true) }
      else if (i > 0) break
    }
    setStreak(s)

    // Longest streak
    let max = 0, curr = 0
    const sorted = [...activeDates].sort()
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { curr = 1 }
      else {
        const prev = new Date(sorted[i - 1]); const cur = new Date(sorted[i])
        const diff = (cur - prev) / (1000 * 60 * 60 * 24)
        if (diff === 1) curr++
        else curr = 1
      }
      max = Math.max(max, curr)
    }
    setLongestStreak(max)
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{studiedToday ? '🔥' : '⭕'}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? '#f59e0b' : '#64748b' }}>{streak}d streak</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 2 }}>📅 Study Streak</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Daily consistency builds retention</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: streak > 0 ? '#f59e0b' : '#64748b', lineHeight: 1 }}>
            {streak > 0 ? '🔥' : '⭕'} {streak}
          </div>
          <div style={{ fontSize: 10, color: '#64748b' }}>day{streak !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* 30-day heatmap */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 12 }}>
        {last30.map((day, i) => {
          const isToday = day.date === new Date().toISOString().split('T')[0]
          return (
            <div key={i} title={day.date}
              style={{ width: 10, height: 10, borderRadius: 2, background: day.active ? (isToday ? '#f59e0b' : 'rgba(245,158,11,0.5)') : 'rgba(255,255,255,0.06)', border: isToday ? '1px solid #f59e0b' : 'none', transition: 'background 0.2s' }}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
        <span>30 days ago</span>
        <span>{studiedToday ? '✅ Studied today!' : '⏳ Study today to keep streak'}</span>
        <span>Today</span>
      </div>

      {longestStreak > streak && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
          Best streak: <strong style={{ color: '#f59e0b' }}>{longestStreak} days</strong>
        </div>
      )}
    </div>
  )
}