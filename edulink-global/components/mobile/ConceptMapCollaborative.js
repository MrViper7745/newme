import { useState, useEffect, useRef } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import useHaptic from '../../hooks/useHaptic'
import { supabase } from '../../lib/supabase'

export default function ConceptMapCollaborative({ open, onClose, groupId, user }) {
  const haptic = useHaptic()
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [adding, setAdding] = useState(false)
  const [newNode, setNewNode] = useState({ label: '', desc: '', x: 50, y: 50 })
  const [selected, setSelected] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')

  const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  const addNode = () => {
    if (!newNode.label.trim()) return
    const node = {
      id: `node_${Date.now()}`,
      label: newNode.label,
      desc: newNode.desc,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      color: COLORS[nodes.length % COLORS.length],
      addedBy: user?.id,
    }
    setNodes(prev => [...prev, node])
    setNewNode({ label: '', desc: '', x: 50, y: 50 })
    setAdding(false)
    haptic.success()
  }

  const connectNodes = (nodeId) => {
    if (!connecting) { setConnecting(nodeId); return }
    if (connecting === nodeId) { setConnecting(null); return }
    setConnections(prev => [...prev, { from: connecting, to: nodeId, id: `conn_${Date.now()}` }])
    setConnecting(null)
    haptic.tap()
  }

  const removeNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId))
    setSelected(null)
    haptic.warning()
  }

  const generateAI = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Create a concept map for "${topic}". Return ONLY JSON:
{"nodes":[{"label":"Main concept","desc":"Brief description","central":true},{"label":"Sub concept 1","desc":"Description"}],"connections":[{"from":0,"to":1,"label":"relates to"}]}
Include 1 central node and 5-7 connected nodes. Keep descriptions under 20 words.`
          }]
        })
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim(); if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      const clean = full.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
      const data = JSON.parse(clean.slice(s, e + 1))
      const newNodes = data.nodes.map((n, i) => ({ id: `ai_${i}`, label: n.label, desc: n.desc, x: n.central ? 45 : 10 + (i * 20) % 80, y: n.central ? 45 : 10 + Math.floor(i / 4) * 30, color: n.central ? '#7c3aed' : COLORS[i % COLORS.length], addedBy: 'ai' }))
      const newConns = (data.connections || []).map((c, i) => ({ id: `ai_conn_${i}`, from: `ai_${c.from}`, to: `ai_${c.to}`, label: c.label }))
      setNodes(prev => [...prev, ...newNodes])
      setConnections(prev => [...prev, ...newConns])
      setTopic('')
    } catch {}
    setGenerating(false)
  }

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🧩 Concept Map" height="90vh">
      <div style={{ padding: '16px', height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column' }}>

        {/* AI generate */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Generate map for topic..."
            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
          <button onClick={generateAI} disabled={!topic.trim() || generating}
            style={{ padding: '9px 14px', borderRadius: 10, background: generating ? 'var(--surface2)' : 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            {generating ? '⏳' : '🤖 AI'}
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          {nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧩</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Empty concept map</div>
              <div style={{ fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Use AI to generate or add nodes manually</div>
            </div>
          )}
          {/* Connections */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {connections.map(conn => {
              const from = nodes.find(n => n.id === conn.from)
              const to = nodes.find(n => n.id === conn.to)
              if (!from || !to) return null
              return (
                <line key={conn.id}
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke="rgba(124,58,237,0.3)" strokeWidth={2} strokeDasharray="4,3" />
              )
            })}
          </svg>
          {/* Nodes */}
          {nodes.map(node => (
            <div key={node.id}
              onClick={() => connecting ? connectNodes(node.id) : setSelected(selected === node.id ? null : node.id)}
              style={{ position: 'absolute', left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%,-50%)', background: node.color + '20', border: `2px solid ${connecting === node.id ? '#fff' : node.color}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', maxWidth: 100, zIndex: 1, boxShadow: selected === node.id ? `0 0 0 2px ${node.color}` : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: node.color, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</div>
            </div>
          ))}
        </div>

        {/* Selected node actions */}
        {selected && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{nodes.find(n => n.id === selected)?.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{nodes.find(n => n.id === selected)?.desc}</div>
            </div>
            <button onClick={() => { setConnecting(selected); setSelected(null) }} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Connect</button>
            <button onClick={() => removeNode(selected)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Remove</button>
          </div>
        )}

        {connecting && (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 10, fontSize: 12, color: '#a78bfa', textAlign: 'center' }}>
            Tap another node to connect · <button onClick={() => setConnecting(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          </div>
        )}

        {/* Add node */}
        {!adding ? (
          <button onClick={() => setAdding(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(37,99,235,0.1)', border: '1px dashed rgba(37,99,235,0.3)', color: '#60a5fa', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Add Node
          </button>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 14 }}>
            <input value={newNode.label} onChange={e => setNewNode(p => ({ ...p, label: e.target.value }))} placeholder="Node label" autoFocus
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', marginBottom: 8 }} />
            <input value={newNode.desc} onChange={e => setNewNode(p => ({ ...p, desc: e.target.value }))} placeholder="Brief description (optional)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addNode} disabled={!newNode.label.trim()} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  )
}