import { useState, useEffect } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

const RESOURCES = [
  { name: 'SADAG', desc: 'SA Depression and Anxiety Group', phone: '0800 456 789', url: 'https://sadag.org' },
  { name: 'Lifeline', desc: '24-hour crisis counselling', phone: '0861 322 322', url: 'https://lifelinesa.co.za' },
  { name: 'Campus Counselling', desc: 'Contact your student services', phone: null, url: null },
]

export default function MentalHealthCheckIn({ open, onClose, user }) {
  const [step, setStep] = useState('check') // check | response | resources
  const [feeling, setFeeling] = useState(null)
  const [aiResponse, setAiResponse] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) { setStep('check'); setFeeling(null); setAiResponse('') }
  }, [open])

  const OPTIONS = [
    { id: 'great',    emoji: '😊', label: 'Going well',      color: '#10b981' },
    { id: 'okay',     emoji: '😐', label: 'Feeling okay',    color: '#f59e0b' },
    { id: 'stressed', emoji: '😰', label: 'Feeling stressed', color: '#f97316' },
    { id: 'hard',     emoji: '😢', label: 'Really struggling', color: '#ef4444' },
  ]

  const respond = async (option) => {
    setFeeling(option)
    if (option.id === 'great' || option.id === 'okay') {
      setStep('response')
      setAiResponse(option.id === 'great'
        ? "That's wonderful to hear! Keep up the great energy. Remember to take breaks and celebrate your progress — you're doing well. 💪"
        : "It's completely normal to feel that way during your studies. Make sure you're taking short breaks, staying hydrated, and getting enough sleep. You've got this! 🌟")
      return
    }

    setStep('response')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: 'You are a compassionate student wellbeing companion at EduLink. Respond with warmth, empathy, and practical support. Keep your response short (3-4 sentences), acknowledge the student\'s feelings without minimizing them, offer one concrete coping suggestion, and gently mention that professional support is available if needed. Do not provide therapy or crisis counselling.',
          }, {
            role: 'user',
            content: option.id === 'stressed'
              ? 'I am feeling quite stressed about my studies this week.'
              : 'I am really struggling with my studies and feeling overwhelmed.',
          }],
        }),
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setAiResponse(full) } } catch {}
        }
      }
    } catch {}
    setLoading(false)
  }

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="💚 Weekly Check-In" height="75vh">
      <div style={{ padding: '16px' }}>
        {step === 'check' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>💚</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>How are you doing?</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                EduLink cares about you as a whole person — not just your grades. How are you feeling about your studies this week?
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => respond(opt)}
                  style={{ padding: '16px 20px', borderRadius: 14, background: `${opt.color}08`, border: `1px solid ${opt.color}25`, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'response' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 28 }}>{feeling?.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{feeling?.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>EduLink responds</div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 22, height: 22, border: '2px solid rgba(16,185,129,0.2)', borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
                {aiResponse}
              </div>
            )}

            {(feeling?.id === 'stressed' || feeling?.id === 'hard') && !loading && (
              <button onClick={() => setStep('resources')}
                style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
                💙 View Support Resources
              </button>
            )}

            <button onClick={onClose}
              style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Close
            </button>
          </>
        )}

        {step === 'resources' && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>💙 Support Resources</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.5 }}>
              Asking for help is a sign of strength. These services are confidential and here for you.
            </div>
            {RESOURCES.map((r, i) => (
              <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: r.phone ? 8 : 0 }}>{r.desc}</div>
                {r.phone && (
                  <a href={`tel:${r.phone}`} style={{ display: 'inline-block', fontSize: 14, color: '#10b981', fontWeight: 700, textDecoration: 'none' }}>
                    📞 {r.phone}
                  </a>
                )}
              </div>
            ))}
            <button onClick={onClose}
              style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 10 }}>
              I'm okay — Close
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}