// pages/mobile/MobileFinancialAid.js
import { useState } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'

const AIDS = [
  { name: 'NSFAS', desc: 'National Student Financial Aid Scheme', url: 'https://www.nsfas.org.za', icon: '🎓', status: 'Open' },
  { name: 'Funza Lushaka', desc: 'Teaching bursary for education students', url: 'https://www.funzalushaka.doe.gov.za', icon: '📚', status: 'Check dates' },
  { name: 'ISFAP', desc: 'Ikusasa Student Financial Aid Programme', url: 'https://isfap.co.za', icon: '💰', status: 'Open' },
  { name: 'Sasol', desc: 'Engineering and Science bursaries', url: 'https://www.sasol.com/careers', icon: '⚡', status: 'Annual' },
  { name: 'ESKOM', desc: 'Engineering bursaries', url: 'https://www.eskom.co.za', icon: '🔌', status: 'Annual' },
  { name: 'Standard Bank', desc: 'Banking and finance bursaries', url: 'https://www.standardbank.co.za', icon: '🏦', status: 'Annual' },
]

export default function MobileFinancialAid() {
  const [search, setSearch] = useState('')
  const filtered = AIDS.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))

  return (
    <MobileLayout title="💰 Financial Aid">
      <div style={{ padding: '12px 16px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bursaries and aid..."
          style={{ width: '100%', padding: '10px 13px', borderRadius: 12, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', marginBottom: 16 }} />
        {filtered.map(aid => (
          <div key={aid.name} onClick={() => window.open(aid.url, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10, cursor: 'pointer' }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{aid.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{aid.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{aid.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>{aid.status}</div>
              <div style={{ fontSize: 11, color: '#60a5fa' }}>Apply ↗</div>
            </div>
          </div>
        ))}
      </div>
    </MobileLayout>
  )
}