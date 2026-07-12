import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'

const QUIZ_TOPICS = [
  { id: 'interview', label: '🎙️ Interview Skills', color: '#2563eb' },
  { id: 'cv', label: '📄 CV Knowledge', color: '#8b5cf6' },
  { id: 'workplace', label: '🏢 Workplace Etiquette', color: '#10b981' },
  { id: 'finance', label: '💰 Personal Finance', color: '#f59e0b' },
  { id: 'networking', label: '🤝 Networking', color: '#06b6d4' },
  { id: 'tech', label: '💻 Tech Career', color: '#ef4444' },
]

const QUESTIONS = {
  interview: [
    { q: 'What does STAR stand for in interview technique?', options: ['Situation, Task, Action, Result', 'Skills, Training, Attitude, Response', 'Story, Target, Achievement, Reflection', 'Subject, Time, Approach, Review'], answer: 0, explanation: 'STAR is a structured method for answering behavioural interview questions: Situation (the context), Task (your responsibility), Action (what you did), Result (the outcome).' },
    { q: 'When asked "What is your biggest weakness?", what is the best approach?', options: ['Say you have no weaknesses', 'Mention a real weakness and how you are improving it', 'Say you work too hard', 'Refuse to answer personal questions'], answer: 1, explanation: 'Interviewers want self-awareness. Pick a real but non-critical weakness and explain the steps you are taking to improve it.' },
    { q: 'How early should you arrive for an in-person interview?', options: ['30 minutes early', '5–10 minutes early', 'Exactly on time', '15–20 minutes early'], answer: 1, explanation: 'Arriving 5–10 minutes early shows punctuality without putting pressure on the interviewer. Arriving too early can be inconvenient.' },
    { q: 'Which question should you ask at the end of an interview?', options: ['"How much will I be paid?"', '"Can I work from home every day?"', '"What does success look like in this role in the first 90 days?"', '"How long are lunch breaks?"'], answer: 2, explanation: 'Asking about success criteria shows initiative and genuine interest in doing well. It also gives you useful information about expectations.' },
    { q: 'What is a panel interview?', options: ['An interview conducted over the phone', 'An interview with multiple interviewers at once', 'A group of candidates interviewed together', 'A video interview'], answer: 1, explanation: 'A panel interview has multiple interviewers (e.g. HR, manager, team member) interviewing one candidate simultaneously.' },
  ],
  cv: [
    { q: 'How long should a student/entry-level CV typically be?', options: ['3–4 pages', '1–2 pages', '5+ pages', 'As long as needed'], answer: 1, explanation: 'For students and early career professionals, 1–2 pages is ideal. Recruiters spend an average of only 7 seconds scanning a CV.' },
    { q: 'What does ATS stand for?', options: ['Applicant Tracking System', 'Automated Testing Software', 'Application Transfer Service', 'Advanced Talent Screening'], answer: 0, explanation: 'ATS (Applicant Tracking System) is software used by employers to filter CVs before a human reads them. Your CV must use relevant keywords to pass.' },
    { q: 'Which section should appear at the TOP of a student CV?', options: ['References', 'Hobbies', 'Personal Summary / Profile', 'Work Experience'], answer: 2, explanation: 'A strong personal summary at the top immediately tells the recruiter who you are and what you offer. It is the first thing they read.' },
    { q: 'Which is a strong CV bullet point?', options: ['"Responsible for social media"', '"Did marketing tasks"', '"Grew Instagram followers by 40% in 3 months using targeted content strategy"', '"Helped with the company social media pages"'], answer: 2, explanation: 'Strong bullet points use action verbs, include specific numbers/metrics, and explain the impact of your work — not just what you did.' },
    { q: 'Should you include a photo on your CV?', options: ['Always — it makes it more personal', 'Never — it is unprofessional', 'It depends on the country', 'Only if you are attractive'], answer: 2, explanation: 'In the UK, USA, and most Western countries, photos are not included to avoid bias. However, in many African, Middle Eastern, and European countries, photos are standard practice.' },
  ],
  workplace: [
    { q: 'Your manager gives you feedback you disagree with. What should you do?', options: ['Argue immediately', 'Ignore the feedback', 'Listen fully, thank them, then ask thoughtful questions if you want to understand better', 'Complain to your colleagues'], answer: 2, explanation: 'Receiving feedback professionally — even when you disagree — is a critical workplace skill. Listen first, reflect, then respond thoughtfully.' },
    { q: 'What is a reasonable response time for a professional email?', options: ['Same day or within 24 hours', '1 week', 'When you feel like it', 'Instantly, within minutes'], answer: 0, explanation: 'The professional standard is to reply to emails within the same business day or 24 hours. Even a brief acknowledgement shows professionalism.' },
    { q: 'You made a serious mistake at work. What is the best action?', options: ['Hide it and hope no one notices', 'Blame a colleague', 'Acknowledge it, take responsibility, and propose a solution', 'Quit immediately'], answer: 2, explanation: 'Owning mistakes and coming with solutions builds trust and shows maturity. Employers respect employees who are accountable.' },
    { q: 'What is "quiet quitting"?', options: ['Resigning without notice', 'Doing only the minimum required at work, with no extra effort', 'Working from home secretly', 'Leaving a job without telling HR'], answer: 1, explanation: 'Quiet quitting refers to doing only what is strictly required — no going above and beyond. It often signals low engagement or burnout.' },
    { q: 'What should you do before leaving a job?', options: ['Stop working immediately', 'Give proper notice, complete handovers, and leave professionally', 'Take all your files home', 'Bad-mouth the company online'], answer: 1, explanation: 'How you leave a job matters as much as how you arrive. Always give proper notice, document your work, and maintain relationships — the professional world is small.' },
  ],
  finance: [
    { q: 'What percentage of your income is commonly recommended for savings?', options: ['5%', '50%', '20%', '1%'], answer: 2, explanation: 'The 50/30/20 rule suggests: 50% on needs, 30% on wants, and 20% on savings and debt repayment. Even saving 10% is a great start.' },
    { q: 'What is a credit score?', options: ['Your total bank balance', 'A score that shows how reliably you repay debt', 'Your annual salary', 'Your tax rating'], answer: 1, explanation: 'A credit score is a number (typically 300–850) that shows lenders how reliable you are at repaying borrowed money. A higher score gets you better interest rates.' },
    { q: 'What is an emergency fund?', options: ['Money for holidays', 'Savings covering 3–6 months of expenses for emergencies', 'A government loan', 'Money in a risky investment'], answer: 1, explanation: 'An emergency fund covers unexpected costs (job loss, medical emergencies) without going into debt. Aim for 3–6 months of living expenses.' },
    { q: 'What is compound interest?', options: ['A flat monthly fee on loans', 'Interest earned on both your principal AND previously earned interest', 'A type of tax', 'A fixed savings bonus'], answer: 1, explanation: 'Compound interest means you earn interest on your interest — making investments grow exponentially over time. Starting early is the key to building wealth.' },
    { q: 'What does negotiating your salary do?', options: ['Makes you look greedy', 'Could increase your lifetime earnings by hundreds of thousands', 'Is considered rude in all cultures', 'Only works for senior positions'], answer: 1, explanation: 'Negotiating your starting salary has compounding effects — it affects all future raises, bonuses, and job offers. Research market rates and negotiate confidently.' },
  ],
  networking: [
    { q: 'What is the most effective networking approach?', options: ['Only connecting with people you can get something from', 'Building genuine relationships and offering value first', 'Sending mass connection requests on LinkedIn', 'Only networking when you need a job'], answer: 1, explanation: 'The best networkers build relationships before they need them, and focus on how they can help others — not just what they can get.' },
    { q: 'What should a LinkedIn connection request include?', options: ['Nothing — just send it', 'A personalised note explaining why you want to connect', 'Your CV as an attachment', 'A request for a job immediately'], answer: 1, explanation: 'Always personalise connection requests. Mention how you found them, a common interest, or why you admire their work. It dramatically increases acceptance rates.' },
    { q: 'What is an informational interview?', options: ['A formal job interview', 'A casual conversation to learn about someone\'s career and industry', 'A performance review', 'A company presentation'], answer: 1, explanation: 'An informational interview is a low-pressure conversation where you ask someone about their career path and industry. It builds relationships and gives you insider knowledge.' },
    { q: 'How often should you update your LinkedIn profile?', options: ['Only when job hunting', 'Never — set it and forget it', 'Regularly — add achievements, skills, and engage with content', 'Only when you change jobs'], answer: 2, explanation: 'An active LinkedIn profile is more visible. Update achievements regularly, share industry content, and engage — even when you are not looking for a job.' },
    { q: 'What is the "hidden job market"?', options: ['Illegal job advertisements', 'Jobs that are filled through networking before being advertised publicly', 'Jobs for government officials only', 'Remote work opportunities'], answer: 1, explanation: 'Research suggests 70–80% of jobs are filled through networking, not advertised. Building relationships puts you in line for opportunities before they are publicly posted.' },
  ],
  tech: [
    { q: 'What does API stand for?', options: ['Application Programming Interface', 'Automated Processing Input', 'Advanced Program Integration', 'Application Protocol Interface'], answer: 0, explanation: 'An API (Application Programming Interface) allows different software systems to communicate. When you use weather on your phone, it talks to a weather service via an API.' },
    { q: 'Which language is most commonly used for data science?', options: ['Java', 'Python', 'C++', 'Ruby'], answer: 1, explanation: 'Python dominates data science due to its simplicity and powerful libraries like Pandas, NumPy, Matplotlib, and TensorFlow/PyTorch for machine learning.' },
    { q: 'What is cloud computing?', options: ['A type of weather forecast software', 'Storing and accessing data/programs over the internet instead of your own computer', 'Computer graphics technology', 'A networking protocol'], answer: 1, explanation: 'Cloud computing (AWS, Google Cloud, Azure) lets you use computing resources over the internet. It powers most modern apps and is a key skill for tech careers.' },
    { q: 'What is an agile methodology?', options: ['A fast typing technique', 'An iterative approach to software development with short cycles called sprints', 'A physical exercise program for developers', 'A programming language'], answer: 1, explanation: 'Agile is a project management approach common in tech companies. Work is broken into short sprints (1–2 weeks) with continuous feedback and adaptation.' },
    { q: 'What does UI/UX stand for?', options: ['Unified Internet / User Exchange', 'User Interface / User Experience', 'Universal Input / Unified Export', 'Unique Integration / User Extension'], answer: 1, explanation: 'UI (User Interface) is what users see and interact with. UX (User Experience) is how they feel using it. Both are critical for building products people love.' },
  ],
}

export default function CareerQuiz() {
  const { user } = useUser()
  const [topic, setTopic] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const questions = topic ? QUESTIONS[topic] : []
  const q = questions[current]

  const selectAnswer = (idx) => {
    if (submitted) return
    setAnswers(p => ({ ...p, [current]: idx }))
  }

  const submit = () => {
    let s = 0
    questions.forEach((q, i) => { if (answers[i] === q.answer) s++ })
    setScore(s)
    setSubmitted(true)
  }

  const restart = () => {
    setAnswers({}); setSubmitted(false); setScore(0); setCurrent(0)
  }

  const scoreColor = score >= questions.length * 0.8 ? '#10b981' : score >= questions.length * 0.6 ? '#f59e0b' : '#ef4444'

  if (!topic) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 800, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🧠</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Career Readiness Quiz</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Test your knowledge across 6 key career areas. Each quiz has 5 questions with detailed explanations.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
          {QUIZ_TOPICS.map(t => (
            <div key={t.id} onClick={() => setTopic(t.id)} className="card-glow" style={{ background: 'var(--surface)', border: `1px solid ${t.color}30`, borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{t.label.split(' ')[0]}</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 6 }}>{t.label.slice(3)}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>5 questions · ~3 minutes</div>
              <div style={{ marginTop: 14, padding: '7px 16px', borderRadius: 8, background: `${t.color}15`, color: t.color, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>Start Quiz →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 680, margin: '0 auto', padding: '100px 20px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{QUIZ_TOPICS.find(t => t.id === topic)?.label}</div>
            <div style={{ fontSize: 13, color: '#374151' }}>Question {current + 1} of {questions.length}</div>
          </div>
          <button onClick={() => { setTopic(null); restart() }} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>← Topics</button>
        </div>

        {/* Progress */}
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${((current + 1) / questions.length) * 100}%`, background: QUIZ_TOPICS.find(t => t.id === topic)?.color || '#2563eb', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>

        {/* Score (after submit) */}
        {submitted && (
          <div style={{ marginBottom: 20, padding: '20px 24px', borderRadius: 14, background: `${scoreColor}10`, border: `1px solid ${scoreColor}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22 }}>
                {score === questions.length ? '🏆 Perfect!' : score >= questions.length * 0.8 ? '🎉 Excellent!' : score >= questions.length * 0.6 ? '👍 Good effort!' : '📚 Keep learning!'}
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Read the explanations below to fill any gaps</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: scoreColor }}>{score}/{questions.length}</div>
          </div>
        )}

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(submitted ? questions : [q]).map((question, qi) => {
            const qIdx = submitted ? qi : current
            const selected = answers[qIdx]
            const isCorrect = selected === question.answer
            return (
              <div key={qIdx} style={{ background: 'var(--surface)', border: `1px solid ${submitted ? (isCorrect ? 'rgba(16,185,129,0.4)' : selected !== undefined ? 'rgba(239,68,68,0.4)' : 'var(--border)') : 'var(--border)'}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${QUIZ_TOPICS.find(t => t.id === topic)?.color || '#2563eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{qIdx + 1}</div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, lineHeight: 1.5 }}>{question.q}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {question.options.map((opt, j) => {
                    const isSelected = answers[qIdx] === j
                    const isAnswer = j === question.answer
                    let bg = 'var(--surface2)', border = 'var(--border)', color = '#e2e8f0'
                    if (submitted) {
                      if (isAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '#10b981'; color = '#10b981' }
                      else if (isSelected && !isAnswer) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; color = '#ef4444' }
                    } else if (isSelected) { bg = 'rgba(37,99,235,0.15)'; border = QUIZ_TOPICS.find(t => t.id === topic)?.color || '#2563eb'; color = '#60a5fa' }
                    return (
                      <div key={j} onClick={() => selectAnswer(j)} style={{ padding: '11px 16px', borderRadius: 10, cursor: submitted ? 'default' : 'pointer', background: bg, border: `1px solid ${border}`, color, fontSize: 14, fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{opt}</span>
                        {submitted && isAnswer && <span>✅</span>}
                        {submitted && isSelected && !isAnswer && <span>❌</span>}
                      </div>
                    )
                  })}
                </div>
                {submitted && question.explanation && (
                  <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginBottom: 4 }}>💡 EXPLANATION</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{question.explanation}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        {!submitted && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: current === 0 ? '#374151' : '#e2e8f0', cursor: current === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>← Prev</button>
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(c => c + 1)} disabled={answers[current] === undefined} style={{ padding: '10px 28px', borderRadius: 10, background: answers[current] !== undefined ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', color: answers[current] !== undefined ? '#fff' : '#374151', border: 'none', fontWeight: 700, cursor: answers[current] !== undefined ? 'pointer' : 'not-allowed' }}>Next →</button>
            ) : (
              <button onClick={submit} disabled={Object.keys(answers).length < questions.length} style={{ padding: '10px 28px', borderRadius: 10, background: Object.keys(answers).length >= questions.length ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)', color: Object.keys(answers).length >= questions.length ? '#fff' : '#374151', border: 'none', fontWeight: 700, cursor: Object.keys(answers).length >= questions.length ? 'pointer' : 'not-allowed' }}>
                {Object.keys(answers).length < questions.length ? `Answer all (${Object.keys(answers).length}/${questions.length})` : 'Submit Quiz ✓'}
              </button>
            )}
          </div>
        )}

        {submitted && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={restart} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Retry This Quiz</button>
            <button onClick={() => { setTopic(null); restart() }} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Try Another Topic →</button>
          </div>
        )}
      </div>
    </div>
  )
}