import { useState, useEffect } from 'react'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const PRIORITY_STYLE = {
  high: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
  low: { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: '#60a5fa' },
}

export default function AgentInsights() {
  const { user } = useUser()
  const router = useRouter()
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (user) {
      loadInsights()
      maybeRunCheck()
    }
  }, [user])

  const loadInsights = async () => {
    const { data } = await supabase
      .from('agent_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(5)
    setInsights(data || [])
    setLoading(false)
  }

  // Run a check at most once per 6 hours per user, client-triggered
  const maybeRunCheck = async () => {
    const lastCheck = localStorage.getItem('edulink_agent_lastcheck')
    const sixHours = 6 * 60 * 60 * 1000
    if (lastCheck && Date.now() - parseInt(lastCheck) < sixHours) return

    setChecking(true)
    localStorage.setItem('edulink_agent_lastcheck', Date.now().toString())
    try {
      await fetch('/api/agent-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      await loadInsights()
    } catch {}
    setChecking(false)
  }

  const dismiss = async (id) => {
    await supabase.from('agent_insights').update({ dismissed: true }).eq('id', id)
    setInsights(p => p.filter(i => i.id !== id))
  }

  if (loading || insights.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>EduLink Agent Insights</span>
        {checking && <span style={{ fontSize: 11, color: '#64748b' }}>checking...</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map(insight => {
          const style = PRIORITY_STYLE[insight.priority] || PRIORITY_STYLE.medium
          return (
            <div key={insight.id} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 4 }}>{insight.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{insight.message}</div>
                {insight.action_url && (
                  <button onClick={() => router.push(insight.action_url)} style={{ marginTop: 8, padding: '5px 12px', borderRadius: 7, background: `${style.color}18`, border: `1px solid ${style.color}40`, color: style.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {insight.action_label || 'View →'}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(insight.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}