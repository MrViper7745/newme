import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PracticeExam({ file, user, onClose }) {
  const [phase, setPhase] = useState('loading') // loading | active | scoring | results
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [scoring, setScoring] = useState(false)
  const [startTime] = useState(Date.now())

  useEffect(() => { loadQuestions() }, [])

  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_text: file.content_text, title: file.title || file.name }),
      })
      const data = await res.json()
      if (data.questions?.length) {
        setQuestions(data.questions)
        setPhase('active')
      } else {
        setPhase('error')
      }
    } catch {
      setPhase('error')
    }
  }

  const submitAnswer = async () => {
    if (!answer.trim()) return
    setScoring(true)
    try {
      const res = await fetch('/api/score-practice-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions[currentIndex].question,
          student_answer: answer,
          document_context: file.content_text,
        }),
      })
      const scored = await res.json()
      const newResult = {
        question: questions[currentIndex].question,
        student_answer: answer,
        ...scored,
      }
      setResults(prev => [...prev, newResult])
      setAnswer('')

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        finishExam([...results, newResult])
      }
    } catch {}
    setScoring(false)
  }

  const finishExam = async (finalResults) => {
    const totalScore = finalResults.reduce((s, r) => s + (r.score || 0), 0)
    const maxScore = finalResults.length * 100
    await supabase.from('practice_attempts').insert({
      user_id: user.id,
      file_id: file.id,
      file_title: file.title || file.name,
      questions: finalResults,
      total_score: totalScore,
      max_score: maxScore,
      duration_seconds: Math.round((Date.now() - startTime) / 1000),
      completed: true,
    })
    setPhase('results')
  }

  const skipQuestion = () => {
    const newResult = { question: questions[currentIndex].question, student_answer: '(skipped)', score: 0, correct_answer: '', feedback: 'Skipped' }
    setResults(prev => [...prev, newResult])
    setAnswer('')
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      finishExam([...results, newResult])
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 18, padding: 28, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>✍️ Practice Exam Mode</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            Reading questions from {file.title || file.name}...
          </div>
        )}

        {phase === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            Could not extract distinct questions from this document. Try the regular AI chat instead.
          </div>
        )}

        {phase === 'active' && questions[currentIndex] && (
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < currentIndex ? '#10b981' : i === currentIndex ? '#7c3aed' : 'var(--border)' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Question {currentIndex + 1} of {questions.length}</div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 16, fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 }}>
              <strong style={{ color: '#a78bfa' }}>Q{questions[currentIndex].number}.</strong> {questions[currentIndex].question}
            </div>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={6}
              placeholder="Write your full answer with working..."
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.3)', color: '#e2e8f0', outline: 'none', resize: 'vertical', marginBottom: 14, lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={skipQuestion} disabled={scoring} style={{ padding: '11px 20px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Skip
              </button>
              <button onClick={submitAnswer} disabled={!answer.trim() || scoring} style={{ flex: 1, padding: '11px 20px', borderRadius: 10, background: answer.trim() && !scoring ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: answer.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {scoring ? '⏳ Marking...' : currentIndex < questions.length - 1 ? 'Submit & Next →' : 'Submit & Finish'}
              </button>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#7c3aed', marginBottom: 4 }}>
                {Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length)}%
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Overall score across {results.length} questions</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.map((r, i) => (
                <div key={i} style={{ background: 'var(--surface2)', border: `1px solid ${r.score >= 70 ? 'rgba(16,185,129,0.25)' : r.score >= 40 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: r.score >= 70 ? '#10b981' : r.score >= 40 ? '#f59e0b' : '#ef4444' }}>{r.score}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 6 }}>{r.feedback}</div>
                  {r.correct_answer && (
                    <div style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(37,99,235,0.06)', padding: '8px 10px', borderRadius: 7, marginTop: 6 }}>
                      <strong>Model answer:</strong> {r.correct_answer.slice(0, 300)}{r.correct_answer.length > 300 ? '...' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}