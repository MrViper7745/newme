import { useState } from 'react'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS } from '../data/globalData'

const EMPLOYERS = [
  { id:1, name:'Flutterwave', country:'Nigeria', region:'africa', flag:'🇳🇬', industry:'Fintech', size:'500-1000', logo:'🏦', openings:3, desc:'Africa\'s leading B2B payments infrastructure company.', verified:true },
  { id:2, name:'Andela', country:'Kenya', region:'africa', flag:'🇰🇪', industry:'Tech', size:'1000+', logo:'💻', openings:5, desc:'Connecting brilliant technologists to global opportunities.', verified:true },
  { id:3, name:'Spotify', country:'Sweden', region:'europe', flag:'🇸🇪', industry:'Tech/Music', size:'10000+', logo:'🎵', openings:12, desc:'Audio streaming service with 600M+ users worldwide.', verified:true },
  { id:4, name:'Grab', country:'Singapore', region:'asia', flag:'🇸🇬', industry:'Super App', size:'10000+', logo:'🚗', openings:8, desc:'Southeast Asia\'s leading ride-hailing and super app platform.', verified:true },
  { id:5, name:'Nubank', country:'Brazil', region:'americas', flag:'🇧🇷', industry:'Fintech', size:'5000+', logo:'💳', openings:6, desc:'Latin America\'s largest digital bank with 90M+ customers.', verified:true },
  { id:6, name:'Careem', country:'UAE', region:'middle-east', flag:'🇦🇪', industry:'Tech', size:'5000+', logo:'🚕', openings:4, desc:'MENA\'s leading ride-sharing and delivery super-app.', verified:true },
  { id:7, name:'Atlassian', country:'Australia', region:'oceania', flag:'🇦🇺', industry:'Software', size:'10000+', logo:'🦘', openings:9, desc:'Collaboration software used by millions of teams globally.', verified:true },
  { id:8, name:'Siemens', country:'Germany', region:'europe', flag:'🇩🇪', industry:'Engineering', size:'300000+', logo:'⚙️', openings:15, desc:'Global industrial manufacturing and digital infrastructure giant.', verified:true },
]

export default function Employers() {
  const [region, setRegion] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2300) }

  const filtered = EMPLOYERS.filter(e => region === 'all' || e.region === region)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(6,182,212,0.08))', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 20, padding: '40px 32px', marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏢</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>Global Employer Partners</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 560, margin: '0 auto 24px' }}>
            Companies from 6 regions actively recruiting EduLink Global students for internships and graduate roles.
          </p>
          <button onClick={() => showToast('📧 Employer registration coming soon! Email us at employers@edulink.global')} style={{
            padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>
            Register as Employer →
          </button>
        </div>

        {/* Region filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: region === r.id ? r.color : 'var(--surface)',
              color: region === r.id ? '#fff' : '#94a3b8',
              border: `1px solid ${region === r.id ? r.color : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 }}>
          {filtered.map(emp => (
            <div key={emp.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 36 }}>{emp.logo}</span>
                {emp.verified && (
                  <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.25)', fontWeight: 700 }}>✓ Verified</span>
                )}
              </div>

              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 2 }}>{emp.name}</div>
              <div style={{ color: '#60a5fa', fontSize: 12, marginBottom: 4 }}>{emp.flag} {emp.country} · {emp.industry}</div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>{emp.desc}</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {emp.openings} openings
                </span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid var(--border)' }}>
                  👥 {emp.size}
                </span>
              </div>

              <button onClick={() => showToast(`Viewing ${emp.name}'s internships...`)} style={{
                width: '100%', padding: '9px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>View Internships →</button>
            </div>
          ))}
        </div>

        {/* CTA for more employers */}
        <div style={{ marginTop: 48, textAlign: 'center', padding: '36px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🤝</div>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>Are you a company or startup?</div>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 440, margin: '0 auto 20px' }}>
            Post internship opportunities and connect with talented students from 120+ countries.
          </p>
          <button onClick={() => showToast('📧 Contact: employers@edulink.global')} style={{
            padding: '11px 26px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>
            Partner With Us
          </button>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}