import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

const CATEGORIES = {
  Length: {
    units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'],
    toBase: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  },
  Mass: {
    units: ['mg', 'g', 'kg', 't', 'oz', 'lb'],
    toBase: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349, lb: 0.453592 },
  },
  Temperature: {
    units: ['°C', '°F', 'K'],
    toBase: null, // special handling
  },
  Pressure: {
    units: ['Pa', 'kPa', 'MPa', 'bar', 'atm', 'psi'],
    toBase: { Pa: 1, kPa: 1000, MPa: 1000000, bar: 100000, atm: 101325, psi: 6894.76 },
  },
  Energy: {
    units: ['J', 'kJ', 'MJ', 'cal', 'kcal', 'kWh', 'eV'],
    toBase: { J: 1, kJ: 1000, MJ: 1000000, cal: 4.184, kcal: 4184, kWh: 3600000, eV: 1.602e-19 },
  },
  Power: {
    units: ['W', 'kW', 'MW', 'hp'],
    toBase: { W: 1, kW: 1000, MW: 1000000, hp: 745.7 },
  },
  Area: {
    units: ['mm²', 'cm²', 'm²', 'km²', 'ha', 'ft²', 'ac'],
    toBase: { 'mm²': 0.000001, 'cm²': 0.0001, 'm²': 1, 'km²': 1000000, ha: 10000, 'ft²': 0.092903, ac: 4046.86 },
  },
  Volume: {
    units: ['mL', 'L', 'm³', 'fl oz', 'gal'],
    toBase: { mL: 0.001, L: 1, 'm³': 1000, 'fl oz': 0.029574, gal: 3.78541 },
  },
}

function convertTemp(value, from, to) {
  let celsius
  if (from === '°C') celsius = value
  else if (from === '°F') celsius = (value - 32) * 5/9
  else celsius = value - 273.15
  if (to === '°C') return celsius
  if (to === '°F') return celsius * 9/5 + 32
  return celsius + 273.15
}

export default function UnitConverter({ open, onClose }) {
  const [category, setCategory] = useState('Length')
  const [value, setValue] = useState('1')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('ft')

  const cat = CATEGORIES[category]

  const convert = () => {
    const num = parseFloat(value)
    if (isNaN(num)) return '—'
    if (category === 'Temperature') return convertTemp(num, fromUnit, toUnit).toFixed(4)
    const base = num * (cat.toBase[fromUnit] || 1)
    return (base / (cat.toBase[toUnit] || 1)).toFixed(6).replace(/\.?0+$/, '')
  }

  const changeCategory = (c) => {
    setCategory(c)
    const units = CATEGORIES[c].units
    setFromUnit(units[0])
    setToUnit(units[1] || units[0])
  }

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🔄 Unit Converter" height="80vh">
      <div style={{ padding: '16px' }}>
        {/* Category selector */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
          {Object.keys(CATEGORIES).map(c => (
            <button key={c} onClick={() => changeCategory(c)}
              style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: category === c ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: category === c ? '#60a5fa' : 'var(--text3)', border: `1px solid ${category === c ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
              {c}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ width: '100%', fontSize: 32, fontWeight: 900, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', marginBottom: 10 }}
            placeholder="0"
          />
          <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', textAlign: 'center' }}>
            {cat.units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Swap */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={() => { const t = fromUnit; setFromUnit(toUnit); setToUnit(t) }}
            style={{ padding: '8px 20px', borderRadius: 20, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 14, cursor: 'pointer' }}>
            ⇅ Swap
          </button>
        </div>

        {/* Output */}
        <div style={{ background: 'var(--surface)', border: '2px solid rgba(37,99,235,0.2)', borderRadius: 16, padding: '20px' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#60a5fa', textAlign: 'center', marginBottom: 10 }}>
            {convert()}
          </div>
          <select value={toUnit} onChange={e => setToUnit(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.2)', color: 'var(--text)', outline: 'none', textAlign: 'center' }}>
            {cat.units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Formula */}
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
          {value || '0'} {fromUnit} = {convert()} {toUnit}
        </div>
      </div>
    </MobileBottomSheet>
  )
}