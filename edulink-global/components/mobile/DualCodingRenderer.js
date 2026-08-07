import { useState } from 'react'

export default function DualCodingRenderer({ text, diagram, subject }) {
  const [showDiagram, setShowDiagram] = useState(true)
  const [loadingDiagram, setLoadingDiagram] = useState(false)
  const [generatedDiagram, setGeneratedDiagram] = useState(diagram || null)

  const generateDiagram = async () => {
    if (!text || loadingDiagram) return
    setLoadingDiagram(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Create a simple ASCII diagram or structured visual representation for this concept: "${text.slice(0, 500)}". Use arrows (→), boxes ([ ]), and indentation to show relationships. Keep it clear and concise. Only output the diagram, no explanation.`
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
      setGeneratedDiagram(full)
    } catch {}
    setLoadingDiagram(false)
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setShowDiagram(false)}
          style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !showDiagram ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: !showDiagram ? '#60a5fa' : 'var(--text3)', border: `1px solid ${!showDiagram ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
          📝 Text
        </button>
        <button onClick={() => { setShowDiagram(true); if (!generatedDiagram) generateDiagram() }}
          style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: showDiagram ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: showDiagram ? '#60a5fa' : 'var(--text3)', border: `1px solid ${showDiagram ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
          🧠 Visual
        </button>
      </div>

      {/* Content */}
      {!showDiagram && (
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, background: 'var(--surface2)', padding: '14px', borderRadius: 12 }}>
          {text}
        </div>
      )}

      {showDiagram && (
        <div style={{ background: 'var(--surface2)', padding: '14px', borderRadius: 12, minHeight: 100 }}>
          {loadingDiagram ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)' }}>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(37,99,235,0.2)', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              Generating visual...
            </div>
          ) : generatedDiagram ? (
            <pre style={{ fontSize: 13, color: '#60a5fa', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
              {generatedDiagram}
            </pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
              No visual generated yet
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}