import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

const FORMULAS = {
  Mathematics: [
    { name: 'Quadratic Formula', formula: 'x = (-b ± √(b²-4ac)) / 2a', category: 'Algebra' },
    { name: 'Pythagorean Theorem', formula: 'a² + b² = c²', category: 'Geometry' },
    { name: 'Derivative Power Rule', formula: 'd/dx[xⁿ] = nxⁿ⁻¹', category: 'Calculus' },
    { name: 'Integration Power Rule', formula: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C', category: 'Calculus' },
    { name: 'Integration by Parts', formula: '∫u dv = uv - ∫v du', category: 'Calculus' },
    { name: 'Chain Rule', formula: 'd/dx[f(g(x))] = f\'(g(x))·g\'(x)', category: 'Calculus' },
    { name: "Euler's Formula", formula: 'e^(iθ) = cos θ + i sin θ', category: 'Complex Numbers' },
    { name: 'Taylor Series', formula: 'f(x) = Σ f⁽ⁿ⁾(a)/n! · (x-a)ⁿ', category: 'Series' },
    { name: 'Binomial Theorem', formula: '(a+b)ⁿ = Σ C(n,k) aⁿ⁻ᵏ bᵏ', category: 'Algebra' },
    { name: 'Bayes Theorem', formula: 'P(A|B) = P(B|A)·P(A) / P(B)', category: 'Probability' },
  ],
  Physics: [
    { name: "Newton's 2nd Law", formula: 'F = ma', category: 'Mechanics' },
    { name: 'Kinematic', formula: 'v² = u² + 2as', category: 'Mechanics' },
    { name: 'Gravitational Force', formula: 'F = Gm₁m₂/r²', category: 'Mechanics' },
    { name: 'Ohm\'s Law', formula: 'V = IR', category: 'Electricity' },
    { name: 'Power', formula: 'P = IV = I²R = V²/R', category: 'Electricity' },
    { name: 'Capacitance', formula: 'Q = CV', category: 'Electricity' },
    { name: "Faraday's Law", formula: 'EMF = -dΦ/dt', category: 'Electromagnetism' },
    { name: 'Wave Speed', formula: 'v = fλ', category: 'Waves' },
    { name: 'Ideal Gas Law', formula: 'PV = nRT', category: 'Thermodynamics' },
    { name: '1st Law of Thermo', formula: 'ΔU = Q - W', category: 'Thermodynamics' },
  ],
  Engineering: [
    { name: 'Stress', formula: 'σ = F/A', category: 'Mechanics of Materials' },
    { name: 'Strain', formula: 'ε = ΔL/L', category: 'Mechanics of Materials' },
    { name: "Hooke's Law", formula: 'σ = Eε', category: 'Mechanics of Materials' },
    { name: "Kirchhoff's Voltage Law", formula: 'ΣV = 0 (around any loop)', category: 'Circuits' },
    { name: "Kirchhoff's Current Law", formula: 'ΣI_in = ΣI_out', category: 'Circuits' },
    { name: 'Power Factor', formula: 'PF = cos φ = P/S', category: 'AC Circuits' },
    { name: 'Reynolds Number', formula: 'Re = ρvD/μ', category: 'Fluid Mechanics' },
    { name: "Bernoulli's Equation", formula: 'P + ½ρv² + ρgh = const', category: 'Fluid Mechanics' },
    { name: 'Efficiency', formula: 'η = (P_out / P_in) × 100%', category: 'General' },
    { name: 'Transfer Function', formula: 'H(s) = Y(s)/X(s)', category: 'Control Systems' },
  ],
  Chemistry: [
    { name: 'Ideal Gas Law', formula: 'PV = nRT', category: 'Gases' },
    { name: 'Molarity', formula: 'M = n/V (mol/L)', category: 'Solutions' },
    { name: 'pH Definition', formula: 'pH = -log[H⁺]', category: 'Acids & Bases' },
    { name: 'Henderson-Hasselbalch', formula: 'pH = pKa + log([A⁻]/[HA])', category: 'Acids & Bases' },
    { name: 'Rate Law', formula: 'Rate = k[A]ᵐ[B]ⁿ', category: 'Kinetics' },
    { name: 'Arrhenius Equation', formula: 'k = Ae^(-Ea/RT)', category: 'Kinetics' },
    { name: "Faraday's Law (electrochem)", formula: 'm = (M·I·t)/(n·F)', category: 'Electrochemistry' },
    { name: 'Gibbs Free Energy', formula: 'ΔG = ΔH - TΔS', category: 'Thermodynamics' },
  ],
}

const CONSTANTS = [
  { name: 'Speed of Light', symbol: 'c', value: '2.998 × 10⁸ m/s' },
  { name: 'Gravitational Constant', symbol: 'G', value: '6.674 × 10⁻¹¹ N·m²/kg²' },
  { name: 'Planck\'s Constant', symbol: 'h', value: '6.626 × 10⁻³⁴ J·s' },
  { name: 'Boltzmann Constant', symbol: 'k_B', value: '1.381 × 10⁻²³ J/K' },
  { name: 'Gas Constant', symbol: 'R', value: '8.314 J/(mol·K)' },
  { name: 'Avogadro\'s Number', symbol: 'N_A', value: '6.022 × 10²³ mol⁻¹' },
  { name: 'Faraday Constant', symbol: 'F', value: '96,485 C/mol' },
  { name: 'Elementary Charge', symbol: 'e', value: '1.602 × 10⁻¹⁹ C' },
  { name: 'Permittivity (vacuum)', symbol: 'ε₀', value: '8.854 × 10⁻¹² F/m' },
  { name: 'Permeability (vacuum)', symbol: 'μ₀', value: '4π × 10⁻⁷ T·m/A' },
]

export default function FormulaSheet({ open, onClose }) {
  const [subject, setSubject] = useState('Mathematics')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('formulas')
  const [copied, setCopied] = useState(null)

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const allFormulas = FORMULAS[subject] || []
  const filtered = search
    ? Object.values(FORMULAS).flat().filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.formula.toLowerCase().includes(search.toLowerCase()) ||
        f.category.toLowerCase().includes(search.toLowerCase())
      )
    : allFormulas

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="📐 Formula Sheet" height="88vh">
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {['formulas', 'constants'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', color: activeTab === t ? '#60a5fa' : 'var(--text3)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${activeTab === t ? '#2563eb' : 'transparent'}`, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'formulas' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search formulas..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', marginBottom: 12 }} />

            {!search && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
                {Object.keys(FORMULAS).map(s => (
                  <button key={s} onClick={() => setSubject(s)}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: subject === s ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: subject === s ? '#60a5fa' : 'var(--text3)', border: `1px solid ${subject === s ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((f, i) => (
                <div key={i} onClick={() => copy(f.formula, i)}
                  style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${copied === i ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{f.category}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{f.name}</div>
                      <div style={{ fontSize: 15, fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600, background: 'rgba(37,99,235,0.06)', padding: '6px 10px', borderRadius: 7, display: 'inline-block' }}>{f.formula}</div>
                    </div>
                    <div style={{ fontSize: 11, color: copied === i ? '#10b981' : 'var(--text3)', fontWeight: 600, flexShrink: 0, marginTop: 4 }}>
                      {copied === i ? '✅ Copied!' : 'Tap to copy'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'constants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CONSTANTS.map((c, i) => (
              <div key={i} onClick={() => copy(c.value, `c${i}`)}
                style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${copied === `c${i}` ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'monospace', marginBottom: 3 }}>{c.symbol}</div>
                    <div style={{ fontSize: 13, color: '#60a5fa', fontFamily: 'monospace' }}>{c.value}</div>
                  </div>
                  <div style={{ fontSize: 11, color: copied === `c${i}` ? '#10b981' : 'var(--text3)', fontWeight: 600 }}>
                    {copied === `c${i}` ? '✅' : 'Copy'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileBottomSheet>
  )
}