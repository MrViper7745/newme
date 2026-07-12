import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS, INTERNSHIPS } from '../data/globalData'

const COUNTRY_DATA = {
  'Nigeria': { marketDesc: 'Africa\'s largest economy with a booming tech and fintech sector. Lagos is the startup capital of Africa.', avgSalary: '₦150,000 – ₦500,000/mo', topEmployers: ['Flutterwave', 'Andela', 'Paystack', 'MTN', 'Access Bank'], visaInfo: 'Nigerian citizens do not need a visa for ECOWAS countries. UK, Canada, and EU require visas.', currency: 'NGN', languages: 'English', jobBoard: 'https://jobberman.com' },
  'South Africa': { marketDesc: 'Most developed economy in Africa with strong finance, mining, and tech sectors. Cape Town is a growing tech hub.', avgSalary: 'R10,000 – R25,000/mo', topEmployers: ['MTN', 'Standard Bank', 'Naspers', 'Discovery', 'Sasol'], visaInfo: 'SA passport holders enjoy visa-free access to 100+ countries including UK and EU.', currency: 'ZAR', languages: 'English, Zulu, Xhosa + 9 more', jobBoard: 'https://pnet.co.za' },
  'Kenya': { marketDesc: 'East Africa\'s tech hub with M-Pesa pioneering mobile money. Nairobi\'s Silicon Savannah is growing rapidly.', avgSalary: 'KES 40,000 – 120,000/mo', topEmployers: ['Safaricom', 'Equity Bank', 'Andela', 'Twiga Foods', 'NCBA'], visaInfo: 'Kenya offers visa on arrival for many African countries. East African Community citizens enjoy free movement.', currency: 'KES', languages: 'English, Swahili', jobBoard: 'https://brightermonday.co.ke' },
  'Ghana': { marketDesc: 'One of Africa\'s most stable democracies with a growing tech and oil sector. Accra is emerging as a business hub.', avgSalary: 'GHS 1,500 – 5,000/mo', topEmployers: ['MTN Ghana', 'Vodafone Ghana', 'GCB Bank', 'Tullow Oil', 'Ecobank'], visaInfo: 'ECOWAS free movement applies. UK visa required for most travel to Europe.', currency: 'GHS', languages: 'English', jobBoard: 'https://jobsinghana.com' },
  'United Kingdom': { marketDesc: 'Global financial centre with London as one of the world\'s top cities for graduate careers. Strong tech, finance, and law sectors.', avgSalary: '£22,000 – £40,000/yr', topEmployers: ['HSBC', 'Deloitte', 'Goldman Sachs', 'BP', 'Google DeepMind'], visaInfo: 'Post-Brexit: international students need a Graduate Visa after studies (2 years work rights). EU citizens need visa.', currency: 'GBP', languages: 'English', jobBoard: 'https://graduate.prospects.ac.uk' },
  'Germany': { marketDesc: 'Europe\'s largest economy with world-class engineering and manufacturing. Many universities have no tuition fees. English widely accepted.', avgSalary: '€2,000 – €4,000/mo internship', topEmployers: ['Siemens', 'BMW', 'SAP', 'Deutsche Bank', 'Bosch'], visaInfo: 'EU/EEA citizens work freely. Non-EU need an Opportunity Card (Chancenkarte) or Job Seeker Visa.', currency: 'EUR', languages: 'German (English widely used)', jobBoard: 'https://stepstone.de' },
  'United States': { marketDesc: 'Largest economy globally with Silicon Valley, Wall Street, and research powerhouses. Competitive but highest-paying internships.', avgSalary: '$5,000 – $12,000/mo', topEmployers: ['Google', 'Microsoft', 'Apple', 'Goldman Sachs', 'McKinsey'], visaInfo: 'International students on F-1 visa can work via OPT/CPT. H1-B visa required for full-time after graduation.', currency: 'USD', languages: 'English', jobBoard: 'https://linkedin.com/jobs' },
  'Canada': { marketDesc: 'Welcoming immigration policies with strong tech, finance, and mining sectors. Toronto and Vancouver are major tech hubs.', avgSalary: 'CAD 3,000 – 7,000/mo', topEmployers: ['Shopify', 'RBC', 'TD Bank', 'Bombardier', 'Hootsuite'], visaInfo: 'Post-Graduation Work Permit (PGWP) for up to 3 years after graduation. Express Entry for permanent residency.', currency: 'CAD', languages: 'English, French', jobBoard: 'https://ca.indeed.com' },
  'India': { marketDesc: 'World\'s largest tech talent pool. Bangalore, Hyderabad, and Pune are massive IT hubs. Growing startup ecosystem with 100+ unicorns.', avgSalary: '₹15,000 – 60,000/mo', topEmployers: ['TCS', 'Infosys', 'Wipro', 'HCL', 'Flipkart'], visaInfo: 'OCI (Overseas Citizen of India) card provides significant benefits. Foreign students need student visa.', currency: 'INR', languages: 'English, Hindi + 20 regional languages', jobBoard: 'https://naukri.com' },
  'Singapore': { marketDesc: 'Asia\'s business gateway with no corporate tax and world-class infrastructure. Tech, finance, and logistics hub for SE Asia.', avgSalary: 'SGD 1,500 – 3,500/mo internship', topEmployers: ['DBS Bank', 'Grab', 'Sea Group', 'Singtel', 'Government agencies'], visaInfo: 'Employment Pass for graduates earning SGD 5,000+/mo. EntrePass for entrepreneurs. Friendly visa policies.', currency: 'SGD', languages: 'English, Mandarin, Malay, Tamil', jobBoard: 'https://jobscentral.com.sg' },
  'Australia': { marketDesc: 'Strong economy with mining, finance, and a booming tech scene. Melbourne and Sydney are top grad destinations.', avgSalary: 'AUD 3,500 – 6,000/mo', topEmployers: ['BHP', 'Atlassian', 'Commonwealth Bank', 'Deloitte', 'Macquarie'], visaInfo: 'Post-Study Work Visa: 2-4 years after graduation depending on degree level. Working Holiday Visa for ages 18-35.', currency: 'AUD', languages: 'English', jobBoard: 'https://seek.com.au' },
}

export default function Countries() {
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [search, setSearch] = useState('')

  const countryInfo = selectedCountry ? COUNTRY_DATA[selectedCountry] : null
  const regionListings = selectedCountry ? INTERNSHIPS.filter(i => i.country === selectedCountry) : []

  const allCountries = WORLD_REGIONS.flatMap(r => r.countries.map(c => ({ country: c, region: r })))
  const filtered = allCountries.filter(({ country, region }) => {
    const matchRegion = selectedRegion === 'all' || region.id === selectedRegion
    const matchSearch = country.toLowerCase().includes(search.toLowerCase())
    return matchRegion && matchSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🌍 Country Career Guides</h1>
        <p style={{ color: '#64748b', marginBottom: 28 }}>Explore job markets, salaries, and opportunities in 120+ countries</p>

        {!selectedCountry ? (
          <>
            <input type="text" placeholder="🔍  Search countries..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '13px 18px', borderRadius: 10, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
                <button key={r.id} onClick={() => setSelectedRegion(r.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: selectedRegion === r.id ? r.color : 'var(--surface)',
                  color: selectedRegion === r.id ? '#fff' : '#94a3b8',
                  border: `1px solid ${selectedRegion === r.id ? r.color : 'var(--border)'}`,
                }}>{r.flag} {r.name}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {filtered.map(({ country, region }) => {
                const hasGuide = !!COUNTRY_DATA[country]
                const listingCount = INTERNSHIPS.filter(i => i.country === country).length
                return (
                  <div key={country} onClick={() => hasGuide && setSelectedCountry(country)}
                    className={hasGuide ? 'card-glow' : ''}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: 14, cursor: hasGuide ? 'pointer' : 'default',
                      opacity: hasGuide ? 1 : 0.5,
                    }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{region.flag}</div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, marginBottom: 4 }}>{country}</div>
                    {hasGuide && <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>📖 Full guide</div>}
                    {listingCount > 0 && <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>{listingCount} listing{listingCount > 1 ? 's' : ''}</div>}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 20, fontSize: 12, color: '#374151', textAlign: 'center' }}>
              Full guides available for highlighted countries. More guides coming soon!
            </div>
          </>
        ) : (
          <div>
            <button onClick={() => setSelectedCountry(null)} style={{ marginBottom: 24, padding: '8px 18px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              ← Back to Countries
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Overview */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>
                  {WORLD_REGIONS.find(r => r.countries.includes(selectedCountry))?.flag}
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>{selectedCountry}</h2>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>{countryInfo.marketDesc}</p>
              </div>

              {/* Stats */}
              {[
                { label: 'Average Salary', value: countryInfo.avgSalary, icon: '💰', color: '#10b981' },
                { label: 'Currency', value: countryInfo.currency, icon: '💱', color: '#2563eb' },
                { label: 'Languages', value: countryInfo.languages, icon: '🗣️', color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
                </div>
              ))}

              {/* Top Employers */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>🏢 Top Employers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {countryInfo.topEmployers.map(e => (
                    <div key={e} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 13, color: '#e2e8f0' }}>{e}</div>
                  ))}
                </div>
              </div>

              {/* Visa Info */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>✈️ Visa & Work Rights</div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{countryInfo.visaInfo}</p>
                <a href={countryInfo.jobBoard} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14, padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                  Browse Jobs in {selectedCountry} →
                </a>
              </div>

              {/* Listings from EduLink */}
              {regionListings.length > 0 && (
                <div style={{ gridColumn: '1 / -1', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>💼 EduLink Listings in {selectedCountry}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {regionListings.map(job => (
                      <Link href="/internships" key={job.id} style={{ textDecoration: 'none' }}>
                        <div className="card-glow" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 22, marginBottom: 8 }}>{job.logo}</div>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{job.title}</div>
                          <div style={{ color: '#60a5fa', fontSize: 12 }}>{job.company}</div>
                          <div style={{ color: '#10b981', fontSize: 11, marginTop: 4 }}>{job.salary}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}