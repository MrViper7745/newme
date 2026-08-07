import { useState } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import useHaptic from '../../hooks/useHaptic'

export default function MobileResearchSimplifier() {
  const haptic = useHaptic()
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('simplify')
  const fileRef = useState(null)[0]

  const MODES = [
    { id: 'simplify', label: 'Simplify', desc: 'Plain English summary' },
    { id: 'methodology', label: 'Methodology', desc: 'How they did the research' },
    { id: 'findings', label: 'Key Findings', desc: 'What they found' },
    { id: 'critique', label: 'Critique', desc: 'Strengths and weaknesses' },
  ]

  const process = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    haptic.tap()

    const prompts = {
      simplify: `You are helping a university student understand an academic paper. Simplify this academic text into plain, clear English that a first-year student can understand. Keep all important information but remove jargon. Use simple sentences and concrete examples where possible.\n\nText:\n${input.slice(0, 4000)}`,
      methodology: `Analyse the methodology of this academic paper. Explain: 1) What research method was used, 2) How data was collected, 3) How it was analysed, 4) Limitations of the method. Use simple, clear language.\n\nText:\n${input.slice(0, 4000)}`,
      findings: `Extract and explain the key findings from this academic paper. For each finding: state it clearly, explain what it means, and note any implications. Use bullet points and simple language.\n\nText:\n${input.slice(0, 4000)}`,
      critique: `Provide a balanced academic critique of this text. Cover: 1) Strengths of the argument, 2) Weaknesses or limitations, 3) What is missing, 4) How it could be improved. Be specific and constructive.\n\nText:\n${input.slice(0, 4000)}`,
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompts[mode] }] }),
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setResult(full) } } catch {}
        }
      }
    } catch (err) { setResult('Error: ' + err.message) }
    setLoading(false)
  }

  return (
    <MobileLayout title="🔬 Research Simplifier">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          Paste dense academic text and the AI will translate it into plain English, extract methodology, identify key findings, or provide a critique.
        </div>

        {/* Mode selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
          {MODES.map(m => (
            <div key={m.id} onClick={() => setMode(m.id)}
              style={{ padding: '10px 12px', borderRadius: 11, background: mode === m.id ? 'rgba(37,99,235,0.12)' : 'var(--surface)', border: `1px solid ${mode === m.id ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: mode === m.id ? '#60a5fa' : 'var(--text)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Paste Academic Text</label>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder="Paste the abstract, introduction, or any section of an academic paper here..."
            rows={8}
            style={{ width: '100%', padding: '12px 13px', borderRadius: 11, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit' }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, textAlign: 'right' }}>{input.length.toLocaleString()} / 4000 characters</div>
        </div>

        <button onClick={process} disabled={!input.trim() || loading}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: input.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: input.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
          {loading ? `⏳ ${MODES.find(m => m.id === mode)?.label}ing...` : `🔬 ${MODES.find(m => m.id === mode)?.label}`}
        </button>

        {/* Result */}
        {result && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>{MODES.find(m => m.id === mode)?.label}</div>
              <button onClick={() => navigator.clipboard.writeText(result).then(() => haptic.success())}
                style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Copy
              </button>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setResult(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
              <button onClick={process} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Try Another Mode</button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}