import { useState } from 'react'
import Navbar from '../components/Navbar'

const VISA_DATA = {
  UK: {
    flag: '🇬🇧', name: 'United Kingdom',
    visas: [
      { name: 'Graduate Route Visa', type: 'Post-Study Work', duration: '2 years (3 for PhD)', eligibility: 'Completed a UK degree', cost: '£715', allows: 'Work in any job at any skill level', url: 'https://www.gov.uk/graduate-visa' },
      { name: 'Skilled Worker Visa', type: 'Work Visa', duration: 'Up to 5 years', eligibility: 'Job offer from UK employer, salary threshold', cost: '£719–1,423', allows: 'Work for sponsoring employer', url: 'https://www.gov.uk/skilled-worker-visa' },
      { name: 'Youth Mobility Scheme', type: 'Working Holiday', duration: '2 years', eligibility: 'Age 18–30, specific countries', cost: '£259', allows: 'Live and work freely in UK', url: 'https://www.gov.uk/youth-mobility' },
    ],
    tips: ['Apply at least 3 months before you need to start', 'You must have enough money to support yourself (usually £1,270)', 'English language requirement for most visas', 'CAS number needed from employer/university'],
  },
  Germany: {
    flag: '🇩🇪', name: 'Germany',
    visas: [
      { name: 'Opportunity Card (Chancenkarte)', type: 'Job Seeker', duration: '1 year', eligibility: 'University degree, points-based system', cost: '€75', allows: 'Live in Germany and look for work', url: 'https://www.make-it-in-germany.com' },
      { name: 'Skilled Worker Visa', type: 'Work Visa', duration: '4 years', eligibility: 'Recognised qualification + job offer', cost: '€75', allows: 'Work in Germany', url: 'https://www.make-it-in-germany.com' },
      { name: 'Job Seeker Visa', type: 'Job Search', duration: '6 months', eligibility: 'Degree from home country', cost: '€75', allows: 'Search for qualified employment', url: 'https://www.make-it-in-germany.com' },
    ],
    tips: ['Germany has a shortage of skilled workers — especially in STEM, healthcare, IT', 'Many companies offer English-speaking roles in Berlin, Munich, Hamburg', 'Credential recognition (Anerkennung) may be required', 'Learning basic German significantly improves opportunities'],
  },
  Canada: {
    flag: '🇨🇦', name: 'Canada',
    visas: [
      { name: 'Express Entry', type: 'Permanent Residence', duration: 'Permanent', eligibility: 'Points-based (CRS score)', cost: 'CAD $1,365', allows: 'Live and work anywhere in Canada', url: 'https://www.canada.ca/express-entry' },
      { name: 'International Experience Canada', type: 'Working Holiday', duration: '1–2 years', eligibility: 'Age 18–35, specific countries', cost: 'CAD $150', allows: 'Work and travel in Canada', url: 'https://www.canada.ca/iec' },
      { name: 'Provincial Nominee Program', type: 'Work Visa', duration: 'Pathway to PR', eligibility: 'Skills matched to province needs', cost: 'Varies', allows: 'Work in specific province', url: 'https://www.canada.ca/pnp' },
    ],
    tips: ['Canada actively recruits skilled immigrants — tech, healthcare, trades in high demand', 'CRS score includes education, work experience, language (IELTS/CELPIP)', 'African degrees generally recognised with WES credential evaluation', 'French speakers have additional pathways through Quebec'],
  },
  UAE: {
    flag: '🇦🇪', name: 'UAE (Dubai)',
    visas: [
      { name: 'Green Visa', type: 'Self-Sponsored', duration: '5 years', eligibility: 'Skilled worker or freelancer', cost: 'AED 500–1,500', allows: 'Live and work without employer sponsorship', url: 'https://u.ae/en/information-and-services/visa-and-emirates-id' },
      { name: 'Golden Visa', type: 'Long-term Residency', duration: '10 years', eligibility: 'Exceptional talent, investor, or specialist', cost: 'AED 4,000+', allows: 'Permanent residency + family sponsorship', url: 'https://u.ae/golden-visa' },
      { name: 'Employment Visa', type: 'Work Visa', duration: '2–3 years', eligibility: 'Job offer from UAE employer', cost: 'Employer covers', allows: 'Work for sponsoring employer', url: 'https://u.ae' },
    ],
    tips: ['UAE has no income tax — salaries go further than many countries', 'Dubai and Abu Dhabi have large African professional communities', 'Many multinational companies have regional HQs in Dubai', 'Cost of living is high — negotiate salary accordingly'],
  },
  Australia: {
    flag: '🇦🇺', name: 'Australia',
    visas: [
      { name: 'Working Holiday Visa (417)', type: 'Working Holiday', duration: '1–3 years', eligibility: 'Age 18–30 (35 for some countries)', cost: 'AUD $635', allows: 'Work and travel in Australia', url: 'https://immi.homeaffairs.gov.au' },
      { name: 'Skilled Independent Visa (189)', type: 'Permanent Residence', duration: 'Permanent', eligibility: 'Points test, occupation on skilled list', cost: 'AUD $4,640', allows: 'Live and work anywhere in Australia', url: 'https://immi.homeaffairs.gov.au' },
      { name: 'Employer Nominated Scheme (186)', type: 'Work Visa', duration: 'Permanent', eligibility: 'Employer sponsorship', cost: 'AUD $4,770', allows: 'Work for nominating employer', url: 'https://immi.homeaffairs.gov.au' },
    ],
    tips: ['Australia has critical shortages in IT, healthcare, engineering, and trades', 'Regional areas offer bonus points and easier pathways', 'IELTS score of 6.0+ required for most skilled visas', 'Skills assessment from relevant authority required'],
  },
}

export default function VisaGuide() {
  const [selected, setSelected] = useState(null)
  const [from, setFrom] = useState('')

  const country = selected ? VISA_DATA[selected] : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1000, margin: '0 auto', padding: '100px 20px 80px' }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🌍 International Visa & Work Permit Guide</h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Understand your options for working abroad. Select a destination country to see available visa routes, requirements, costs, and insider tips.</p>
        </div>

        {/* Disclaimer */}
        <div style={{ marginBottom: 28, padding: '12px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b', lineHeight: 1.6 }}>
          ⚠️ This guide is for informational purposes only and reflects general information as of 2025. Immigration rules change frequently. Always verify requirements on official government websites before applying.
        </div>

        {/* Country selector */}
        {!selected ? (
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 16 }}>Select a destination country:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
              {Object.entries(VISA_DATA).map(([key, c]) => (
                <div key={key} onClick={() => setSelected(key)} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{c.flag}</div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{c.visas.length} visa routes</div>
                  <div style={{ marginTop: 12, padding: '5px 14px', borderRadius: 7, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>View Guide →</div>
                </div>
              ))}
              {/* Coming soon */}
              {['🇺🇸 USA', '🇳🇱 Netherlands', '🇸🇬 Singapore', '🇨🇭 Switzerland'].map(c => (
                <div key={c} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{c.split(' ')[0]}</div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{c.slice(3)}</div>
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 6 }}>Coming soon</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ marginBottom: 20, padding: '7px 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>← All Countries</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <span style={{ fontSize: 48 }}>{country.flag}</span>
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{country.name}</h2>
                <p style={{ color: '#64748b', fontSize: 13 }}>Work and residency visa options for international applicants</p>
              </div>
            </div>

            {/* Visa cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
              {country.visas.map((visa, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 22px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>{visa.name}</div>
                      <div style={{ fontSize: 12, color: '#60a5fa', marginTop: 2 }}>{visa.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>⏱ {visa.duration}</span>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }}>💰 {visa.cost}</span>
                    </div>
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Eligibility</div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{visa.eligibility}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Allows You To</div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{visa.allows}</div>
                      </div>
                    </div>
                    <a href={visa.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Official Application Page →</a>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 15, marginBottom: 14 }}>💡 Insider Tips for {country.name}</div>
              {country.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#2563eb', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}