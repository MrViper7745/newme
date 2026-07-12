import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'

const ROLES = [
  { id: 'software_engineer', label: 'Software Engineer', icon: '💻' },
  { id: 'data_analyst', label: 'Data Analyst', icon: '📊' },
  { id: 'product_manager', label: 'Product Manager', icon: '📱' },
  { id: 'marketing', label: 'Marketing / Comms', icon: '📣' },
  { id: 'finance', label: 'Finance / Accounting', icon: '💰' },
  { id: 'engineering', label: 'Civil / Mechanical Engineering', icon: '⚙️' },
  { id: 'medicine', label: 'Medicine / Healthcare', icon: '🏥' },
  { id: 'law', label: 'Law / Legal', icon: '⚖️' },
  { id: 'education', label: 'Education / Teaching', icon: '🎓' },
  { id: 'design', label: 'UI/UX / Graphic Design', icon: '🎨' },
  { id: 'general', label: 'General / Any Role', icon: '🎯' },
]

const DIFFICULTY = [
  { id: 'intern', label: '📋 Internship', desc: 'Summer / year-out internship' },
  { id: 'graduate', label: '🎓 Graduate Entry', desc: 'First job after university' },
  { id: 'experienced', label: '💼 Experienced Hire', desc: '2–5 years experience' },
]

const ONBOARDING_QUESTIONS = [
  'What is your name and what are you currently studying or working in?',
  'Which companies or types of organisations are you hoping to work for?',
  'What would you say are your top 3 strengths?',
  'Describe a challenging situation you have faced — academic, work, or personal — and how you handled it.',
  'What is your biggest weakness, and what are you doing to improve it?',
  'Where do you see yourself in 5 years?',
  'Why do you want to work in this field?',
]

const streamRequest = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { onDone(full); return }
        try { const p = JSON.parse(d); if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function InterviewSimulator() {
  const { user, profile } = useUser()
  const [phase, setPhase] = useState('onboarding') // onboarding | setup | interview | results
  const [role, setRole] = useState(null)
  const [difficulty, setDifficulty] = useState('graduate')
  const [company, setCompany] = useState('')

  // Onboarding chat
  const [onboardMsgs, setOnboardMsgs] = useState([])
  const [onboardInput, setOnboardInput] = useState('')
  const [onboardLoading, setOnboardLoading] = useState(false)
  const [onboardStream, setOnboardStream] = useState('')
  const [onboardComplete, setOnboardComplete] = useState(false)
  const [userProfile, setUserProfile] = useState({}) // built from conversation
  const onboardBottom = useRef(null)

  // Interview
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loadingQ, setLoadingQ] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [streamFeedback, setStreamFeedback] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { onboardBottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [onboardMsgs, onboardStream])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [feedback, streamFeedback])

  // Start onboarding with AI
  useEffect(() => {
    if (phase === 'onboarding' && onboardMsgs.length === 0) {
      setOnboardMsgs([{
        role: 'assistant',
        content: `👋 Hi${profile?.name ? ' ' + profile.name.split(' ')[0] : ''}! I'm your AI Interview Coach. Before I create your personalised interview, I want to learn about you so the questions are perfectly tailored to your background, goals, and target companies.\n\nLet's have a quick chat — I'll ask you a few questions. Ready? Let's start:\n\n**${ONBOARDING_QUESTIONS[0]}**`
      }])
    }
  }, [phase])

  const sendOnboard = async (quick) => {
    const msg = quick || onboardInput.trim()
    if (!msg || onboardLoading) return
    setOnboardInput(''); setOnboardLoading(true); setOnboardStream('')

    const newMsgs = [...onboardMsgs, { role: 'user', content: msg }]
    setOnboardMsgs(newMsgs)

    // Count how many user messages we have
    const userMsgCount = newMsgs.filter(m => m.role === 'user').length

    const systemPrompt = `You are a warm, professional AI interview coach. You are in a conversation getting to know a student/job seeker before creating their personalised interview.

You have asked ${userMsgCount} questions so far out of about 5-7.

Questions to cover (you decide the order and wording):
1. Name and current field of study or work
2. Target companies or industries they want to work in
3. Their top strengths
4. A challenging situation they have faced and how they handled it
5. Their biggest weakness and what they are doing about it
6. Where they see themselves in 5 years
7. Why they chose their field

After each answer:
- Briefly acknowledge their answer warmly (1 sentence)
- Ask the next question naturally
- If you have covered all 5–7 topics, say: "Perfect! I now have a great picture of you. I'll use everything you've told me to create a personalised interview session. Click 'Generate My Interview' when you're ready! 🎯"

Build on what they say. If they give short answers, gently encourage more detail.
Be warm, encouraging, and conversational.`

    await streamRequest(
      { messages: [{ role: 'system', content: systemPrompt }, ...newMsgs] },
      chunk => setOnboardStream(chunk),
      full => {
        const finalMsgs = [...newMsgs, { role: 'assistant', content: full }]
        setOnboardMsgs(finalMsgs)
        setOnboardStream('')
        setOnboardLoading(false)

        // Build user profile from conversation
        const userAnswers = finalMsgs.filter(m => m.role === 'user').map(m => m.content)
        setUserProfile({
          answers: userAnswers,
          conversationSummary: finalMsgs.map(m => `${m.role === 'user' ? 'Candidate' : 'Coach'}: ${m.content}`).join('\n'),
        })

        if (full.toLowerCase().includes('generate my interview') || full.toLowerCase().includes('great picture of you')) {
          setOnboardComplete(true)
        }
      },
      () => setOnboardLoading(false)
    )
  }

  const generateQuestions = async () => {
    if (!role) return
    setLoadingQ(true); setPhase('interview_loading')

    let full = ''
    await streamRequest({
      messages: [{
        role: 'user',
        content: `Generate 8 highly personalised interview questions for this specific candidate applying for a ${difficulty} ${role.label} position${company ? ` at ${company}` : ''}.

CANDIDATE PROFILE FROM CONVERSATION:
${userProfile.conversationSummary || 'No conversation data'}

Additional profile:
- Field: ${profile?.field || role.label}
- Country: ${profile?.country || 'global'}
- Skills: ${profile?.skills?.join(', ') || 'not specified'}

Generate questions that:
1. Reference specific things they mentioned in the conversation (their challenges, strengths, goals)
2. Test them on their claimed skills realistically
3. Probe their weakness they mentioned and see how they respond under pressure
4. Include questions about their target company/industry
5. Mix behavioural (STAR), situational, technical, and motivation questions

Return ONLY a JSON array of strings (the questions):
["Question 1", "Question 2", ...]

Make them feel personalised — reference their actual answers where possible.`
      }]
    },
      c => { full = c },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
          setQuestions(JSON.parse(clean.slice(s, e + 1)))
          setPhase('interview')
        } catch { setPhase('setup') }
        setLoadingQ(false)
      },
      () => { setLoadingQ(false); setPhase('setup') }
    )
  }

  const submitAnswer = () => {
    if (!currentAnswer.trim()) return
    const newAnswers = [...answers, { question: questions[currentQ], answer: currentAnswer }]
    setAnswers(newAnswers)
    setCurrentAnswer('')
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1)
    } else {
      setPhase('reviewing')
      getFeedback(newAnswers)
    }
  }

  const getFeedback = async (allAnswers) => {
    setLoadingFeedback(true); setStreamFeedback('')
    let full = ''
    await streamRequest({
      messages: [{
        role: 'user',
        content: `You are an expert interview coach. Analyse this ${difficulty} ${role?.label} interview and give detailed feedback.

CANDIDATE BACKGROUND:
${userProfile.conversationSummary || 'Not provided'}

INTERVIEW Q&A:
${allAnswers.map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`).join('\n\n')}

Return a JSON object:
{
  "overall_score": 75,
  "overall_grade": "B+",
  "overall_feedback": "2-3 sentence overall assessment referencing their specific background",
  "hire_recommendation": "Strong Yes / Yes / Maybe / No",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "star_score": 70,
  "star_feedback": "Did they use Situation-Task-Action-Result effectively?",
  "questions": [
    {
      "question": "Q text",
      "score": 80,
      "what_worked": "What was good about this answer",
      "what_to_improve": "What could be stronger",
      "model_answer_hint": "Key elements of a stronger answer"
    }
  ],
  "next_steps": "Specific, personalised advice for what to practise before their next interview"
}`
      }]
    },
      c => { full = c; setStreamFeedback(c) },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
          setFeedback(JSON.parse(clean.slice(s, e + 1)))
          setPhase('results')
        } catch { setPhase('results') }
        setLoadingFeedback(false); setStreamFeedback('')
      },
      () => { setLoadingFeedback(false) }
    )
  }

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 820, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🎙️ AI Interview Simulator</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Your AI coach learns how you think and creates a personalised interview tailored to your background and target companies</p>
        </div>

        {/* ONBOARDING CHAT */}
        {phase === 'onboarding' && (
          <div>
            <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              💡 This 3-minute chat helps the AI understand your background, strengths, and goals so it can create interview questions that are actually relevant to <strong style={{ color: '#60a5fa' }}>you</strong> — not generic ones.
            </div>

            {/* Chat */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ maxHeight: 420, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {onboardMsgs.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{msg.role === 'user' ? 'You' : '🤖 Interview Coach'}</div>
                    <div style={{
                      padding: '11px 15px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      color: '#e2e8f0', fontSize: 13, lineHeight: 1.75, maxWidth: '88%', whiteSpace: 'pre-wrap',
                    }}
                      dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>') }}
                    />
                  </div>
                ))}
                {(onboardLoading || onboardStream) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>🤖 Interview Coach</div>
                    <div style={{ padding: '11px 15px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.75, maxWidth: '88%', whiteSpace: 'pre-wrap' }}>
                      {onboardStream || <span style={{ display: 'flex', gap: 5 }}>{[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span>}
                    </div>
                  </div>
                )}
                <div ref={onboardBottom} />
              </div>
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <input value={onboardInput} onChange={e => setOnboardInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !onboardLoading) sendOnboard() }} disabled={onboardLoading} placeholder="Type your answer..." style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.4)', color: '#e2e8f0', outline: 'none' }} />
                <button onClick={() => sendOnboard()} disabled={!onboardInput.trim() || onboardLoading} style={{ padding: '11px 18px', borderRadius: 10, background: onboardInput.trim() && !onboardLoading ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', color: onboardInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Send ↑</button>
              </div>
            </div>

            {onboardComplete && (
              <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 15, marginBottom: 8 }}>✅ Profile complete! Now choose your interview settings.</div>
                <button onClick={() => setPhase('setup')} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Choose Interview Type →</button>
              </div>
            )}

            <button onClick={() => setPhase('setup')} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#374151', fontSize: 12, cursor: 'pointer' }}>Skip chat and choose interview type →</button>
          </div>
        )}

        {/* SETUP */}
        {phase === 'setup' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>🎯 Choose Your Interview</div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                {ROLES.map(r => (
                  <div key={r.id} onClick={() => setRole(r)} style={{ padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: role?.id === r.id ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', border: `1px solid ${role?.id === r.id ? '#2563eb' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: role?.id === r.id ? '#60a5fa' : '#94a3b8', lineHeight: 1.3 }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DIFFICULTY.map(d => (
                  <div key={d.id} onClick={() => setDifficulty(d.id)} style={{ padding: '12px 16px', borderRadius: 10, cursor: 'pointer', background: difficulty === d.id ? 'rgba(37,99,235,0.12)' : 'var(--surface2)', border: `1px solid ${difficulty === d.id ? '#2563eb' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18 }}>{d.label.split(' ')[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: difficulty === d.id ? '#60a5fa' : '#f1f5f9', fontSize: 13 }}>{d.label.slice(3)}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{d.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Target Company (optional)</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Flutterwave, Deloitte, MTN..." style={{ width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
            </div>

            <button onClick={generateQuestions} disabled={!role} style={{ width: '100%', padding: '13px', borderRadius: 12, background: role ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: role ? '#fff' : '#374151', border: 'none', fontWeight: 800, fontSize: 16, cursor: role ? 'pointer' : 'not-allowed' }}>
              🎙️ Generate My Personalised Interview
            </button>

            <button onClick={() => setPhase('onboarding')} style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>← Back to profile chat</button>
          </div>
        )}

        {/* LOADING */}
        {phase === 'interview_loading' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22, marginBottom: 8 }}>Crafting your personalised interview...</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>Using everything you told me to create questions that are specific to you</div>
          </div>
        )}

        {/* INTERVIEW */}
        {phase === 'interview' && questions.length > 0 && (
          <div>
            {/* Progress */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < currentQ ? '#10b981' : i === currentQ ? '#2563eb' : 'var(--border)', transition: 'background 0.3s' }} />
              ))}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎙️</div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Question {currentQ + 1} of {questions.length}</div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 17, lineHeight: 1.5 }}>{questions[currentQ]}</div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 9, marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
                💡 Use the STAR method: <strong style={{ color: '#f1f5f9' }}>Situation</strong> → <strong style={{ color: '#f1f5f9' }}>Task</strong> → <strong style={{ color: '#f1f5f9' }}>Action</strong> → <strong style={{ color: '#f1f5f9' }}>Result</strong>. Be specific. Aim for 2–3 minutes per answer.
              </div>

              <textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)} rows={6} placeholder="Write your answer naturally, as if you were speaking it aloud in a real interview..." style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>{currentAnswer.split(/\s+/).filter(Boolean).length} words</div>
                <button onClick={submitAnswer} disabled={!currentAnswer.trim()} style={{ padding: '11px 28px', borderRadius: 10, background: currentAnswer.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)', color: currentAnswer.trim() ? '#fff' : '#374151', border: 'none', fontWeight: 700, fontSize: 14, cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed' }}>
                  {currentQ < questions.length - 1 ? 'Submit & Next →' : 'Submit Final Answer →'}
                </button>
              </div>
            </div>

            {answers.length > 0 && (
              <details><summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b', padding: '6px 0' }}>View previous answers ({answers.length})</summary>
                {answers.map((a, i) => (
                  <div key={i} style={{ marginTop: 8, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 4 }}>Q{i+1}: {a.question}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{a.answer}</div>
                  </div>
                ))}
              </details>
            )}
          </div>
        )}

        {/* REVIEWING */}
        {phase === 'reviewing' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22, marginBottom: 8 }}>Analysing your answers...</div>
            <div style={{ color: '#64748b', marginBottom: 24 }}>Your AI coach is reviewing all {answers.length} answers in detail</div>
            {streamFeedback && <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'left', fontSize: 11, color: '#374151', maxHeight: 150, overflow: 'hidden' }}>{streamFeedback.slice(-400)}</div>}
          </div>
        )}

        {/* RESULTS */}
        {phase === 'results' && feedback && (
          <div>
            {/* Score */}
            <div style={{ background: `linear-gradient(135deg,${scoreColor(feedback.overall_score)}15,transparent)`, border: `1px solid ${scoreColor(feedback.overall_score)}40`, borderRadius: 20, padding: 28, textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Overall Interview Score</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: scoreColor(feedback.overall_score), lineHeight: 1 }}>{feedback.overall_score}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginTop: 4, marginBottom: 12 }}>Grade {feedback.overall_grade}</div>
              <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 16px' }}>{feedback.overall_feedback}</div>
              <span style={{ fontSize: 13, padding: '6px 18px', borderRadius: 20, background: `${scoreColor(feedback.overall_score)}20`, color: scoreColor(feedback.overall_score), fontWeight: 700, border: `1px solid ${scoreColor(feedback.overall_score)}40` }}>
                Hire Recommendation: {feedback.hire_recommendation}
              </span>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14, marginBottom: 12 }}>✅ What Worked Well</div>
                {feedback.strengths?.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(16,185,129,0.1)' : 'none' }}>→ {s}</div>)}
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14, marginBottom: 12 }}>📈 What to Improve</div>
                {feedback.improvements?.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(245,158,11,0.1)' : 'none' }}>→ {s}</div>)}
              </div>
            </div>

            {/* STAR feedback */}
            <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 14, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14, marginBottom: 6 }}>⭐ STAR Method Score: {feedback.star_score}/100</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{feedback.star_feedback}</div>
            </div>

            {/* Per-question */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>📋 Question-by-Question Feedback</div>
              {feedback.questions?.map((q, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14, flex: 1, lineHeight: 1.4 }}>Q{i+1}: {q.question}</div>
                    <div style={{ fontWeight: 900, color: scoreColor(q.score), fontSize: 18, flexShrink: 0 }}>{q.score}/100</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#10b981', marginBottom: 6 }}>✅ {q.what_worked}</div>
                  <div style={{ fontSize: 13, color: '#f59e0b', marginBottom: 10 }}>📈 {q.what_to_improve}</div>
                  {q.model_answer_hint && (
                    <details>
                      <summary style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}>💡 Stronger answer hint</summary>
                      <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(37,99,235,0.08)', borderRadius: 8, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{q.model_answer_hint}</div>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Next steps */}
            {feedback.next_steps && (
              <div style={{ padding: '16px 20px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, marginBottom: 24 }}>
                <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 14, marginBottom: 6 }}>🎯 Your Next Steps</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{feedback.next_steps}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setPhase('onboarding'); setOnboardMsgs([]); setOnboardComplete(false); setQuestions([]); setAnswers([]); setFeedback(null); setCurrentQ(0); setCurrentAnswer('') }} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Start New Interview</button>
              <button onClick={() => { setPhase('interview'); setCurrentQ(0); setAnswers([]); setFeedback(null); setCurrentAnswer('') }} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Retry Same Questions</button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}