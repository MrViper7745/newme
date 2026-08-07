import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_CONFIG = {
  study_suggestion:  { icon: '📚', color: '#2563eb' },
  weak_topic:        { icon: '⚠️', color: '#ef4444' },
  inactivity:        { icon: '📖', color: '#f59e0b' },
  exam_warning:      { icon: '⏰', color: '#ef4444' },
  deadline_warning:  { icon: '📋', color: '#f59e0b' },
  streak_risk:       { icon: '🔥', color: '#f59e0b' },
  performance:       { icon: '📉', color: '#ef4444' },
  budget_warning:    { icon: '💰', color: '#f59e0b' },
  profile_incomplete:{ icon: '🎓', color: '#2563eb' },
  achievement:       { icon: '🏆', color: '#10b981' },
}

export default function NotificationPanel({ userId, onClose }) {
  const router = useRouter()
  const [insights, setInsights] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const panelRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    loadAll()
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userId])

  const loadAll = async () => {
    setLoading(true)
    const [insightsRes, msgsRes] = await Promise.all([
      supabase.from('agent_insights').select('*').eq('user_id', userId).eq('dismissed', false)
        .order('created_at', { ascending: false }).limit(15),
      supabase.from('direct_messages')
        .select('*, sender:profiles!sender_id(name,username,avatar_url)')
        .eq('receiver_id', userId).eq('read', false)
        .order('created_at', { ascending: false }).limit(10),
    ])
    setInsights(insightsRes.data || [])
    setMessages(msgsRes.data || [])
    setLoading(false)
  }

  const dismissInsight = async (id, e) => {
    e?.stopPropagation()
    await supabase.from('agent_insights').update({ dismissed: true }).eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const markMessageRead = async (id) => {
    await supabase.from('direct_messages').update({ read: true }).eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const dismissAll = async () => {
    await supabase.from('agent_insights').update({ dismissed: true }).eq('user_id', userId).eq('dismissed', false)
    await supabase.from('direct_messages').update({ read: true }).eq('receiver_id', userId).eq('read', false)
    setInsights([]); setMessages([])
  }

  const go = (href) => { router.push(href); onClose() }

  const allItems = [
    ...insights.map(i => ({ ...i, _kind: 'insight', _ts: i.created_at })),
    ...messages.map(m => ({ ...m, _kind: 'message', _ts: m.created_at })),
  ].sort((a, b) => new Date(b._ts) - new Date(a._ts))

  const filtered = activeTab === 'all' ? allItems
    : activeTab === 'ai' ? allItems.filter(i => i._kind === 'insight')
    : allItems.filter(i => i._kind === 'message')

  const total = insights.length + messages.length

  return (
    <div ref={panelRef} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 380, maxHeight: 520,
      background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9999,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>🔔 Notifications</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{total > 0 ? `${total} unread` : 'All caught up'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {total > 0 && (
            <button onClick={dismissAll} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {[
          { id: 'all',      label: `All (${total})` },
          { id: 'ai',       label: `🤖 AI (${insights.length})` },
          { id: 'messages', label: `✉️ Msgs (${messages.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === t.id ? '#60a5fa' : '#64748b', fontWeight: activeTab === t.id ? 700 : 400, fontSize: 11, borderBottom: `2px solid ${activeTab === t.id ? '#2563eb' : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(37,99,235,0.2)', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>All caught up!</div>
          </div>
        ) : filtered.map((item) => {
          if (item._kind === 'insight') {
            const cfg = TYPE_CONFIG[item.type] || { icon: '🤖', color: '#64748b' }
            return (
              <div key={item.id} onClick={() => item.action_url && go(item.action_url)}
                style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: item.action_url ? 'pointer' : 'default', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cfg.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{item.message}</div>
                  {item.action_label && item.action_url && (
                    <div style={{ marginTop: 6, fontSize: 10, color: cfg.color, fontWeight: 700 }}>{item.action_label} →</div>
                  )}
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>{timeAgo(item.created_at)}</div>
                </div>
                <button onClick={(e) => dismissInsight(item.id, e)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 2px', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#374151'}>×</button>
              </div>
            )
          }

          if (item._kind === 'message') {
            return (
              <div key={item.id} onClick={() => { markMessageRead(item.id); go('/messages') }}
                style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(37,99,235,0.04)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {item.sender?.avatar_url
                    ? <img src={item.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (item.sender?.name || '?')[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                    {item.sender?.name || 'Student'}
                    {item.sender?.username && <span style={{ color: '#60a5fa', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>@{item.sender.username}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</div>
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>{timeAgo(item.created_at)}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 6 }} />
              </div>
            )
          }
          return null
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}