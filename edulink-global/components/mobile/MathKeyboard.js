import { useState } from 'react'

const SETS = {
  General:     ['×', '÷', '±', '≤', '≥', '≠', '≈', '∞', '²', '³', '√', 'π'],
  Engineering: ['Ω', 'μ', 'σ', 'ε', '∑', '∂', '∇', 'ρ', 'λ', 'θ', 'φ', 'β'],
  Calculus:    ['∫', '∮', '∬', '∂', 'lim', 'Δ', 'δ', '∀', '∃', '⊂', '∈', '∉'],
  Chemistry:   ['⇌', '→', '↑', '↓', '°', '·', '₁', '₂', '₃', '₄', 'Å', '℃'],
}

export default function MathKeyboard({ onInsert }) {
  const [visible, setVisible] = useState(false)
  const [activeSet, setActiveSet] = useState('General')

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setVisible(v => !v)}
        style={{ padding: '6px 10px', borderRadius: 8, background: visible ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', border: `1px solid ${visible ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, color: visible ? '#60a5fa' : 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Σ
      </button>

      {visible && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px 14px 0 0', padding: '10px', zIndex: 200, boxShadow: '0 -4px 24px rgba(0,0,0,0.3)', minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto' }}>
            {Object.keys(SETS).map(s => (
              <button key={s} onClick={() => setActiveSet(s)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: activeSet === s ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: activeSet === s ? '#60a5fa' : 'var(--text3)', border: `1px solid ${activeSet === s ? 'rgba(37,99,235,0.3)' : 'transparent'}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
            {SETS[activeSet].map((sym, i) => (
              <button key={i} onClick={() => { onInsert(sym); setVisible(false) }}
                style={{ padding: '10px 4px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer', color: 'var(--text)', fontWeight: 600, textAlign: 'center' }}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}