import { useState, useEffect, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import useHaptic from '../../hooks/useHaptic'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'

const TIERS = {
  bronze: { label: 'Bronze', emoji: '🥉', minPct: 50, maxPct: 69, points: 50,  color: '#cd7f32' },
  silver: { label: 'Silver', emoji: '🥈', minPct: 70, maxPct: 89, points: 150, color: '#94a3b8' },
  gold:   { label: 'Gold',   emoji: '🥇', minPct: 90, maxPct: 100,points: 500, color: '#f59e0b' },
}

const POINT_MILESTONES = [
  { points: 500,   rands: 5   },
  { points: 1000,  rands: 12  },
  { points: 2500,  rands: 35  },
  { points: 5000,  rands: 80  },
  { points: 10000, rands: 200 },
]

const DIFF = {
  easy:   { color: '#10b981', stars: '⭐' },
  medium: { color: '#f59e0b', stars: '⭐⭐' },
  hard:   { color: '#ef4444', stars: '⭐⭐⭐' },
  expert: { color: '#7c3aed', stars: '⭐⭐⭐⭐' },
}

function getTier(pct) {
  if (pct >= 90) return 'gold'
  if (pct >= 70) return 'silver'
  if (pct >= 50) return 'bronze'
  return null
}

function fmtTime(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

function timeLeft(endsAt) {
  const diff = new Date(endsAt) - new Date()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function MobileChallenges() {
  const { user, profile } = useUser()
  const haptic = useHaptic()

  const [challenges, setChallenges] = useState([])
  const [myAttempts, setMyAttempts] = useState({})
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Active challenge state
  const [active, setActive] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [phase, setPhase] = useState('list') // list | loading | answering | results
  const [timer, setTimer] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [results, setResults] = useState(null)
  const timerRef = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) load() }, [user])

  useEffect(() => {
    if (timerOn) timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  const load = async () => {
    setLoading(true)
    const [cRes, aRes, wRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('is_active', true).order('starts_at', { ascending: false }),
      supabase.from('challenge_attempts').select('*').eq('user_id', user.id),
      supabase.from('student_wallet').select('*').eq('user_id', user.id).single(),
    ])
    setChallenges(cRes.data || [])
    const map = {}
    ;(aRes.data || []).forEach(a => { map[a.challenge_id] = a })
    setMyAttempts(map)
    setWallet(wRes.data)
    setLoading(false)
  }

  const startChallenge = async (challenge) => {
    if (myAttempts[challenge.id]) { showToast('You already attempted this challenge'); return }
    const now = new Date()
    if (new Date(challenge.starts_at) > now) { showToast('⏳ Not started yet'); return }
    if (new Date(challenge.ends_at) < now) { showToast('❌ Challenge ended'); return }
    haptic.tap()
    setActive(challenge)
    setPhase('loading')
    setQuestions([]); setAnswers({}); setCurrentQ(0)
    setSelected(null); setTimer(0); setResults(null)
    await generateQuestions(challenge)
  }

  const generateQuestions = async (challenge) => {
    const prompt = `Generate exactly ${challenge.total_questions} ${challenge.difficulty} multiple choice questions on: "${challenge.subject || challenge.title}".
Questions must escalate in difficulty. Return ONLY a JSON array:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
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
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      const clean = full.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
      const parsed = JSON.parse(clean.slice(s, e + 1))
      setQuestions(parsed)
      setPhase('answering')
      setTimerOn(true)
    } catch (err) {
      showToast('❌ Could not generate questions')
      setPhase('list'); setActive(null)
    }
  }

  const confirmAnswer = () => {
    if (selected === null) return
    const newAnswers = { ...answers, [currentQ]: selected }
    setAnswers(newAnswers)

    if (answers[currentQ] !== undefined) return

    const isCorrect = selected === questions[currentQ]?.correct
    if (isCorrect) haptic.correct(); else haptic.wrong()

    if (currentQ < questions.length - 1) {
      setTimeout(() => { setCurrentQ(c => c + 1); setSelected(null) }, 800)
    } else {
      setTimeout(() => submitChallenge(newAnswers), 800)
    }
  }

  const submitChallenge = async (finalAnswers) => {
    setTimerOn(false)
    setPhase('calculating')
    let score = 0
    const detailed = questions.map((q, i) => {
      const ua = finalAnswers[i] ?? -1
      const correct = ua === q.correct
      if (correct) score++
      return { ...q, userAnswer: ua, correct }
    })
    const percentage = Math.round((score / questions.length) * 100)
    const tier = getTier(percentage)
    const pointsAwarded = tier ? TIERS[tier].points + (timer < active.time_limit_minutes * 60 * 0.5 ? 50 : 0) : 0

    await supabase.from('challenge_attempts').insert({
      challenge_id: active.id, user_id: user.id,
      answers: finalAnswers, score, total_questions: questions.length,
      percentage, completed: true, passed: percentage >= 70,
      completed_at: new Date().toISOString(), time_taken_seconds: timer,
    })

    if (pointsAwarded > 0) {
      const currentPoints = (wallet?.points || 0) + pointsAwarded
      let moneyAwarded = 0
      let milestoneName = null
      for (const m of POINT_MILESTONES) {
        if ((wallet?.points || 0) < m.points && currentPoints >= m.points) {
          moneyAwarded = m.rands; milestoneName = `${m.points.toLocaleString()} points`; break
        }
      }
      await supabase.from('student_wallet').upsert({
        user_id: user.id,
        points: currentPoints,
        total_points_earned: (wallet?.total_points_earned || 0) + pointsAwarded,
        balance: (wallet?.balance || 0) + moneyAwarded,
        total_earned: (wallet?.total_earned || 0) + moneyAwarded,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (moneyAwarded > 0) {
        await supabase.from('wallet_transactions').insert({ user_id: user.id, type: 'milestone_reward', amount: moneyAwarded, description: `${milestoneName} milestone reached` })
        haptic.celebration()
      }
      setWallet(prev => ({ ...(prev || {}), points: currentPoints, balance: (prev?.balance || 0) + moneyAwarded }))
      await supabase.from('points_transactions').insert({ user_id: user.id, points: pointsAwarded, reason: `${tier ? TIERS[tier].label + ' tier' : 'Participated'} — ${active.title}`, challenge_id: active.id, tier })
    }

    setResults({ score, total: questions.length, percentage, tier, timeTaken: timer, detailed, pointsAwarded })
    setMyAttempts(prev => ({ ...prev, [active.id]: { percentage, score, completed: true } }))
    setPhase('results')
  }

  const now = new Date()
  const activeChallenges = challenges.filter(c => new Date(c.starts_at) <= now && new Date(c.ends_at) > now)
  const upcoming = challenges.filter(c => new Date(c.starts_at) > now)

  // Full-screen challenge mode
  if (phase !== 'list' && active) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
          {phase === 'results' && (
            <button onClick={() => { setPhase('list'); setActive(null); load() }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.title}</div>
            <div style={{ fontSize: 10, color: DIFF[active.difficulty]?.color }}>{DIFF[active.difficulty]?.stars} {active.difficulty}</div>
          </div>
          {phase === 'answering' && (
            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: timer > active.time_limit_minutes * 60 * 0.8 ? '#ef4444' : '#60a5fa', padding: '5px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.08)', flexShrink: 0 }}>
              ⏱ {fmtTime(timer)}
            </div>
          )}
        </div>

        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>🤖</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>Generating {active.total_questions} unique questions...</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 24 }}>{active.subject} · {active.difficulty}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', animation: `bounce 1s ${i * 0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}

        {phase === 'answering' && questions[currentQ] && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {/* Progress */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
              {questions.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < currentQ ? '#10b981' : i === currentQ ? '#2563eb' : 'var(--surface2)' }} />)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, textAlign: 'right' }}>Q {currentQ + 1} of {questions.length}</div>

            <div style={{ padding: '18px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>{questions[currentQ].question}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {questions[currentQ].options?.map((opt, i) => {
                const isSelected = selected === i
                const isAnswered = answers[currentQ] !== undefined
                const isCorrect = questions[currentQ].correct === i
                let bg = 'var(--surface2)', border = 'var(--border)', color = 'var(--text)'
                if (!isAnswered && isSelected) { bg = 'rgba(37,99,235,0.12)'; border = '#2563eb'; color = '#60a5fa' }
                if (isAnswered && isCorrect) { bg = 'rgba(16,185,129,0.1)'; border = '#10b981'; color = '#10b981' }
                if (isAnswered && answers[currentQ] === i && !isCorrect) { bg = 'rgba(239,68,68,0.08)'; border = '#ef4444'; color = '#ef4444' }
                return (
                  <div key={i} onClick={() => answers[currentQ] === undefined && setSelected(i)}
                    style={{ padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${border}`, background: bg, color, cursor: answers[currentQ] !== undefined ? 'default' : 'pointer', fontSize: 14, lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'all 0.15s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                      {isAnswered && isCorrect ? '✓' : isAnswered && answers[currentQ] === i ? '✗' : String.fromCharCode(65 + i)}
                    </div>
                    {opt}
                  </div>
                )
              })}
            </div>

            {answers[currentQ] !== undefined && questions[currentQ].explanation && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: answers[currentQ] === questions[currentQ].correct ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${answers[currentQ] === questions[currentQ].correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
                <strong style={{ color: answers[currentQ] === questions[currentQ].correct ? '#10b981' : '#ef4444' }}>{answers[currentQ] === questions[currentQ].correct ? '✅ Correct! ' : '❌ Incorrect. '}</strong>
                {questions[currentQ].explanation}
              </div>
            )}

            {selected !== null && answers[currentQ] === undefined && (
              <button onClick={confirmAnswer} style={{ width: '100%', padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                {currentQ < questions.length - 1 ? 'Confirm & Next →' : 'Submit Challenge 🏁'}
              </button>
            )}

            {answers[currentQ] !== undefined && currentQ < questions.length - 1 && (
              <button onClick={() => { setCurrentQ(c => c + 1); setSelected(null) }} style={{ width: '100%', padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                Next Question →
              </button>
            )}
          </div>
        )}

        {phase === 'calculating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Calculating results...</div>
          </div>
        )}

        {phase === 'results' && results && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>
                {results.tier === 'gold' ? '🥇' : results.tier === 'silver' ? '🥈' : results.tier === 'bronze' ? '🥉' : '📚'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: results.tier ? TIERS[results.tier].color : '#64748b', marginBottom: 6 }}>
                {results.score}/{results.total} — {results.percentage}%
              </div>
              <div style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 4 }}>
                {results.tier ? `${TIERS[results.tier].emoji} ${TIERS[results.tier].label} tier` : 'Below Bronze — keep practising!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>⏱ {fmtTime(results.timeTaken)}</div>
            </div>

            {results.pointsAwarded > 0 && (
              <div style={{ padding: '16px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>+{results.pointsAwarded} points earned!</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Total: {((wallet?.points || 0)).toLocaleString()} pts</div>
              </div>
            )}

            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${results.percentage}%`, background: results.percentage >= 90 ? '#f59e0b' : results.percentage >= 70 ? '#94a3b8' : results.percentage >= 50 ? '#cd7f32' : '#374151', borderRadius: 4, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginBottom: 20 }}>
              <span>0%</span><span style={{ color: '#cd7f32' }}>50%</span><span style={{ color: '#94a3b8' }}>70%</span><span style={{ color: '#f59e0b' }}>90%</span><span>100%</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Question Review</div>
              {results.detailed.map((q, i) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: q.correct ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${q.correct ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span>{q.correct ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4, marginBottom: q.correct ? 0 : 4 }}>Q{i + 1}: {q.question?.slice(0, 80)}{q.question?.length > 80 ? '...' : ''}</div>
                      {!q.correct && <div style={{ fontSize: 11, color: 'var(--text2)' }}>Correct: <span style={{ color: '#10b981' }}>{q.options?.[q.correct]}</span></div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => { setPhase('list'); setActive(null); load() }}
              style={{ width: '100%', padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Back to Challenges
            </button>
          </div>
        )}

        <style>{`
          @keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-6px);opacity:1}}
        `}</style>
      </div>
    )
  }

  return (
    <MobileLayout title="🏆 Challenges">
      <PullToRefresh onRefresh={load}>
        <div style={{ padding: '12px 16px' }}>

          {/* Wallet strip */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(37,99,235,0.07))', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>💰 Wallet</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>R{(wallet?.balance || 0).toFixed(2)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{(wallet?.points || 0).toLocaleString()} points</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Next milestone</div>
              {(() => {
                const pts = wallet?.points || 0
                const next = POINT_MILESTONES.find(m => m.points > pts)
                return next ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>+R{next.rands} at {next.points.toLocaleString()} pts</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{(next.points - pts).toLocaleString()} pts to go</div>
                  </>
                ) : <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>All milestones reached! 🏆</div>
              })()}
            </div>
          </div>

          {/* Tiers guide */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {Object.entries(TIERS).map(([k, t]) => (
              <div key={k} style={{ padding: '10px 8px', borderRadius: 11, background: 'var(--surface)', border: `1px solid ${t.color}25`, textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{t.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{t.minPct}%+</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>+{t.points} pts</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading challenges...
            </div>
          ) : (
            <>
              {activeChallenges.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>🔥 Active Now</div>
                  {activeChallenges.map(challenge => {
                    const attempted = myAttempts[challenge.id]
                    const d = DIFF[challenge.difficulty] || DIFF.medium
                    const tl = timeLeft(challenge.ends_at)
                    const urgent = new Date(challenge.ends_at) - new Date() < 3600000
                    const tier = attempted ? getTier(attempted.percentage) : null
                    return (
                      <div key={challenge.id} style={{ background: 'var(--surface)', border: `2px solid ${attempted ? 'rgba(16,185,129,0.25)' : urgent ? 'rgba(239,68,68,0.25)' : 'rgba(37,99,235,0.2)'}`, borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{challenge.title}</div>
                              {challenge.subject && <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 4 }}>📚 {challenge.subject}</div>}
                              <div style={{ fontSize: 11, color: d.color }}>{d.stars} {challenge.difficulty}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 11, color: urgent ? '#ef4444' : 'var(--text3)', fontWeight: urgent ? 700 : 400 }}>⏱ {tl}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>❓ {challenge.total_questions} Qs</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
                            {Object.entries(TIERS).map(([k, t]) => (
                              <div key={k} style={{ padding: '6px', borderRadius: 8, background: `${t.color}10`, border: `1px solid ${t.color}20`, textAlign: 'center' }}>
                                <div style={{ fontSize: 12 }}>{t.emoji}</div>
                                <div style={{ fontSize: 9, color: t.color, fontWeight: 700 }}>+{t.points}pts</div>
                              </div>
                            ))}
                          </div>

                          {attempted ? (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: tier ? `${TIERS[tier].color}10` : 'var(--surface2)', border: `1px solid ${tier ? TIERS[tier].color + '25' : 'var(--border)'}`, textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: tier ? TIERS[tier].color : 'var(--text3)' }}>
                                {tier ? TIERS[tier].emoji : '📚'} {attempted.percentage?.toFixed(0)}% — {tier ? TIERS[tier].label : 'Below Bronze'}
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => startChallenge(challenge)}
                              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
                              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                              🚀 Start Challenge
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>⏳ Coming Up</div>
                  {upcoming.map(challenge => {
                    const minsAway = Math.ceil((new Date(challenge.starts_at) - new Date()) / 60000)
                    return (
                      <div key={challenge.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '13px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${DIFF[challenge.difficulty]?.color || '#64748b'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challenge.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{challenge.difficulty} · {challenge.total_questions} questions</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>
                            in {minsAway < 60 ? `${minsAway}m` : `${Math.floor(minsAway / 60)}h`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeChallenges.length === 0 && upcoming.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No active challenges</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>New challenges drop every day at random times. Enable notifications so you never miss one.</div>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-6px);opacity:1}}
      `}</style>
    </MobileLayout>
  )
}