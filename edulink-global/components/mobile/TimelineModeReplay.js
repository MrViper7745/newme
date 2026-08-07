import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import MobileBottomSheet from './MobileBottomSheet'

export default function TimelineModeReplay({ open, onClose, userId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    if (open && userId) load()
  }, [open, userId, period])

  const load = async () => {
    setLoading(true)
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [sessRes, libRes, chalRes, convRes] = await Promise.all([
      supabase.from('study_sessions').select('module_name,session_date,completed,duration_minutes').eq('user_id', userId).gte('session_date', from.split('T')[0]).order('session_date', { ascending: false }).limit(20),
      supabase.from('library_files').select('title,saved_at,label').eq('user_id', userId).gte('saved_at', from).order('saved_at', { ascending: false }).limit(10),
      supabase.from('challenge_attempts').select('percentage,passed,completed_at').eq('user_id', userId).gte('completed_at', from).eq('completed', true).order('completed_at', { ascending: false }).limit(10),
      supabase.from('bot_conversations').select('title,created_at').eq('user_id', userId).gte('created_at', from).order('created_at', { ascending: false }).limit(10),
    ])

    const allEvents = [
      ...(sessRes.data || []).map(s => ({ type: 'session', icon: '📅', color: '#2563eb', title: s.module_name || 'Study session', desc: `${s.duration_minutes || 45}min · ${s.completed ? 'Completed' : 'Planned'}`, timestamp: new Date(s.session_date + 'T12:00:00'), status: s.completed ? 'done' : 'planned' })),
      ...(libRes.data || []).map(f => ({ type: 'file', icon: '📄', color: '#7c3aed', title: f.title || 'File saved', desc: f.label || 'Library file', timestamp: new Date(f.saved_at) })),
      ...(chalRes.data || []).map(c => ({ type: 'challenge', icon: c.passed ? '🏆' : '📚', color: c.passed ? '#f59e0b' : '#64748b', title: c.passed ? 'Challenge passed!' : 'Challenge attempted', desc: `Score: ${c.percentage?.toFixed(0)}%`, timestamp: new Date(c.completed_at) })),
      ...(convRes.data || []).map(c => ({ type: 'chat', icon: '💬', color: '#10b981', title: c.title || 'EduBot chat', desc: 'AI conversation', timestamp: new Date(c.created_at) })),
    ].sort((a, b) => b.timestamp - a.timestamp)

    setEvents(allEvents)
    setLoading(false)
  }

  const groupByDate = () => {
    const groups = {}
    events.forEach(e => {
      const key = e.timestamp.toLocaleDateString('en-ZA', { weekday: 'long', month: 'short', day: 'numeric' })
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return groups
  }

  const grouped = groupByDate()

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="📅 Study History" height="88vh">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[['week', '7 days'], ['month', '30 days'], ['quarter', '3 months']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: period === v ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: period === v ? '#60a5fa' : 'var(--text3)', border: `1px solid ${period === v ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Loading timeline...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>No activity in this period</div>
          </div>
        ) : Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, paddingLeft: 32 }}>{date}</div>
            {dayEvents.map((event, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${event.color}15`, border: `1px solid ${event.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{event.icon}</div>
                  {i < dayEvents.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', margin: '4px 0' }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {event.desc} · {event.timestamp.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}