import { useState, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import VoiceInput from '../../components/mobile/VoiceInput'
import useHaptic from '../../hooks/useHaptic'
import useDeviceMotion from '../../hooks/useDeviceMotion'

const TOOLS = [
  { id: 'summarise',     icon: '📋', label: 'Summarise',      desc: 'Key points from your content', color: '#2563eb' },
  { id: 'flashcards',   icon: '🃏', label: 'Flashcards',      desc: 'Swipeable Q&A cards',          color: '#7c3aed' },
  { id: 'quiz',         icon: '✍️', label: 'Quiz',            desc: '5 multiple choice questions',  color: '#10b981' },
  { id: 'examquestions',icon: '📝', label: 'Exam Questions',  desc: 'Past-paper style questions',   color: '#f59e0b' },
  { id: 'mindmap',      icon: '🧠', label: 'Mind Map',        desc: 'Visual concept map',           color: '#ec4899' },
  { id: 'glossary',     icon: '📖', label: 'Glossary',        desc: 'Key terms and definitions',    color: '#06b6d4' },
  { id: 'timeline',     icon: '⏳', label: 'Timeline',        desc: 'Chronological overview',       color: '#f97316' },
  { id: 'chat',         icon: '💬', label: 'Chat',            desc: 'Ask anything about content',   color: '#64748b' },
]

function Flashcards({ cards, onShuffle }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState([])
  const [review, setReview] = useState([])
  const haptic = useHaptic()

  useDeviceMotion(onShuffle, 20)

  if (!cards?.length) return null
  const card = cards[idx]
  const done = idx >= cards.length

  if (done) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Deck Complete!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>✅ {known.length} known · 🔁 {review.length} to review</div>
        {review.length > 0 && (
          <button onClick={() => { setIdx(0); setFlipped(false); setKnown([]); setReview([]) }}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
            🔁 Review {review.length} cards again
          </button>
        )}
        <button onClick={() => { setIdx(0); setFlipped(false); setKnown([]); setReview([]) }}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Restart Deck
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Card {idx + 1} of {cards.length}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>🤙 Shake to shuffle</div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
        {cards.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < idx ? '#10b981' : i === idx ? '#7c3aed' : 'var(--surface2)' }} />)}
      </div>

      <div onClick={() => { setFlipped(f => !f); haptic.tap() }}
        style={{ minHeight: 200, padding: '28px 20px', borderRadius: 18, background: flipped ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(37,99,235,0.08))' : 'var(--surface)', border: `2px solid ${flipped ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20, transition: 'all 0.25s' }}>
        <div style={{ fontSize: 10, color: flipped ? '#a78bfa' : 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {flipped ? '💡 Answer' : '❓ Question'}
        </div>
        <div style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.6, fontWeight: flipped ? 400 : 600 }}>
          {flipped ? card.answer : card.question}
        </div>
        {!flipped && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Tap to reveal answer</div>}
      </div>

      {flipped && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={() => { haptic.wrong(); setReview(prev => [...prev, card]); setIdx(i => i + 1); setFlipped(false) }}
            style={{ padding: '14px', borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🔁 Review Again
          </button>
          <button onClick={() => { haptic.correct(); setKnown(prev => [...prev, card]); setIdx(i => i + 1); setFlipped(false) }}
            style={{ padding: '14px', borderRadius: 13, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ✅ Got It!
          </button>
        </div>
      )}
    </div>
  )
}

function QuizMode({ questions }) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState({})
  const [done, setDone] = useState(false)
  const haptic = useHaptic()

  if (!questions?.length) return null

  const score = Object.values(answered).filter(Boolean).length

  if (done) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>{score >= questions.length * 0.8 ? '🏆' : score >= questions.length * 0.5 ? '📚' : '💪'}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: score >= questions.length * 0.8 ? '#10b981' : '#f59e0b', marginBottom: 8 }}>
          {score}/{questions.length} — {Math.round((score / questions.length) * 100)}%
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
          {score >= questions.length * 0.8 ? 'Excellent! You know this topic well.' : score >= questions.length * 0.5 ? 'Good effort — review the topics you missed.' : 'Keep studying — you will get there!'}
        </div>
        <button onClick={() => { setIdx(0); setSelected(null); setAnswered({}); setDone(false) }}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    )
  }

  const q = questions[idx]

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Question {idx + 1} of {questions.length}</div>
        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>Score: {score}</div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
        {questions.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < idx ? (answered[i] ? '#10b981' : '#ef4444') : i === idx ? '#2563eb' : 'var(--surface2)' }} />)}
      </div>

      <div style={{ padding: '18px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 8 }}>Q{idx + 1}</div>
        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.65, fontWeight: 500 }}>{q.question}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
        {q.options?.map((opt, i) => {
          const isSelected = selected === i
          const isAnswered = answered[idx] !== undefined
          const isCorrect = q.correct === i
          let bg = 'var(--surface2)', border = 'var(--border)', color = 'var(--text)'
          if (!isAnswered && isSelected) { bg = 'rgba(37,99,235,0.12)'; border = '#2563eb'; color = '#60a5fa' }
          if (isAnswered && isCorrect) { bg = 'rgba(16,185,129,0.1)'; border = '#10b981'; color = '#10b981' }
          if (isAnswered && isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.08)'; border = '#ef4444'; color = '#ef4444' }
          return (
            <div key={i} onClick={() => !isAnswered && setSelected(i)}
              style={{ padding: '13px 16px', borderRadius: 11, border: `1.5px solid ${border}`, background: bg, color, cursor: isAnswered ? 'default' : 'pointer', fontSize: 14, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.15s' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {isAnswered && isCorrect ? '✓' : isAnswered && isSelected ? '✗' : String.fromCharCode(65 + i)}
              </div>
              {opt}
            </div>
          )
        })}
      </div>

      {selected !== null && answered[idx] === undefined && (
        <button onClick={() => {
          const correct = selected === q.correct
          if (correct) haptic.correct(); else haptic.wrong()
          setAnswered(prev => ({ ...prev, [idx]: correct }))
          setTimeout(() => {
            if (idx < questions.length - 1) { setIdx(i => i + 1); setSelected(null) }
            else setDone(true)
          }, 900)
        }}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Confirm Answer
        </button>
      )}

      {answered[idx] !== undefined && q.explanation && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: answered[idx] ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${answered[idx] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: answered[idx] ? '#10b981' : '#ef4444' }}>{answered[idx] ? '✅ Correct! ' : '❌ Incorrect. '}</strong>
          {q.explanation}
        </div>
      )}
    </div>
  )
}

export default function MobileStudyAI() {
  const haptic = useHaptic()
  const [topic, setTopic] = useState('')
  const [activeTool, setActiveTool] = useState(null)
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [sendingChat, setSendingChat] = useState(false)
  const fileRef = useRef(null)
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (file.type === 'application/pdf') {
      const fd = new FormData(); fd.append('file', file)
      try {
        const res = await fetch('/api/extract-pdf-upload', { method: 'POST', body: fd })
        const d = await res.json()
        setFileContent(d.text || '')
        setTopic(file.name.replace(/\.[^.]+$/, ''))
      } catch {}
    } else {
      try { setFileContent(await file.text()); setTopic(file.name.replace(/\.[^.]+$/, '')) } catch {}
    }
    e.target.value = ''
  }

  const runTool = async (toolId) => {
    if (!topic.trim() && !fileContent) return
    haptic.tap()
    setActiveTool(toolId)
    setOutput(null)
    setLoading(true)
    setStreamText('')

    const context = fileContent ? `Content:\n${fileContent.slice(0, 6000)}` : `Topic: ${topic}`
    const prompts = {
      summarise:      `Summarise this content clearly with key points, important concepts, and what to remember:\n${context}`,
      flashcards:     `Create 10 flashcards from this content. Return JSON array only: [{"question":"...","answer":"..."}]\n${context}`,
      quiz:           `Create 5 multiple choice questions. Return JSON only: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]\n${context}`,
      examquestions:  `Generate 5 exam-style questions with mark allocations based on this content:\n${context}`,
      mindmap:        `Create a structured mind map outline with main topics and subtopics:\n${context}`,
      glossary:       `Extract all key terms and definitions as a formatted glossary:\n${context}`,
      timeline:       `Create a chronological or conceptual timeline of the main topics:\n${context}`,
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompts[toolId] }] }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setStreamText(full) } } catch {}
        }
      }
      setStreamText('')

      if (toolId === 'flashcards' || toolId === 'quiz') {
        try {
          const clean = full.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
          setOutput(JSON.parse(clean.slice(s, e + 1)))
        } catch { setOutput(full) }
      } else {
        setOutput(full)
      }
    } catch (err) { setOutput('Error: ' + err.message) }
    setLoading(false)
  }

  const sendChat = async () => {
    if (!chatInput.trim() || sendingChat) return
    const q = chatInput.trim()
    setChatInput('')
    setSendingChat(true)
    const context = fileContent ? `Based on this content: ${fileContent.slice(0, 4000)}\n\n` : topic ? `Topic: ${topic}\n\n` : ''
    const msgs = [...chatMessages, { role: 'user', content: q }]
    setChatMessages(msgs)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: context + 'You are an expert AI study tutor. Be educational, clear, and thorough.' }, ...msgs.slice(-8)] }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      setChatMessages([...msgs, { role: 'assistant', content: '' }])
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setChatMessages([...msgs, { role: 'assistant', content: full }]) } } catch {}
        }
      }
    } catch {}
    setSendingChat(false)
  }

  return (
    <MobileLayout title="🤖 Study AI">
      <div style={{ padding: '12px 16px' }}>

        {/* Input section */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Topic or File</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Type a topic or paste content..."
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            <VoiceInput onResult={(text) => setTopic(text)} />
          </div>
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            📎 {fileName || 'Upload PDF or text file'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
          {fileContent && <div style={{ fontSize: 10, color: '#10b981', marginTop: 6 }}>✅ File loaded — {fileContent.length.toLocaleString()} characters extracted</div>}
        </div>

        {/* Tool grid */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Choose a Tool</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
          {TOOLS.map(tool => (
            <div key={tool.id} onClick={() => tool.id === 'chat' ? setActiveTool('chat') : runTool(tool.id)}
              style={{ padding: '16px 12px', borderRadius: 14, background: activeTool === tool.id ? `${tool.color}12` : 'var(--surface)', border: `1px solid ${activeTool === tool.id ? tool.color + '35' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent' }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{tool.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: activeTool === tool.id ? tool.color : 'var(--text)', marginBottom: 3 }}>{tool.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{tool.desc}</div>
            </div>
          ))}
        </div>

        {/* Output */}
        {(loading || output !== null || activeTool === 'chat') && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                {TOOLS.find(t => t.id === activeTool)?.icon} {TOOLS.find(t => t.id === activeTool)?.label}
              </div>
              <button onClick={() => { setActiveTool(null); setOutput(null); setChatMessages([]) }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                {streamText ? <div style={{ fontSize: 11, color: 'var(--text3)', maxHeight: 40, overflow: 'hidden' }}>{streamText.slice(-100)}</div> : 'Generating...'}
              </div>
            ) : activeTool === 'chat' ? (
              <div>
                <div style={{ padding: '12px 14px', maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {chatMessages.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text3)' }}>Ask anything about your topic or file</div>}
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.6, maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                        {m.content || (sendingChat && i === chatMessages.length - 1 ? '...' : '')}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Ask about this topic..."
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 20, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
                  <button onClick={sendChat} disabled={!chatInput.trim() || sendingChat}
                    style={{ width: 38, height: 38, borderRadius: '50%', background: chatInput.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ↑
                  </button>
                </div>
              </div>
            ) : activeTool === 'flashcards' && Array.isArray(output) ? (
              <Flashcards cards={output} onShuffle={() => { setOutput(prev => [...prev].sort(() => Math.random() - 0.5)); haptic.success() }} />
            ) : activeTool === 'quiz' && Array.isArray(output) ? (
              <QuizMode questions={output} />
            ) : (
              <div style={{ padding: '16px', fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}