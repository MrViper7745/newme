import { useState } from 'react'
import Navbar from '../components/Navbar'

const CITY_DATA = {
  'London, UK': { rent: 1200, food: 350, transport: 150, utilities: 80, entertainment: 100, misc: 100, currency: 'GBP', symbol: '£', avg_salary: 2200 },
  'Berlin, Germany': { rent: 900, food: 280, transport: 90, utilities: 70, entertainment: 80, misc: 80, currency: 'EUR', symbol: '€', avg_salary: 1900 },
  'Toronto, Canada': { rent: 1400, food: 400, transport: 140, utilities: 100, entertainment: 120, misc: 100, currency: 'CAD', symbol: 'CAD $', avg_salary: 2400 },
  'Sydney, Australia': { rent: 1600, food: 420, transport: 160, utilities: 110, entertainment: 130, misc: 110, currency: 'AUD', symbol: 'AUD $', avg_salary: 2800 },
  'Dubai, UAE': { rent: 1100, food: 300, transport: 100, utilities: 120, entertainment: 150, misc: 100, currency: 'AED', symbol: 'AED ', avg_salary: 3000 },
  'Johannesburg, SA': { rent: 6000, food: 3000, transport: 1500, utilities: 800, entertainment: 1000, misc: 800, currency: 'ZAR', symbol: 'R', avg_salary: 18000 },
  'Lagos, Nigeria': { rent: 120000, food: 60000, transport: 25000, utilities: 20000, entertainment: 20000, misc: 15000, currency: 'NGN', symbol: '₦', avg_salary: 200000 },
  'Nairobi, Kenya': { rent: 35000, food: 20000, transport: 8000, utilities: 5000, entertainment: 6000, misc: 4000, currency: 'KES', symbol: 'KES ', avg_salary: 80000 },
  'New York, USA': { rent: 2200, food: 500, transport: 130, utilities: 120, entertainment: 150, misc: 120, currency: 'USD', symbol: '$', avg_salary: 3500 },
  'Amsterdam, Netherlands': { rent: 1400, food: 320, transport: 90, utilities: 80, entertainment: 100, misc: 80, currency: 'EUR', symbol: '€', avg_salary: 2200 },
}

const CATEGORIES = ['rent', 'food', 'transport', 'utilities', 'entertainment', 'misc']
const CAT_LABELS = { rent: '🏠 Rent/Accommodation', food: '🍽️ Food & Groceries', transport: '🚌 Transport', utilities: '💡 Utilities & Phone', entertainment: '🎭 Entertainment & Social', misc: '🛒 Miscellaneous' }
const CAT_COLORS = { rent: '#2563eb', food: '#10b981', transport: '#f59e0b', utilities: '#8b5cf6', entertainment: '#ef4444', misc: '#06b6d4' }

export default function Budget() {
  const [city, setCity] = useState('London, UK')
  const [custom, setCustom] = useState({})
  const [income, setIncome] = useState('')
  const [savings, setSavings] = useState('')

  const cityData = CITY_DATA[city]
  const budget = { ...cityData, ...custom }
  const total = CATEGORIES.reduce((s, c) => s + (parseFloat(custom[c] || cityData[c]) || 0), 0)
  const incomeNum = parseFloat(income) || 0
  const savingsNum = parseFloat(savings) || 0
  const totalNeeded = total + savingsNum
  const surplus = incomeNum - total
  const months = savingsNum > 0 ? Math.ceil(savingsNum / Math.max(surplus, 1)) : 0

  const updateCustom = (cat, val) => setCustom(p => ({ ...p, [cat]: val }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>💰 Study & Work Abroad Budget Calculator</h1>
          <p style={{ color: '#64748b' }}>Calculate realistic living costs in major cities. Adjust any figure to match your lifestyle.</p>
        </div>

        {/* City selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Select City</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.keys(CITY_DATA).map(c => (
              <button key={c} onClick={() => { setCity(c); setCustom({}) }} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: city === c ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: city === c ? '#60a5fa' : '#64748b', border: `1px solid ${city === c ? '#2563eb' : 'var(--border)'}`, whiteSpace: 'nowrap' }}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* Budget breakdown */}
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>Monthly Expenses — {city}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Based on average costs. Adjust any field to match your situation.</div>
              {CATEGORIES.map(cat => {
                const val = parseFloat(custom[cat] || cityData[cat]) || 0
                const pct = total > 0 ? Math.round((val / total) * 100) : 0
                return (
                  <div key={cat} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{CAT_LABELS[cat]}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{pct}%</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{cityData.symbol}</span>
                          <input type="number" value={custom[cat] !== undefined ? custom[cat] : cityData[cat]} onChange={e => updateCustom(cat, e.target.value)} style={{ width: 90, padding: '5px 8px', borderRadius: 7, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', textAlign: 'right' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[cat], borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>Total Monthly</span>
                <span style={{ fontWeight: 900, color: '#60a5fa', fontSize: 22 }}>{cityData.symbol}{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Comparison bar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>📊 Expense Breakdown</div>
              {CATEGORIES.map(cat => {
                const val = parseFloat(custom[cat] || cityData[cat]) || 0
                const pct = total > 0 ? Math.round((val / total) * 100) : 0
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: CAT_COLORS[cat], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>{CAT_LABELS[cat].slice(3)}</div>
                    <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>{cityData.symbol}{(parseFloat(custom[cat] || cityData[cat]) || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#374151', width: 32, textAlign: 'right' }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Income */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>💼 Income & Savings</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Monthly Income ({cityData.symbol})</label>
                <input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder={`e.g. ${cityData.avg_salary.toLocaleString()}`} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>Average internship: {cityData.symbol}{cityData.avg_salary.toLocaleString()}/mo</div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Monthly Savings Target ({cityData.symbol})</label>
                <input type="number" value={savings} onChange={e => setSavings(e.target.value)} placeholder="0" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--surface)', border: `1px solid ${surplus >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 16 }}>📈 Monthly Summary</div>
              {[
                { l: 'Total Expenses', v: `${cityData.symbol}${total.toLocaleString()}`, c: '#ef4444' },
                ...(incomeNum ? [{ l: 'Monthly Income', v: `${cityData.symbol}${incomeNum.toLocaleString()}`, c: '#10b981' }] : []),
                ...(incomeNum ? [{ l: surplus >= 0 ? '✅ Monthly Surplus' : '⚠️ Monthly Shortfall', v: `${cityData.symbol}${Math.abs(surplus).toLocaleString()}`, c: surplus >= 0 ? '#10b981' : '#ef4444' }] : []),
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{s.l}</span>
                  <span style={{ fontWeight: 700, color: s.c, fontSize: 14 }}>{s.v}</span>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginBottom: 10 }}>💡 Budget Tips for {city.split(',')[0]}</div>
              {[
                city.includes('London') && 'Use an Oyster card — monthly caps save money on zones 1-2',
                city.includes('Berlin') && 'Get a monthly BVG transport pass — worth it vs single tickets',
                city.includes('Dubai') && 'No income tax in UAE — your net salary is your gross salary',
                city.includes('Toronto') || city.includes('Sydney') ? 'Cook at home — eating out adds up fast in this city' : null,
                city.includes('Lagos') && 'Negotiate rent in USD if possible — protects against naira depreciation',
                city.includes('Nairobi') && 'M-Pesa is essential — use it for everything to track spending',
                'Cook at home 5 days a week — saves 40-60% on food costs',
                'Use student discounts everywhere — always ask, always carry your student card',
                `Aim to save at least 20% of your ${cityData.symbol}${cityData.avg_salary.toLocaleString()} average monthly income`,
              ].filter(Boolean).slice(0, 4).map((tip, i) => (
                <div key={i} style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', lineHeight: 1.5 }}>→ {tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}