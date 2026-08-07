import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

export default function EmergencyStudyPack({ open, onClose, exam, libraryFiles }) {
  const [loading, setLoading] = useState(false)
  const [pack, setPack] = useState(null)
  const [step, setStep] = useState(0)

  const generate = async () => {
    if (!exam) return
    setLoading(true)
    setPack(null)

    const relevantFiles = (libraryFiles || [])
      .filter(f => f.title?.toLowerCase().includes(exam.module_name?.toLowerCase().split(' ')[0]) || f.content_text)
      .slice(0, 3)

    const context = relevantFiles
      .map(f => f.content_text?.slice(0, 1500) || '')
      .filter(Boolean)
      .join('\n\n---\n\n')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `A student has an exam TOMORROW for "${exam.module_name}". Generate an EMERGENCY STUDY PACK.

${context ? `Available study material:\n${context}\n\n` : ''}

Create a comprehensive emergency revision pack with:

1. **CRITICAL DEFINITIONS** — 8 key terms they absolutely must know
2. **ESSENTIAL FORMULAS** — 6 formulas most likely to be tested  
3. **MOST LIKELY EXAM TOPICS** — ranked by probability of appearing
4. **10 PRACTICE QUESTIONS** — with answers, covering the most important concepts
5. **LAST-MINUTE TIPS** — 5 specific exam strategies for this subject
6. **WHAT TO FOCUS ON IN THE NEXT 12 HOURS** — a prioritised 12-hour plan

Be specific to ${exam.module_name}. This is urgent — the exam is tomorrow.`,
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setPack(full) } } catch {}
        }
      }
    } catch {}
    setLoading(false)
  }

  const sections = pack?.split(/\d+\.\s+\*\*/).filter(Boolean) || []

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🚨 Emergency Study Pack" height="92vh" fullscreen>
      <div style={{ padding: '16px' }}>
        {!pack && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🚨</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Exam Tomorrow!</div>
            {exam && (
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{exam.module_name}</div>
            )}
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              The AI will generate a targeted emergency revision pack — critical definitions, essential formulas, likely exam topics, 10 practice questions, and a 12-hour study plan.
            </div>
            <button onClick={generate}
              style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              🚨 Generate Emergency Pack
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(239,68,68,0.2)', borderTop: '3px solid #ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Generating your emergency pack...</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Analysing your files and creating targeted revision</div>
            {pack && (
              <div style={{ marginTop: 16, padding: '12px', borderRadius: 10, background: 'var(--surface2)', fontSize: 12, color: 'var(--text3)', textAlign: 'left', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {pack.slice(-300)}
              </div>
            )}
          </div>
        )}

        {pack && !loading && (
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {pack}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}