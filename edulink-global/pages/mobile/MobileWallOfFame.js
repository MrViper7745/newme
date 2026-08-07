import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'

export default function MobileWallOfFame() {
  const { user } = useUser()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [filter])

  const load = async () => {
    setLoading(true)
    let query = supabase.from('challenge_winners')
      .select('*, user:profiles!user_id(name,username,avatar_url,field,institution), challenge:challenges!challenge_id(title,subject,difficulty)')
      .eq('payment_status', 'paid')
      .order('awarded_at', { ascending: false })
      .limit(50)

    const { data } = await query
    setEntries(data || [])
    setLoading(false)
  }

  const DIFF_COLOR = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', expert: '#7c3aed' }

  return (
    <MobileLayout title="🏅 Wall of Fame">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Wall of Fame</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>Students who achieved Gold tier in challenges. A permanent public record of academic excellence.</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(245,158,11,0.2)', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>No winners yet — be the first!</div>
          </div>
        ) : entries.map((entry, i) => {
          const isMe = entry.user_id === user?.id
          return (
            <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderRadius: 14, background: isMe ? 'rgba(245,158,11,0.08)' : 'var(--surface)', border: `1px solid ${isMe ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`, marginBottom: 10 }}>
              <div style={{ fontSize: 22, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏆'}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                {entry.user?.avatar_url ? <img src={entry.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (entry.user?.name || '?')[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? '#f59e0b' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.user?.name || 'Student'}{isMe ? ' 🌟' : ''}
                </div>
                {entry.user?.username && <div style={{ fontSize: 11, color: '#60a5fa' }}>@{entry.user.username}</div>}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.challenge?.title} · <span style={{ color: DIFF_COLOR[entry.challenge?.difficulty] || '#64748b' }}>{entry.challenge?.difficulty}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(entry.awarded_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>R{entry.prize_amount?.toFixed(0)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}