import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import MathRenderer from '../components/MathRenderer'

const MobileChallenges = dynamic(() => import('./mobile/MobileChallenges'), { ssr: false })

export default function ChallengesPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileChallenges />
  return <Challenges />
}

// ── TIER CONFIG ──────────────────────────────────────────
const TIERS = {
  bronze: {
    label: 'Bronze',
    emoji: '🥉',
    minPct: 50,
    maxPct: 69,
    points: 50,
    moneyRands: 0,
    color: '#cd7f32',
    desc: '50–69% accuracy',
  },
  silver: {
    label: 'Silver',
    emoji: '🥈',
    minPct: 70,
    maxPct: 89,
    points: 150,
    moneyRands: 0,
    color: '#94a3b8',
    desc: '70–89% accuracy',
  },
  gold: {
    label: 'Gold',
    emoji: '🥇',
    minPct: 90,
    maxPct: 100,
    points: 500,
    moneyRands: 0,
    color: '#f59e0b',
    desc: '90–100% accuracy',
  },
}

// Points → money conversion milestones
const POINT_MILESTONES = [
  { points: 500,   rands: 5,   label: 'Starter'    },
  { points: 1000,  rands: 12,  label: 'Consistent' },
  { points: 2500,  rands: 35,  label: 'Dedicated'  },
  { points: 5000,  rands: 80,  label: 'Scholar'    },
  { points: 10000, rands: 200, label: 'Champion'   },
]

const MIN_WITHDRAWAL = 50 // R50 minimum


function getTier(pct) {
  if (pct >= 90) return 'gold'
  if (pct >= 70) return 'silver'
  if (pct >= 50) return 'bronze'
  return null
}

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

const DIFF_CFG = {
  easy:   { color: '#10b981', stars: '⭐',      label: 'Easy'   },
  medium: { color: '#f59e0b', stars: '⭐⭐',     label: 'Medium' },
  hard:   { color: '#ef4444', stars: '⭐⭐⭐',   label: 'Hard'   },
  expert: { color: '#7c3aed', stars: '⭐⭐⭐⭐', label: 'Expert' },
}

function fmt(n) { return (n || 0).toFixed(2) }
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  return `${Math.floor(d/3600)}h ago`
}

 function Challenges() {
  
  const { user, profile } = useUser()
  const [challenges, setChallenges] = useState([])
  const [myAttempts, setMyAttempts] = useState({})
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pointsHistory, setPointsHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [toast, setToast] = useState(null)

  // Challenge session
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selectedOption, setSelectedOption] = useState(null)
  const [phase, setPhase] = useState('intro')
  const [results, setResults] = useState(null)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [streamText, setStreamText] = useState('')
  const timerRef = useRef(null)

  const showToast = (msg, dur = 3000) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => { if (user) loadAll() }, [user])

  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000) }
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  const loadAll = async () => {
    setLoading(true)
    const [challengesRes, walletRes, attemptsRes, txRes, pointsRes, lbRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('is_active', true).order('starts_at', { ascending: false }),
      supabase.from('student_wallet').select('*').eq('user_id', user.id).single(),
      supabase.from('challenge_attempts').select('*').eq('user_id', user.id),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('points_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('challenge_leaderboard').select('*').limit(20),
    ])
    setChallenges(challengesRes.data || [])
    setWallet(walletRes.data)
    const map = {}
    ;(attemptsRes.data || []).forEach(a => { map[a.challenge_id] = a })
    setMyAttempts(map)
    setTransactions(txRes.data || [])
    setPointsHistory(pointsRes.data || [])
    setLeaderboard(lbRes.data || [])
    setLoading(false)
  }

  // Award points and potentially convert to money
  const awardPoints = async (challenge, tier, percentage, score, total, timeTaken) => {
    if (!tier) return { pointsAwarded: 0, moneyAwarded: 0, milestone: null }

    const tierConfig = TIERS[tier]
    const pointsAwarded = tierConfig.points

    // Bonus points for speed (finish under 50% of time limit)
    const timeBonus = timeTaken < (challenge.time_limit_minutes * 60 * 0.5) ? 50 : 0
    const totalPointsAwarded = pointsAwarded + timeBonus

    // Save points transaction
    await supabase.from('points_transactions').insert({
      user_id: user.id,
      points: totalPointsAwarded,
      reason: `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier — ${challenge.title}${timeBonus > 0 ? ' (+50 speed bonus)' : ''}`,
      challenge_id: challenge.id,
      tier,
    })

    // Update wallet points
    const currentPoints = (wallet?.points || 0) + totalPointsAwarded
    const totalPointsEarned = (wallet?.total_points_earned || 0) + totalPointsAwarded

    // Check if a milestone was reached
    let moneyAwarded = 0
    let milestone = null

    // Find the highest milestone that was just crossed
    for (const m of POINT_MILESTONES.reverse()) {
      const prevPoints = wallet?.points || 0
      if (prevPoints < m.points && currentPoints >= m.points) {
        moneyAwarded = m.rands
        milestone = m
        break
      }
    }
    POINT_MILESTONES.reverse() // restore order

    const newBalance = (wallet?.balance || 0) + moneyAwarded
    const newTotalEarned = (wallet?.total_earned || 0) + moneyAwarded

    await supabase.from('student_wallet').upsert({
      user_id: user.id,
      points: currentPoints,
      total_points_earned: totalPointsEarned,
      balance: newBalance,
      total_earned: newTotalEarned,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (moneyAwarded > 0) {
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'milestone_reward',
        amount: moneyAwarded,
        description: `🏆 ${milestone.label} milestone — ${milestone.points.toLocaleString()} points reached`,
        challenge_id: challenge.id,
      })
    }

    setWallet(prev => ({
      ...(prev || {}),
      points: currentPoints,
      total_points_earned: totalPointsEarned,
      balance: newBalance,
      total_earned: newTotalEarned,
    }))

    return { pointsAwarded: totalPointsAwarded, moneyAwarded, milestone }
  }

  const startChallenge = async (challenge) => {
    if (!user) return
    if (myAttempts[challenge.id]) { showToast('❌ You already attempted this challenge'); return }
    const now = new Date()
    if (new Date(challenge.starts_at) > now) { showToast('⏳ This challenge hasn\'t started yet'); return }
    if (new Date(challenge.ends_at) < now) { showToast('❌ This challenge has ended'); return }

    setActiveChallenge(challenge)
    setPhase('loading_q')
    setQuestions([]); setAnswers({}); setCurrentQ(0)
    setSelectedOption(null); setTimer(0); setResults(null)
    await generateQuestions(challenge)
  }

  const generateQuestions = async (challenge) => {
    const prompt = `Generate exactly ${challenge.total_questions} ${challenge.difficulty} multiple choice questions on: "${challenge.subject || challenge.title}".

Questions must escalate in difficulty — start ${challenge.difficulty === 'easy' ? 'basic' : 'accessible'} and end at advanced ${challenge.difficulty} level.

Return ONLY JSON array:
[
  {
    "question": "Question text with proper mathematical notation",
    "options": ["A) first", "B) second", "C) third", "D) fourth"],
    "correct": 0,
    "explanation": "Specific explanation of why the correct answer is right",
    "marks": 1
  }
]

Requirements:
- All 4 options must be plausible — no trick answers
- Include mix of: definitions, calculations, application, analysis
- No repeated concepts across questions
- For quantitative questions: include proper units and significant figures
- correct = 0-based index of correct option`

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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setStreamText(full) } } catch {}
        }
      }
      const clean = full.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
      const parsed = JSON.parse(clean.slice(s, e + 1))
      setQuestions(parsed); setStreamText('')
      setPhase('answering'); setTimerRunning(true)
    } catch (err) {
      showToast('❌ Could not generate questions: ' + err.message)
      setPhase('intro'); setActiveChallenge(null)
    }
  }

  const selectAnswer = (idx) => {
    if (answers[currentQ] !== undefined) return
    setSelectedOption(idx)
  }

  const confirmAnswer = () => {
    if (selectedOption === null) return
    const newAnswers = { ...answers, [currentQ]: selectedOption }
    setAnswers(newAnswers)
    if (currentQ < questions.length - 1) {
      setTimeout(() => { setCurrentQ(c => c + 1); setSelectedOption(null) }, 900)
    } else {
      setTimeout(() => submitChallenge(newAnswers), 900)
    }
  }

  const submitChallenge = async (finalAnswers) => {
    setTimerRunning(false)
    setPhase('calculating')

    let score = 0
    const detailed = questions.map((q, i) => {
      const userAns = finalAnswers[i] ?? -1
      const correct = userAns === q.correct
      if (correct) score++
      return { ...q, userAnswer: userAns, correct }
    })

    const percentage = Math.round((score / questions.length) * 100)
    const tier = getTier(percentage)
    const timeTaken = timer

    // Save attempt
    const { data: attempt } = await supabase.from('challenge_attempts').insert({
      challenge_id: activeChallenge.id,
      user_id: user.id,
      answers: finalAnswers,
      score, total_questions: questions.length,
      percentage, completed: true,
      passed: percentage >= 70,
      completed_at: new Date().toISOString(),
      time_taken_seconds: timeTaken,
    }).select().single()

    // Award points and check milestones
    const { pointsAwarded, moneyAwarded, milestone } = await awardPoints(
      activeChallenge, tier, percentage, score, questions.length, timeTaken
    )

    setResults({ score, total: questions.length, percentage, tier, timeTaken, detailed, pointsAwarded, moneyAwarded, milestone })
    if (attempt) setMyAttempts(prev => ({ ...prev, [activeChallenge.id]: attempt }))
    setPhase('results')
  }

  const requestWithdrawal = () => {
    const balance = wallet?.balance || 0
    if (balance < MIN_WITHDRAWAL) {
      showToast(`❌ Minimum withdrawal is R${MIN_WITHDRAWAL}. You have R${fmt(balance)}.`)
      return
    }
    showToast('📧 Withdrawal request noted! Email rewards@edulinkglobal.com with your student ID and bank details. Processed within 3 business days.')
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const now = new Date()
  const active = challenges.filter(c => new Date(c.starts_at) <= now && new Date(c.ends_at) > now)
  const upcoming = challenges.filter(c => new Date(c.starts_at) > now)
  const past = challenges.filter(c => new Date(c.ends_at) <= now)

  // Points progress to next milestone
  const currentPoints = wallet?.points || 0
  const nextMilestone = POINT_MILESTONES.find(m => m.points > currentPoints)
  const prevMilestone = [...POINT_MILESTONES].reverse().find(m => m.points <= currentPoints)
  const progressPct = nextMilestone
    ? ((currentPoints - (prevMilestone?.points || 0)) / (nextMilestone.points - (prevMilestone?.points || 0))) * 100
    : 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '90px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 18 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>🏆 Daily Challenges</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.7, maxWidth: 520 }}>
              Fresh challenges drop every day at random times. Earn points by scoring well — points convert to real money at milestones. Minimum R{MIN_WITHDRAWAL} to withdraw.
            </p>
          </div>

          {/* Wallet summary */}
          <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(37,99,235,0.07))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '16px 22px', minWidth: 200 }}>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>💰 Wallet</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', lineHeight: 1, marginBottom: 4 }}>
              R{fmt(wallet?.balance || 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
              {(wallet?.points || 0).toLocaleString()} pts · R{fmt(wallet?.total_earned || 0)} earned
            </div>
            <button
              onClick={requestWithdrawal}
              disabled={(wallet?.balance || 0) < MIN_WITHDRAWAL}
              style={{ width: '100%', padding: '7px', borderRadius: 9, background: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.06)', color: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 12, cursor: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'pointer' : 'not-allowed' }}>
              {(wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'Withdraw →' : `Need R${fmt(MIN_WITHDRAWAL - (wallet?.balance || 0))} more`}
            </button>
          </div>
        </div>

        {/* Points progress bar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
              ⭐ Points Progress — {currentPoints.toLocaleString()} pts
            </div>
            {nextMilestone && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Next reward: <strong style={{ color: '#10b981' }}>+R{nextMilestone.rands}</strong> at {nextMilestone.points.toLocaleString()} pts
                ({(nextMilestone.points - currentPoints).toLocaleString()} pts to go)
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 10, borderRadius: 5, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.min(100, progressPct)}%`, background: 'linear-gradient(90deg,#f59e0b,#10b981)', borderRadius: 5, transition: 'width 0.6s ease' }} />
          </div>

          {/* Milestone markers */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {POINT_MILESTONES.map(m => {
              const reached = currentPoints >= m.points
              return (
                <div key={m.points} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: reached ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', border: `1px solid ${reached ? 'rgba(16,185,129,0.3)' : 'var(--border)'}` }}>
                  <span style={{ fontSize: 12 }}>{reached ? '✅' : '🔒'}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: reached ? '#10b981' : 'var(--text3)' }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{m.points.toLocaleString()} pts → +R{m.rands}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tier explanation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {Object.entries(TIERS).map(([key, tier]) => (
            <div key={key} style={{ background: 'var(--surface)', border: `1px solid ${tier.color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{tier.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: tier.color, marginBottom: 3 }}>{tier.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>{tier.desc}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>+{tier.points} pts</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>per challenge</div>
            </div>
          ))}
        </div>

        {/* Challenge modal */}
        {activeChallenge && phase !== 'intro' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, maxWidth: 700, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>

              {/* Loading questions */}
              {phase === 'loading_q' && (
                <div style={{ padding: '60px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 18 }}>🤖</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Generating {activeChallenge.total_questions} unique questions...</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>{activeChallenge.subject || activeChallenge.title} · {DIFF_CFG[activeChallenge.difficulty]?.label}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', animation: `bounce 1s ${i*0.2}s ease-in-out infinite` }} />)}
                  </div>
                </div>
              )}

              {/* Question */}
              {phase === 'answering' && questions[currentQ] && (
                <div style={{ padding: '26px 30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{activeChallenge.title}</div>
                      <div style={{ fontSize: 11, color: DIFF_CFG[activeChallenge.difficulty]?.color }}>{DIFF_CFG[activeChallenge.difficulty]?.stars} {DIFF_CFG[activeChallenge.difficulty]?.label}</div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: timer > activeChallenge.time_limit_minutes * 60 * 0.8 ? '#ef4444' : '#60a5fa', padding: '6px 14px', borderRadius: 9, background: 'rgba(37,99,235,0.1)' }}>
                      ⏱ {fmtTime(timer)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 3, marginBottom: 22 }}>
                    {questions.map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < currentQ ? '#10b981' : i === currentQ ? '#2563eb' : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>

                  <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 20, marginBottom: 18 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>Q {currentQ + 1} of {questions.length}</div>
                    <MathRenderer content={questions[currentQ].question} style={{ fontSize: 16, color: '#f1f5f9', lineHeight: 1.7 }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                    {questions[currentQ].options?.map((opt, i) => {
                      const answered = answers[currentQ] !== undefined
                      const isSelected = selectedOption === i
                      const isAnswered = answers[currentQ] === i
                      const isCorrect = questions[currentQ].correct === i
                      let bg = 'rgba(255,255,255,0.03)', border = 'rgba(255,255,255,0.07)', color = '#e2e8f0'
                      if (!answered && isSelected) { bg = 'rgba(37,99,235,0.15)'; border = '#2563eb'; color = '#60a5fa' }
                      if (answered && isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = '#10b981'; color = '#10b981' }
                      if (answered && isAnswered && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; border = '#ef4444'; color = '#ef4444' }
                      return (
                        <div key={i} onClick={() => !answered && selectAnswer(i)}
                          style={{ padding: '13px 18px', borderRadius: 11, border: `1.5px solid ${border}`, background: bg, color, cursor: answered ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {answered && isCorrect ? '✓' : answered && isAnswered ? '✗' : String.fromCharCode(65+i)}
                          </div>
                          <MathRenderer content={opt} style={{ fontSize: 14, lineHeight: 1.6, flex: 1 }} />
                        </div>
                      )
                    })}
                  </div>

                  {answers[currentQ] !== undefined && (
                    <div style={{ padding: '11px 16px', borderRadius: 10, background: answers[currentQ] === questions[currentQ].correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${answers[currentQ] === questions[currentQ].correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, marginBottom: 16, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: answers[currentQ] === questions[currentQ].correct ? '#10b981' : '#ef4444' }}>
                        {answers[currentQ] === questions[currentQ].correct ? '✅ Correct! ' : '❌ Incorrect. '}
                      </strong>
                      {questions[currentQ].explanation}
                    </div>
                  )}

                  {selectedOption !== null && answers[currentQ] === undefined && (
                    <button onClick={confirmAnswer} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                      {currentQ < questions.length - 1 ? 'Confirm & Next →' : 'Submit Challenge 🏁'}
                    </button>
                  )}

                  {answers[currentQ] !== undefined && currentQ < questions.length - 1 && (
                    <button onClick={() => { setCurrentQ(c => c+1); setSelectedOption(null) }} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                      Next Question →
                    </button>
                  )}
                </div>
              )}

              {/* Calculating */}
              {phase === 'calculating' && (
                <div style={{ padding: '70px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 18 }}>📊</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Calculating results...</div>
                </div>
              )}

              {/* Results */}
              {phase === 'results' && results && (
                <div style={{ padding: '28px 32px' }}>
                  {/* Score */}
                  <div style={{ textAlign: 'center', marginBottom: 26 }}>
                    <div style={{ fontSize: 60, marginBottom: 10 }}>
                      {results.tier === 'gold' ? '🥇' : results.tier === 'silver' ? '🥈' : results.tier === 'bronze' ? '🥉' : '📚'}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: results.tier ? TIERS[results.tier].color : '#64748b', marginBottom: 6 }}>
                      {results.score}/{results.total} — {results.percentage}%
                    </div>
                    <div style={{ fontSize: 16, color: '#f1f5f9', marginBottom: 4 }}>
                      {results.tier ? `${TIERS[results.tier].emoji} ${TIERS[results.tier].label} tier` : 'Below Bronze — keep practising!'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Time: {fmtTime(results.timeTaken)}</div>
                  </div>

                  {/* Points awarded */}
                  {results.pointsAwarded > 0 && (
                    <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>+{results.pointsAwarded} points earned</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        Total: {((wallet?.points || 0)).toLocaleString()} pts
                      </div>
                    </div>
                  )}

                  {/* Milestone reward */}
                  {results.moneyAwarded > 0 && results.milestone && (
                    <div style={{ padding: '18px 22px', borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)', marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>Milestone reached — {results.milestone.label}!</div>
                      <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
                        You hit {results.milestone.points.toLocaleString()} points — R{results.moneyAwarded} added to your wallet!
                      </div>
                    </div>
                  )}

                  {/* Score bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${results.percentage}%`, background: results.percentage >= 90 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : results.percentage >= 70 ? 'linear-gradient(90deg,#94a3b8,#cbd5e1)' : results.percentage >= 50 ? 'linear-gradient(90deg,#cd7f32,#d4915a)' : '#374151', borderRadius: 4, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                      <span>0%</span>
                      <span style={{ color: '#cd7f32' }}>50% Bronze</span>
                      <span style={{ color: '#94a3b8' }}>70% Silver</span>
                      <span style={{ color: '#f59e0b' }}>90% Gold</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Q review */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Question Review</div>
                    {results.detailed.map((q, i) => (
                      <div key={i} style={{ padding: '11px 15px', borderRadius: 10, background: q.correct ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${q.correct ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`, marginBottom: 7 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ flexShrink: 0 }}>{q.correct ? '✅' : '❌'}</span>
                          <div>
                            <div style={{ fontSize: 12, color: '#f1f5f9', marginBottom: q.correct ? 0 : 4, lineHeight: 1.4 }}>Q{i+1}: {q.question?.slice(0, 90)}{q.question?.length > 90 ? '...' : ''}</div>
                            {!q.correct && (
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Your answer: <span style={{ color: '#ef4444' }}>{q.options?.[q.userAnswer] || 'Skipped'}</span> · Correct: <span style={{ color: '#10b981' }}>{q.options?.[q.correct]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { setActiveChallenge(null); setPhase('intro'); loadAll() }}
                    style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Back to Challenges
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[
            { id: 'active',      label: `🔥 Active (${active.length})` },
            { id: 'upcoming',    label: `⏳ Upcoming (${upcoming.length})` },
            { id: 'past',        label: '📋 Past' },
            { id: 'leaderboard', label: '🏅 Leaderboard' },
            { id: 'wallet',      label: '💰 Wallet' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === tab.id ? '#60a5fa' : 'var(--text3)', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}` }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            Loading...
          </div>
        ) : (
          <>
            {/* Active */}
            {activeTab === 'active' && (
              active.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No active challenges right now</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>Challenges drop at random times every day. Check back soon!</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
                  {active.map(challenge => {
                    const attempted = myAttempts[challenge.id]
                    const d = DIFF_CFG[challenge.difficulty] || DIFF_CFG.medium
                    const tl = timeLeft(challenge.ends_at)
                    const urgent = new Date(challenge.ends_at) - new Date() < 3600000
                    return (
                      <div key={challenge.id} style={{ background: 'var(--surface)', border: `2px solid ${attempted ? 'rgba(16,185,129,0.3)' : urgent ? 'rgba(239,68,68,0.3)' : 'rgba(37,99,235,0.2)'}`, borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: `linear-gradient(135deg,${d.color}15,transparent)`, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 11, color: d.color, fontWeight: 700 }}>{d.stars} {d.label}</div>
                              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Complete for points + money milestones</div>
                            </div>
                            <div style={{ fontSize: 11, color: urgent ? '#ef4444' : 'var(--text3)', fontWeight: urgent ? 700 : 400, textAlign: 'right' }}>
                              ⏱ {tl}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '18px' }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>{challenge.title}</div>
                          {challenge.subject && <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 8 }}>📚 {challenge.subject}</div>}
                          {challenge.description && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>{challenge.description}</div>}

                          {/* Tier rewards for this challenge */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginBottom: 14 }}>
                            {Object.entries(TIERS).map(([k, tier]) => (
                              <div key={k} style={{ padding: '6px', borderRadius: 8, background: `${tier.color}10`, border: `1px solid ${tier.color}25`, textAlign: 'center' }}>
                                <div style={{ fontSize: 14 }}>{tier.emoji}</div>
                                <div style={{ fontSize: 9, color: tier.color, fontWeight: 700 }}>{tier.points}pts</div>
                                <div style={{ fontSize: 8, color: 'var(--text3)' }}>{tier.desc.split('–')[0].trim()}%+</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                            <span>❓ {challenge.total_questions} Qs</span>
                            <span>⏱ {challenge.time_limit_minutes}min</span>
                          </div>

                          {attempted ? (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: attempted.passed ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${attempted.passed ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, textAlign: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: attempted.passed ? '#10b981' : '#f59e0b' }}>
                                {getTier(attempted.percentage) ? TIERS[getTier(attempted.percentage)].emoji : '📚'} {attempted.percentage?.toFixed(0)}% — {getTier(attempted.percentage) ? TIERS[getTier(attempted.percentage)].label : 'Below Bronze'}
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => startChallenge(challenge)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                              🚀 Start Challenge
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* Upcoming */}
            {activeTab === 'upcoming' && (
              upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontSize: 15, color: 'var(--text2)' }}>No upcoming challenges scheduled yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcoming.map(challenge => {
                    const d = DIFF_CFG[challenge.difficulty] || DIFF_CFG.medium
                    const minsAway = Math.ceil((new Date(challenge.starts_at) - new Date()) / 60000)
                    return (
                      <div key={challenge.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 11, background: `${d.color}12`, border: `1px solid ${d.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{challenge.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{challenge.subject && `${challenge.subject} · `}{d.stars} {d.label} · {challenge.total_questions} questions</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                            In {minsAway < 60 ? `${minsAway}m` : `${Math.floor(minsAway/60)}h ${minsAway%60}m`}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(challenge.starts_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* Past */}
            {activeTab === 'past' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {past.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>No past challenges yet</div>
                : past.map(challenge => {
                  const attempt = myAttempts[challenge.id]
                  const tier = attempt ? getTier(attempt.percentage) : null
                  return (
                    <div key={challenge.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', opacity: 0.75 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{challenge.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{DIFF_CFG[challenge.difficulty]?.label} · Ended {timeAgo(challenge.ends_at)}</div>
                      </div>
                      {attempt ? (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: tier ? TIERS[tier].color : '#64748b' }}>
                            {tier ? TIERS[tier].emoji : '📚'} {attempt.percentage?.toFixed(0)}%
                          </div>
                          {tier && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{TIERS[tier].points} pts</div>}
                        </div>
                      ) : <div style={{ fontSize: 12, color: 'var(--text3)' }}>Not attempted</div>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>🏅 Points Leaderboard</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>All EduLink students</div>
                </div>
                {leaderboard.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No leaderboard data yet — be the first to attempt a challenge!</div>
                ) : leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === user?.id
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <div key={entry.user_id} style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: isMe ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                      <div style={{ width: 32, textAlign: 'center', fontSize: medal ? 18 : 13, fontWeight: 800, color: i < 3 ? ['#f59e0b','#94a3b8','#cd7f32'][i] : 'var(--text3)', flexShrink: 0 }}>
                        {medal || `#${i+1}`}
                      </div>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                        {entry.avatar_url ? <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (entry.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? '#60a5fa' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name || 'Student'}{isMe ? ' (You)' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {entry.challenges_passed || 0} challenges passed · Avg {entry.avg_score || 0}%
                          {entry.institution && ` · ${entry.institution}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#f59e0b' }}>{(entry.points || 0).toLocaleString()} pts</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>R{fmt(entry.total_earned)} earned</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Wallet */}
            {activeTab === 'wallet' && (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
                  {[
                    { label: 'Current Balance', value: `R${fmt(wallet?.balance || 0)}`, color: '#10b981', icon: '💰', sub: `Min withdrawal: R${MIN_WITHDRAWAL}` },
                    { label: 'Total Points', value: (wallet?.points || 0).toLocaleString(), color: '#f59e0b', icon: '⭐', sub: `${(wallet?.total_points_earned || 0).toLocaleString()} earned` },
                    { label: 'Total Earned', value: `R${fmt(wallet?.total_earned || 0)}`, color: '#2563eb', icon: '📈', sub: 'From milestones' },
                    { label: 'Challenges', value: Object.keys(myAttempts).length, color: '#7c3aed', icon: '🏆', sub: `${Object.values(myAttempts).filter(a => a.passed).length} passed` },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Points history */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>⭐ Points History</div>
                  {pointsHistory.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No points yet — attempt a challenge to start earning!</div>
                  ) : pointsHistory.map(pt => (
                    <div key={pt.id} style={{ padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{pt.reason}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(pt.created_at)}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>+{pt.points} pts</div>
                    </div>
                  ))}
                </div>

                {/* Money transactions */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>💸 Money Transactions</div>
                  {transactions.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No money transactions yet. Reach a points milestone to earn!</div>
                  ) : transactions.map(tx => (
                    <div key={tx.id} style={{ padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>{tx.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(tx.created_at)}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: tx.type === 'withdrawal' ? '#ef4444' : '#10b981' }}>
                        {tx.type === 'withdrawal' ? '-' : '+'}R{Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Withdraw section */}
                <div style={{ padding: '20px', borderRadius: 14, background: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'rgba(16,185,129,0.06)' : 'var(--surface)', border: `1px solid ${(wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'rgba(16,185,129,0.25)' : 'var(--border)'}` }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 6 }}>
                    {(wallet?.balance || 0) >= MIN_WITHDRAWAL ? '💸 Ready to withdraw!' : `🔒 Withdrawal locked`}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
                    {(wallet?.balance || 0) >= MIN_WITHDRAWAL
                      ? `You have R${fmt(wallet?.balance)} available. Contact us to withdraw.`
                      : `You need R${fmt(MIN_WITHDRAWAL - (wallet?.balance || 0))} more to reach the R${MIN_WITHDRAWAL} minimum. Keep earning points from challenges!`
                    }
                  </div>
                  <button onClick={requestWithdrawal} disabled={(wallet?.balance || 0) < MIN_WITHDRAWAL}
                    style={{ padding: '11px 24px', borderRadius: 10, background: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', color: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: (wallet?.balance || 0) >= MIN_WITHDRAWAL ? 'pointer' : 'not-allowed' }}>
                    Request Withdrawal →
                  </button>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                    Send your student ID and banking details to <a href="mailto:rewards@edulinkglobal.com" style={{ color: '#60a5fa' }}>rewards@edulinkglobal.com</a>. Processed within 3 business days.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform:translateY(0);opacity:.3 } 50% { transform:translateY(-6px);opacity:1 } }
      `}</style>
    </div>
  )
}