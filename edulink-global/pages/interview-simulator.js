import { useState, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import MathRenderer from '../components/MathRenderer'

const INTERVIEW_TYPES = [
  { id: 'technical', label: '🔧 Technical', desc: 'Engineering, coding, problem solving' },
  { id: 'hr', label: '👥 HR / Behavioural', desc: 'Soft skills, teamwork, culture fit' },
  { id: 'case', label: '📊 Case Study', desc: 'Business, consulting, analysis' },
  { id: 'academic', label: '🎓 Academic / Research', desc: 'Masters, PhD, research positions' },
  { id: 'graduate', label: '🚀 Graduate Programme', desc: 'Trainee, graduate scheme interviews' },
]

export default function InterviewSimulator() {
  const { user, profile } = useUser()

  const [step, setStep] = useState('setup') // 'setup' | 'generating' | 'interview' | 'feedback' | 'done'
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [interviewType, setInterviewType] = useState('technical')
  const [numQuestions, setNumQuestions] = useState(5)

  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [feedbacks, setFeedbacks] = useState([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')

  const [toast, setToast] = useState(null)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)
  const textareaRef = useRef(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const startTimer = () => {
    setTimer(0)
    setTimerRunning(true)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  const stopTimer = () => {
    setTimerRunning(false)
    clearInterval(timerRef.current)
  }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const generateQuestions = async () => {
    if (!jobTitle.trim()) { showToast('⚠️ Enter the job title or role you are applying for'); return }
    setGenerating(true); setStep('generating'); setStreamText('')

    const prompt = `Generate exactly ${numQuestions} interview questions for a ${profile?.field || 'university graduate'} student applying for: "${jobTitle}"${company ? ` at ${company}` : ''}.

Interview type: ${INTERVIEW_TYPES.find(t => t.id === interviewType)?.label}
Student background: ${profile?.field || 'Engineering'}, ${profile?.year_of_study || ''} at ${profile?.institution || 'university'}

Return JSON ONLY — an array of question objects:
[
  {
    "question": "Full interview question text",
    "type": "technical|behavioural|case|situational",
    "difficulty": "easy|medium|hard",
    "tip": "One specific tip for answering this question well",
    "time_suggested": 120
  }
]

Make questions realistic — the kind an actual interviewer would ask. Mix question types. For technical roles include actual technical questions (not just soft skills).`

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
      setQuestions(parsed)
      setAnswers(new Array(parsed.length).fill(''))
      setFeedbacks(new Array(parsed.length).fill(null))
      setCurrentQ(0); setCurrentAnswer('')
      setStep('interview')
      startTimer()
    } catch (err) {
      showToast('❌ Could not generate questions: ' + err.message)
      setStep('setup')
    }
    setGenerating(false)
  }

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) { showToast('⚠️ Write your answer before submitting'); return }
    stopTimer()
    setLoadingFeedback(true)

    const newAnswers = [...answers]
    newAnswers[currentQ] = currentAnswer
    setAnswers(newAnswers)

    const q = questions[currentQ]
    const prompt = `You are an expert interview coach. A student is interviewing for: "${jobTitle}"${company ? ` at ${company}` : ''}.

Question: "${q.question}"
Question type: ${q.type}
Student's answer: "${currentAnswer}"
Time taken: ${formatTime(timer)}

Give detailed, constructive feedback. Return JSON ONLY:
{
  "score": 7,
  "score_max": 10,
  "rating": "Good",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "ideal_answer_points": ["key point 1", "key point 2", "key point 3"],
  "model_answer": "A concise model answer (3-5 sentences)",
  "tips_for_delivery": "One specific tip about how to deliver this type of answer"
}`

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
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
      const fb = JSON.parse(clean.slice(s, e + 1))
      const newFeedbacks = [...feedbacks]
      newFeedbacks[currentQ] = { ...fb, timeTaken: timer }
      setFeedbacks(newFeedbacks)
      setStep('feedback')
    } catch (err) {
      showToast('❌ Could not get feedback: ' + err.message)
    }
    setLoadingFeedback(false)
  }

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setCurrentAnswer('')
      setStep('interview')
      startTimer()
    } else {
      setStep('done')
    }
  }

  const avgScore = feedbacks.filter(Boolean).length > 0
    ? Math.round(feedbacks.filter(Boolean).reduce((s, f) => s + f.score, 0) / feedbacks.filter(Boolean).length)
    : 0

  const scoreColor = (score) => score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '90px 16px 80px' }}>

        {/* ── SETUP ─────────────────────────────────────────── */}
        {step === 'setup' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🎙️ Interview Simulator</h1>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>Practice real interview questions and get instant AI feedback on every answer. Builds confidence before the actual interview.</p>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Job Title / Role *</label>
                  <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Junior Electrical Engineer" style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Company (optional)</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Eskom, Deloitte" style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 10 }}>Interview Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                  {INTERVIEW_TYPES.map(t => (
                    <button key={t.id} onClick={() => setInterviewType(t.id)} style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${interviewType === t.id ? '#2563eb' : 'var(--border)'}`, background: interviewType === t.id ? 'rgba(37,99,235,0.1)' : 'var(--surface2)', cursor: 'pointer', transition: 'all 0.1s' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: interviewType === t.id ? '#60a5fa' : '#f1f5f9', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Number of Questions: {numQuestions}</label>
                <input type="range" min={3} max={10} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} style={{ width: '100%', accentColor: '#2563eb' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  <span>3 (quick)</span><span>10 (full mock)</span>
                </div>
              </div>

              <button onClick={generateQuestions} disabled={!jobTitle.trim()} style={{ width: '100%', padding: '13px', borderRadius: 11, background: jobTitle.trim() ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: jobTitle.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}>
                🎙️ Start Interview Practice
              </button>
            </div>

            {/* Tips */}
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>💡 Tips for best results</div>
              {['Speak out loud as you type — it trains verbal delivery too', 'Take your time — real interviews allow thinking time, usually 30-60 seconds', 'Use the STAR method for behavioural questions (Situation, Task, Action, Result)', 'Be specific — give real examples from your projects, coursework, or work experience', 'After each question, read the model answer carefully and note what you missed'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GENERATING ────────────────────────────────────── */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 50, height: 50, border: '4px solid rgba(37,99,235,0.2)', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Preparing your interview...</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Generating {numQuestions} realistic questions for {jobTitle}</div>
            {streamText && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'left', fontSize: 12, color: '#64748b', maxHeight: 120, overflow: 'hidden' }}>
                {streamText.slice(0, 200)}...
              </div>
            )}
          </div>
        )}

        {/* ── INTERVIEW ─────────────────────────────────────── */}
        {step === 'interview' && questions[currentQ] && (
          <div>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Question <strong style={{ color: '#f1f5f9' }}>{currentQ + 1}</strong> of {questions.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: timer > (questions[currentQ]?.time_suggested || 120) ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)', border: `1px solid ${timer > (questions[currentQ]?.time_suggested || 120) ? 'rgba(239,68,68,0.3)' : 'rgba(37,99,235,0.3)'}`, fontSize: 13, fontWeight: 700, color: timer > (questions[currentQ]?.time_suggested || 120) ? '#ef4444' : '#60a5fa', fontFamily: 'monospace' }}>
                  ⏱ {formatTime(timer)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < currentQ ? '#10b981' : i === currentQ ? '#2563eb' : 'var(--border)', transition: 'background 0.2s' }} />
              ))}
            </div>

            {/* Question card */}
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>🎙️</div>
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', fontWeight: 700 }}>{questions[currentQ].type}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: questions[currentQ].difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : questions[currentQ].difficulty === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: questions[currentQ].difficulty === 'hard' ? '#ef4444' : questions[currentQ].difficulty === 'medium' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {questions[currentQ].difficulty}
                    </span>
                    {questions[currentQ].time_suggested && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontWeight: 700 }}>
                        ⏱ {Math.ceil(questions[currentQ].time_suggested / 60)} min suggested
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 17, color: '#f1f5f9', lineHeight: 1.6, fontWeight: 600 }}>
                    {questions[currentQ].question}
                  </div>
                </div>
              </div>

              {questions[currentQ].tip && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#fde68a' }}>
                  💡 <strong>Tip:</strong> {questions[currentQ].tip}
                </div>
              )}
            </div>

            {/* Answer area */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Your Answer</label>
              <textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here as if you were speaking in the interview. Take your time — quality matters more than speed..."
                rows={7}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.25)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(37,99,235,0.25)'}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>{currentAnswer.split(/\s+/).filter(Boolean).length} words</span>
                <span>Aim for 100-250 words for most questions</span>
              </div>
            </div>

            <button onClick={submitAnswer} disabled={!currentAnswer.trim() || loadingFeedback} style={{ width: '100%', padding: '13px', borderRadius: 11, background: currentAnswer.trim() && !loadingFeedback ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: currentAnswer.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              {loadingFeedback ? '⏳ Getting AI feedback...' : '✅ Submit Answer & Get Feedback'}
            </button>
          </div>
        )}

        {/* ── FEEDBACK ──────────────────────────────────────── */}
        {step === 'feedback' && feedbacks[currentQ] && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Question {currentQ + 1} of {questions.length} — Feedback</div>
              <div style={{ fontSize: 15, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>"{questions[currentQ]?.question}"</div>
            </div>

            {/* Score card */}
            <div style={{ background: 'var(--surface)', border: `2px solid ${scoreColor(feedbacks[currentQ].score)}30`, borderRadius: 16, padding: 24, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: scoreColor(feedbacks[currentQ].score), marginBottom: 6, lineHeight: 1 }}>
                {feedbacks[currentQ].score}/{feedbacks[currentQ].score_max}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(feedbacks[currentQ].score), marginBottom: 4 }}>{feedbacks[currentQ].rating}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Time taken: {formatTime(feedbacks[currentQ].timeTaken || 0)}</div>
            </div>

            {/* Strengths */}
            {feedbacks[currentQ].strengths?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: 18, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>✅ Strengths</div>
                {feedbacks[currentQ].strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                    <span style={{ color: '#10b981', flexShrink: 0 }}>•</span><span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {feedbacks[currentQ].improvements?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 18, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠️ Areas to Improve</div>
                {feedbacks[currentQ].improvements.map((imp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                    <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span><span>{imp}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Model answer */}
            {feedbacks[currentQ].model_answer && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 18, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>💡 Model Answer</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' }}>"{feedbacks[currentQ].model_answer}"</div>
                {feedbacks[currentQ].ideal_answer_points?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>KEY POINTS TO COVER:</div>
                    {feedbacks[currentQ].ideal_answer_points.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                        <span style={{ color: '#60a5fa', flexShrink: 0 }}>{i + 1}.</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delivery tip */}
            {feedbacks[currentQ].tips_for_delivery && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 20, fontSize: 13, color: '#c4b5fd', lineHeight: 1.6 }}>
                🎙️ <strong style={{ color: '#a78bfa' }}>Delivery tip:</strong> {feedbacks[currentQ].tips_for_delivery}
              </div>
            )}

            <button onClick={nextQuestion} style={{ width: '100%', padding: '13px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              {currentQ < questions.length - 1 ? `Next Question (${currentQ + 2}/${questions.length}) →` : '🏁 See Final Results'}
            </button>
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────────── */}
        {step === 'done' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32, padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{avgScore >= 8 ? '🏆' : avgScore >= 6 ? '🎉' : '📚'}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor(avgScore), marginBottom: 6 }}>{avgScore}/10 average</div>
              <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 4 }}>
                {avgScore >= 8 ? 'Excellent! You are well prepared.' : avgScore >= 6 ? 'Good performance — a few areas to polish.' : 'Keep practising — you will get there!'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Completed {feedbacks.filter(Boolean).length} of {questions.length} questions</div>
            </div>

            {/* Question by question review */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>📋 Question Review</div>
              {questions.map((q, i) => {
                const fb = feedbacks[i]
                return (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Q{i + 1} · {q.type}</div>
                        <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.5 }}>{q.question}</div>
                      </div>
                      {fb && (
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: scoreColor(fb.score) }}>{fb.score}/10</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{fb.rating}</div>
                        </div>
                      )}
                      {!fb && <div style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>Skipped</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setStep('setup'); setQuestions([]); setAnswers([]); setFeedbacks([]); setCurrentQ(0); setCurrentAnswer('') }} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🔄 New Interview
              </button>
              <button onClick={() => { setStep('interview'); setCurrentQ(0); setCurrentAnswer(''); startTimer() }} style={{ flex: 2, padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🔁 Retry Same Questions
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}