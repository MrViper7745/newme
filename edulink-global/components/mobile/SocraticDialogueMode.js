import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import useHaptic from '../../hooks/useHaptic'

export default function SocraticDialogueMode({ open, onClose, topic }) {
  const haptic = useHaptic()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const start = async () => {
    setStarted(true)
    setLoading(true)
    const opening = await askSocrates('', true)
    setMessages([{ role: 'assistant', content: opening }])
    setLoading(false)
  }

  const askSocrates = async (userAnswer, isOpening = false) => {
    const systemPrompt = `You are a Socratic tutor helping a student understand "${topic || 'a concept'}". 

RULES — never break these:
1. NEVER give the answer directly
2. ALWAYS respond with a question that guides the student toward the answer
3. If the student is wrong, acknowledge what IS correct in their thinking, then ask a guiding question
4. If the student is right, celebrate briefly then deepen understanding with a harder question
5. Use analogies and concrete examples as questions: "What would happen if...?", "How is this similar to...?"
6. After 6-8 exchanges, summarise what the student discovered themselves`

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-8),
          ...(isOpening ? [] : [{ role: 'user', content: userAnswer }]),
          ...(isOpening ? [{ role: 'user', content: `Start a Socratic dialogue about: "${topic || 'this concept'}". Ask the first guiding question.` }] : []),
        ]
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
    return full
  }

  const respond = async () => {
    if (!input.trim() || loading) return
    const answer = input.trim()
    setInput('')
    haptic.tap()
    const newMsgs = [...messages, { role: 'user', content: answer }]
    setMessages(newMsgs)
    setLoading(true)
    const response = await askSocrates(answer)
    setMessages([...newMsgs, { role: 'assistant', content: response }])
    setLoading(false)
  }

  const reset = () => { setMessages([]); setStarted(false); setInput('') }

  return (
    <MobileBottomSheet open={open} onClose={() => { reset(); onClose() }} title="🧠 Socratic Dialogue" height="88vh">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' }}>
        {!started ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏛️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Socratic Dialogue Mode</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              Instead of giving you answers, EduBot will guide you to discover them yourself through questions. This is the most effective way to truly understand a concept — not just memorise it.
            </div>
            {topic && <div style={{ padding: '10px 16px', borderRadius: 11, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 14, color: '#60a5fa', fontWeight: 600, marginBottom: 20 }}>Topic: {topic}</div>}
            <button onClick={start} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Begin Dialogue 🏛️
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
                  {m.role === 'assistant' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏛️</div>}
                  <div style={{ padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(124,58,237,0.08)', border: m.role === 'assistant' ? '1px solid rgba(124,58,237,0.2)' : 'none', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.65, maxWidth: '85%' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏛️</div>
                  <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', gap: 4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: `bounce 1s ${i*0.2}s ease-in-out infinite` }} />)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); respond() } }}
                placeholder="Think out loud — share your reasoning..."
                rows={2}
                style={{ flex: 1, padding: '10px 13px', borderRadius: 12, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} />
              <button onClick={respond} disabled={!input.trim() || loading}
                style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0 }}>↑</button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </MobileBottomSheet>
  )
}