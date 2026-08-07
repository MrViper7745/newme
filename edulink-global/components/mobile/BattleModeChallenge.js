import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'
import MobileBottomSheet from './MobileBottomSheet'

export default function BattleModeChallenge({ open, onClose, user, profile }) {
  const haptic = useHaptic()
  const [phase, setPhase] = useState('setup') // setup | searching | waiting | battle | results
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [opponent, setOpponent] = useState(null)
  const [subject, setSubject] = useState('')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [timer, setTimer] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [battleId, setBattleId] = useState(null)
  const timerRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setPhase('setup'); setOpponent(null); setQuestions([])
      setCurrentQ(0); setAnswers({}); setSelected(null); setTimer(0)
      setMyScore(0); setOpponentScore(0)
    }
  }, [open])

  useEffect(() => {
    if (phase === 'battle') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const searchUsers = async (q) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    const { data } = await supabase.from('profiles').select('id,name,username,avatar_url,field').ilike('username', `%${q}%`).neq('id', user.id).limit(6)
    setSearchResults(data || [])
  }

  const challenge = async (target) => {
    if (!subject.trim()) { return }
    haptic.tap()
    setOpponent(target)
    setPhase('generating')

    const prompt = `Generate 10 medium difficulty multiple choice questions on: "${subject}". Return ONLY JSON array: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
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
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
      const parsed = JSON.parse(clean.slice(s, e + 1))
      setQuestions(parsed)
      setPhase('battle')
    } catch { setPhase('setup') }
  }

  const confirmAnswer = () => {
    if (selected === null) return
    const correct = selected === questions[currentQ]?.correct
    if (correct) { haptic.correct(); setMyScore(s => s + 1) } else haptic.wrong()
    setAnswers(prev => ({ ...prev, [currentQ]: selected }))
    setTimeout(() => {
      if (currentQ < questions.length - 1) { setCurrentQ(c => c + 1); setSelected(null) }
      else setPhase('results')
    }, 800)
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="⚔️ Challenge Battle" height="90vh" fullscreen>
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {phase === 'setup' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
              Challenge another student to a head-to-head quiz duel. Same questions, same time limit — highest score wins bonus points.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Subject / Topic</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Engineering Mathematics, Accounting..."
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Find Opponent by @username</label>
              <input value={searchQuery} onChange={e => searchUsers(e.target.value)} placeholder="Search @username..."
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
            {searchResults.map(p => (
              <div key={p.id} onClick={() => challenge(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {(p.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#60a5fa' }}>@{p.username}</div>
                </div>
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚔️ Challenge</span>
              </div>
            ))}
          </div>
        )}

        {phase === 'generating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>⚔️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Generating battle questions...</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>10 questions on {subject}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: `bounce 1s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}

        {phase === 'battle' && questions[currentQ] && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{myScore}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{profile?.name?.split(' ')[0] || 'You'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>⏱ {fmtTime(timer)}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Q {currentQ + 1}/{questions.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>{opponentScore}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{opponent?.name?.split(' ')[0] || 'Opponent'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
              {questions.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < currentQ ? '#10b981' : i === currentQ ? '#ef4444' : 'var(--surface2)' }} />)}
            </div>

            <div style={{ padding: '16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14, flex: 0 }}>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.65, fontWeight: 500 }}>{questions[currentQ].question}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
              {questions[currentQ].options?.map((opt, i) => {
                const isSelected = selected === i
                const isAnswered = answers[currentQ] !== undefined
                const isCorrect = questions[currentQ].correct === i
                let bg = 'var(--surface2)', border = 'var(--border)', color = 'var(--text)'
                if (!isAnswered && isSelected) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; color = '#ef4444' }
                if (isAnswered && isCorrect) { bg = 'rgba(16,185,129,0.1)'; border = '#10b981'; color = '#10b981' }
                if (isAnswered && answers[currentQ] === i && !isCorrect) { bg = 'rgba(239,68,68,0.08)'; border = '#ef4444'; color = '#ef4444' }
                return (
                  <div key={i} onClick={() => answers[currentQ] === undefined && setSelected(i)}
                    style={{ padding: '12px 16px', borderRadius: 11, border: `1.5px solid ${border}`, background: bg, color, cursor: isAnswered ? 'default' : 'pointer', fontSize: 14, lineHeight: 1.5, transition: 'all 0.15s' }}>
                    {opt}
                  </div>
                )
              })}
            </div>

            {selected !== null && answers[currentQ] === undefined && (
              <button onClick={confirmAnswer} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 14 }}>
                {currentQ < questions.length - 1 ? 'Lock In & Next →' : 'Finish Battle 🏁'}
              </button>
            )}
          </div>
        )}

        {phase === 'results' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{myScore > opponentScore ? '🏆' : myScore === opponentScore ? '🤝' : '📚'}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: myScore > opponentScore ? '#10b981' : '#f59e0b', marginBottom: 8 }}>
              {myScore > opponentScore ? 'You Won!' : myScore === opponentScore ? 'It\'s a Draw!' : 'You Lost!'}
            </div>
            <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
              <div><div style={{ fontSize: 32, fontWeight: 900, color: '#10b981' }}>{myScore}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Your Score</div></div>
              <div style={{ fontSize: 24, color: 'var(--text3)', alignSelf: 'center' }}>vs</div>
              <div><div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444' }}>{opponentScore}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{opponent?.name?.split(' ')[0]}</div></div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Time: {fmtTime(timer)} · {questions.length} questions</div>
            <button onClick={() => { setPhase('setup'); setOpponent(null); setQuestions([]); setCurrentQ(0); setAnswers({}); setSelected(null); setTimer(0); setMyScore(0); setOpponentScore(0) }}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Battle Again ⚔️
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-6px);opacity:1}}`}</style>
    </MobileBottomSheet>
  )
}