import { useState, useEffect } from 'react'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function WeakTopics() {
  const { user } = useUser()
  const router = useRouter()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadTopics() }, [user])

  const loadTopics = async () => {
    const { data } = await supabase
      .from('weak_topics')
      .select('*')
      .eq('user_id', user.id)
      .eq('resolved', false)
      .order('occurrence_count', { ascending: false })
      .order('last_occurred_at', { ascending: false })
      .limit(6)
    setTopics(data || [])
    setLoading(false)
  }

  const markResolved = async (id) => {
    await supabase.from('weak_topics').update({ resolved: true }).eq('id', id)
    setTopics(p => p.filter(t => t.id !== id))
  }

  if (loading || topics.length === 0) return null

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>Topics to Review</span>
        </div>
        <span style={{ fontSize: 11, color: '#64748b' }}>Based on your study sessions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
        {topics.map(t => (
          <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, lineHeight: 1.3 }}>{t.topic}</span>
              {t.occurrence_count > 1 && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>×{t.occurrence_count}</span>
              )}
            </div>
            {t.module && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{t.module}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => router.push(t.file_id ? `/library` : '/study-ai')} style={{ flex: 1, padding: '5px 10px', borderRadius: 6, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                📚 Review
              </button>
              <button onClick={() => markResolved(t.id)} style={{ padding: '5px 9px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}