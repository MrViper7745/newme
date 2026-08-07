import { useState } from 'react'
import { useRouter } from 'next/router'
import useHaptic from '../../hooks/useHaptic'

const HIDDEN = ['/assistant', '/login', '/signup', '/register', '/offline']

export default function MobileEduBotBubble() {
  const router = useRouter()
  const haptic = useHaptic()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  if (HIDDEN.includes(router.pathname)) return null

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') break
          try {
            const p = JSON.parse(d)
            if (p.text) {
              full += p.text
              setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'assistant', content: full }; return n })
            }
          } catch {}
        }
      }
    } catch {}
    setLoading(false)
  }

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', bottom: 128, right: 16, width: 300, maxHeight: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', zIndex: 996, boxShadow: '0 8px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>💬 Quick EduBot</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => router.push('/assistant')} style={{ fontSize: 10, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Full ↗</button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0', lineHeight: 1.5 }}>Ask anything without leaving this page</div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: 12, lineHeight: 1.6, maxWidth: '88%' }}>
                  {m.content || (loading && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              style={{ flex: 1, padding: '8px 10px', borderRadius: 9, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ width: 34, height: 34, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↑
            </button>
          </div>
        </div>
      )}

      <div onClick={() => { haptic.tap(); setOpen(o => !o) }}
        style={{ position: 'fixed', bottom: 78, right: 16, zIndex: 995, width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', transition: 'transform 0.15s', transform: open ? 'scale(0.88)' : 'scale(1)' }}>
        {open ? '✕' : '💬'}
      </div>
    </>
  )
}