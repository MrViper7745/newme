import { useState } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import useHaptic from '../../hooks/useHaptic'

const STYLES = ['APA', 'Harvard', 'Chicago', 'Vancouver', 'MLA']

export default function MobileCitationGenerator() {
  const haptic = useHaptic()
  const [style, setStyle] = useState('APA')
  const [sourceInput, setSourceInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [citations, setCitations] = useState([])
  const [copied, setCopied] = useState(null)

  const generate = async () => {
    if (!sourceInput.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/citation-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceInput, style }),
      })
      const data = await res.json()
      if (data.citation) {
        setCitations(prev => [{ id: Date.now(), source: sourceInput, citation: data.citation, style }, ...prev])
        setSourceInput('')
        haptic.success()
      }
    } catch {}
    setGenerating(false)
  }

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    haptic.tap()
    setTimeout(() => setCopied(null), 2000)
  }

  const exportAll = () => {
    const text = citations.map(c => `[${c.style}]\n${c.citation}\n`).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    a.download = 'references.txt'
    a.click()
  }

  return (
    <MobileLayout title="📖 Citation Generator">
      <div style={{ padding: '12px 16px' }}>

        {/* Style selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: style === s ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: style === s ? '#60a5fa' : 'var(--text3)', border: `1px solid ${style === s ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Source Information</label>
          <textarea value={sourceInput} onChange={e => setSourceInput(e.target.value)}
            placeholder={`Paste any information about your source:\n- Book: author, title, year, publisher\n- Website: URL, author, page title, date accessed\n- Journal: author, title, journal name, volume, pages, year\n\nThe AI will format it correctly in ${style} style.`}
            rows={5}
            style={{ width: '100%', padding: '12px 13px', borderRadius: 11, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit' }} />
        </div>

        <button onClick={generate} disabled={!sourceInput.trim() || generating}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: sourceInput.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: sourceInput.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          {generating ? '⏳ Formatting...' : `📖 Format in ${style}`}
        </button>

        {/* Citations list */}
        {citations.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your References ({citations.length})</div>
              <button onClick={exportAll} style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Export .txt ↓</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {citations.map(c => (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(37,99,235,0.1)', color: '#60a5fa', fontWeight: 700 }}>{c.style}</span>
                    <button onClick={() => copy(c.id, c.citation)}
                      style={{ fontSize: 11, color: copied === c.id ? '#10b981' : '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                      {copied === c.id ? '✅ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic' }}>{c.citation}</div>
                  <button onClick={() => setCitations(prev => prev.filter(x => x.id !== c.id))}
                    style={{ marginTop: 8, fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {citations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📖</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>No citations yet. Paste your source information above and the AI will format it correctly.</div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}