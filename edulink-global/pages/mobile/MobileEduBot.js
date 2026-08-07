import { useState, useEffect, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import VoiceInput from '../../components/mobile/VoiceInput'
import MathKeyboard from '../../components/mobile/MathKeyboard'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function MobileEduBot() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [convos, setConvos] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const msgEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { if (user) loadConvos() }, [user])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadConvos = async () => {
    const { data } = await supabase.from('bot_conversations').select('id,title,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    setConvos(data || [])
  }

  const newConvo = () => {
    setActiveConvo(null)
    setMessages([])
    setShowSidebar(false)
    inputRef.current?.focus()
  }

  const openConvo = async (c) => {
    setActiveConvo(c)
    setShowSidebar(false)
    const { data } = await supabase.from('bot_conversations').select('messages').eq('id', c.id).single()
    setMessages(data?.messages || [])
  }

  const send = async () => {
    if (!input.trim() || sending) return
    const q = input.trim()
    setInput('')
    setSending(true)
    haptic.tap()
    const newMsgs = [...messages, { role: 'user', content: q }]
    setMessages(newMsgs)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are EduBot, an expert AI study assistant for South African university students. The student's name is ${profile?.name || 'Student'}, studying ${profile?.field || 'their field'} at ${profile?.institution || 'university'}. Be helpful, educational, and encouraging. Use clear notation for math and science.` },
            ...newMsgs.slice(-12),
          ],
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setMessages([...newMsgs, { role: 'assistant', content: full }]) } } catch {}
        }
      }
      const finalMsgs = [...newMsgs, { role: 'assistant', content: full }]
      if (activeConvo) {
        await supabase.from('bot_conversations').update({ messages: finalMsgs, updated_at: new Date().toISOString() }).eq('id', activeConvo.id)
      } else {
        const title = q.slice(0, 50)
        const { data } = await supabase.from('bot_conversations').insert({ user_id: user.id, title, messages: finalMsgs, created_at: new Date().toISOString() }).select().single()
        if (data) { setActiveConvo(data); setConvos(prev => [data, ...prev]) }
      }
    } catch {}
    setSending(false)
  }

  const SUGGESTIONS = ['Explain this concept to me like I\'m 5', 'Help me with exam preparation', 'Solve this equation step by step', 'What are the key points I need to know?', 'Create a quiz for me', 'Help me write a professional summary']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
        <button onClick={() => setShowSidebar(true)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer', padding: '4px' }}>☰</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>💬 EduBot</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{activeConvo?.title || 'New conversation'}</div>
        </div>
        <button onClick={newConvo} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ New</button>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <>
          <div onClick={() => setShowSidebar(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80%', maxWidth: 300, background: 'var(--surface)', zIndex: 101, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>History</div>
              <button onClick={newConvo} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ New Chat</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {convos.map(c => (
                <div key={c.id} onClick={() => openConvo(c)}
                  style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: activeConvo?.id === c.id ? 'rgba(37,99,235,0.1)' : 'transparent' }}>
                  <div style={{ fontSize: 13, fontWeight: activeConvo?.id === c.id ? 700 : 400, color: activeConvo?.id === c.id ? '#60a5fa' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Conversation'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Ask EduBot Anything</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Your AI study companion for South African university students</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  style={{ padding: '12px 16px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 2 }}>🤖</div>
                )}
                <div style={{ padding: '11px 15px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.65, maxWidth: '85%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content || (sending && i === messages.length - 1 ? <span style={{ animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }}>●●●</span> : '')}
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 12px', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MathKeyboard onInsert={(s) => setInput(prev => prev + s)} />
          </div>
          <VoiceInput onResult={(text) => setInput(prev => prev ? prev + ' ' + text : text)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask anything..."
            rows={1}
            style={{ flex: 1, padding: '11px 14px', borderRadius: 22, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 100 }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ↑
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
    </div>
  )
}