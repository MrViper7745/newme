import { useState, useEffect, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import useHaptic from '../../hooks/useHaptic'
import useWakeLock from '../../hooks/useWakeLock'

export default function MobileExamRoomSimulator() {
  const haptic = useHaptic()
  const { request: wakeLockRequest, release: wakeLockRelease } = useWakeLock()
  const [phase, setPhase] = useState('setup')
  const [config, setConfig] = useState({ subject: '', questions: 10, duration: 60 })
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [questions, setQuestions] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState(null)
  const [flagged, setFlagged] = useState(new Set())
  const timerRef = useRef(null)

  useEffect(() => {
    if (phase === 'exam') {
      setTimeLeft(config.duration * 60)
      wakeLockRequest()
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
          if (prev === 300) haptic.warning() // 5 min warning
          return prev - 1
        })
      }, 1000)
      return () => { clearInterval(timerRef.current); wakeLockRelease() }
    }
  }, [phase])

  const generateQuestions = async () => {
    if (!config.subject.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate ${config.questions} exam-style multiple choice questions for "${config.subject}". Mix easy, medium and hard questions. Return ONLY JSON array: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"...","marks":2}]`
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
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
      const parsed = JSON.parse(clean.slice(s, e + 1))
      setQuestions(parsed)
      setPhase('exam')
    } catch (err) { alert('Could not generate questions: ' + err.message) }
    setGenerating(false)
  }

  const handleSubmit = () => {
    clearInterval(timerRef.current)
    wakeLockRelease()
    let score = 0; let totalMarks = 0
    const detailed = questions.map((q, i) => {
      const ua = answers[i] ?? -1
      const correct = ua === q.correct
      if (correct) score += (q.marks || 1)
      totalMarks += (q.marks || 1)
      return { ...q, userAnswer: ua, correct }
    })
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0
    setResults({ score, totalMarks, percentage, detailed, timeUsed: config.duration * 60 - timeLeft })
    setPhase('results')
    haptic.timerEnd()
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const toggleFlag = (i) => {
    setFlagged(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })
  }

  if (phase === 'setup') return (
    <MobileLayout title="📝 Exam Simulator">
      <div style={{ padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Exam Room Simulator</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Simulate real exam conditions — timed, full-screen, no distractions. Builds the muscle memory of performing under pressure.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Subject *</label>
            <input value={config.subject} onChange={e => setConfig(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Engineering Mathematics"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 11, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} autoFocus />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Number of Questions</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setConfig(p => ({ ...p, questions: n }))}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: config.questions === n ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: config.questions === n ? '#60a5fa' : 'var(--text3)', border: `1px solid ${config.questions === n ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Time Limit (minutes)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[15, 30, 45, 60, 90].map(n => (
                <button key={n} onClick={() => setConfig(p => ({ ...p, duration: n }))}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: config.duration === n ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: config.duration === n ? '#60a5fa' : 'var(--text3)', border: `1px solid ${config.duration === n ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                  {n}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 20, fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          ⚠️ Once you start, the timer runs continuously until you submit or time runs out — just like a real exam. No pausing.
        </div>

        <button onClick={generateQuestions} disabled={!config.subject.trim() || generating}
          style={{ width: '100%', padding: '16px', borderRadius: 14, background: config.subject.trim() ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'var(--surface2)', color: config.subject.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {generating ? '⏳ Generating exam paper...' : '📝 Begin Exam'}
        </button>
      </div>
    </MobileLayout>
  )

  if (phase === 'exam') return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Exam header */}
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{config.subject}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Q {currentQ + 1}/{questions.length}{flagged.has(currentQ) ? ' 🚩' : ''}</div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#60a5fa', padding: '6px 12px', borderRadius: 9, background: 'rgba(37,99,235,0.06)' }}>
          ⏱ {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {questions.map((_, i) => (
          <div key={i} onClick={() => setCurrentQ(i)}
            style={{ width: 24, height: 24, borderRadius: 6, background: answers[i] !== undefined ? '#10b981' : flagged.has(i) ? 'rgba(245,158,11,0.3)' : i === currentQ ? '#2563eb' : 'var(--surface2)', border: `1px solid ${i === currentQ ? '#2563eb' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Question */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ padding: '16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>QUESTION {currentQ + 1} · {questions[currentQ]?.marks || 1} mark{(questions[currentQ]?.marks || 1) !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>{questions[currentQ]?.question}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {questions[currentQ]?.options?.map((opt, i) => (
            <div key={i} onClick={() => { setAnswers(prev => ({ ...prev, [currentQ]: i })); haptic.tap() }}
              style={{ padding: '13px 16px', borderRadius: 11, border: `1.5px solid ${answers[currentQ] === i ? '#2563eb' : 'var(--border)'}`, background: answers[currentQ] === i ? 'rgba(37,99,235,0.1)' : 'var(--surface)', color: answers[currentQ] === i ? '#60a5fa' : 'var(--text)', cursor: 'pointer', fontSize: 14, lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${answers[currentQ] === i ? '#2563eb' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </div>
              {opt}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toggleFlag(currentQ)}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: flagged.has(currentQ) ? 'rgba(245,158,11,0.1)' : 'var(--surface2)', border: `1px solid ${flagged.has(currentQ) ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, color: flagged.has(currentQ) ? '#f59e0b' : 'var(--text3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            🚩 {flagged.has(currentQ) ? 'Flagged' : 'Flag'}
          </button>
          {currentQ < questions.length - 1 ? (
            <button onClick={() => { setCurrentQ(c => c + 1); haptic.tap() }}
              style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Next →
            </button>
          ) : (
            <button onClick={() => { if (confirm('Submit exam? You cannot go back.')) handleSubmit() }}
              style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Submit Exam ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (phase === 'results' && results) return (
    <MobileLayout title="📊 Exam Results">
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{results.percentage >= 75 ? '🏆' : results.percentage >= 50 ? '📚' : '💪'}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: results.percentage >= 75 ? '#10b981' : results.percentage >= 50 ? '#f59e0b' : '#ef4444', marginBottom: 6 }}>
            {results.score}/{results.totalMarks} — {results.percentage}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>{config.subject}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Time used: {fmtTime(results.timeUsed)} / {config.duration}min</div>
        </div>

        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${results.percentage}%`, background: results.percentage >= 75 ? '#10b981' : results.percentage >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 4, transition: 'width 0.8s' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Question Review</div>
          {results.detailed.map((q, i) => (
            <div key={i} style={{ padding: '11px 14px', borderRadius: 11, background: q.correct ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${q.correct ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>{q.correct ? '✅' : '❌'}</span>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4, marginBottom: q.correct ? 0 : 5 }}>Q{i + 1}: {q.question?.slice(0, 80)}{q.question?.length > 80 ? '...' : ''}</div>
                  {!q.correct && (
                    <>
                      <div style={{ fontSize: 11, color: '#ef4444' }}>Your answer: {q.options?.[q.userAnswer] || 'Not answered'}</div>
                      <div style={{ fontSize: 11, color: '#10b981' }}>Correct: {q.options?.[q.correct]}</div>
                      {q.explanation && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>{q.explanation}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setPhase('setup'); setQuestions([]); setAnswers({}); setCurrentQ(0); setResults(null); setFlagged(new Set()) }}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>
    </MobileLayout>
  )

  return null
}