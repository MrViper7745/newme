import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS } from '../data/globalData'

const SCHOLARSHIPS = [
  { id:1, name:'Commonwealth Scholarship', org:'Commonwealth Scholarship Commission', region:'africa,asia,oceania', countries:'50+ Commonwealth nations', value:'Full funding incl. flights & stipend', deadline:'2025-12-01', level:'Postgraduate', field:'All Fields', flag:'🇬🇧', desc:'Fully funded masters & PhD scholarships for students from Commonwealth countries to study in the UK.', url:'#', tag:'Fully Funded' },
  { id:2, name:'Erasmus+ Scholarship', org:'European Commission', region:'europe', countries:'EU & partner countries', value:'€1,000/month + travel', deadline:'2026-02-01', level:'Undergraduate & Postgraduate', field:'All Fields', flag:'🇪🇺', desc:'Study or intern in another European country. One of the most prestigious exchange programs in the world.', url:'#', tag:'Partial Funding' },
  { id:3, name:'Fulbright Scholarship', org:'US State Department', region:'all', countries:'160+ countries', value:'Full funding incl. tuition & living', deadline:'2025-10-01', level:'Postgraduate', field:'All Fields', flag:'🇺🇸', desc:'Study in the USA with full funding. One of the world\'s most competitive and prestigious scholarships.', url:'#', tag:'Fully Funded' },
  { id:4, name:'DAAD Scholarship', org:'German Academic Exchange', region:'all', countries:'All countries', value:'€934/month + fees', deadline:'2025-11-15', level:'Postgraduate & PhD', field:'All Fields', flag:'🇩🇪', desc:'Study in Germany in English or German. Germany charges no tuition at public universities.', url:'#', tag:'Fully Funded' },
  { id:5, name:'MasterCard Foundation Scholars', org:'MasterCard Foundation', region:'africa', countries:'African countries', value:'Full funding', deadline:'2025-09-30', level:'Undergraduate', field:'All Fields', flag:'🌍', desc:'Full scholarships for academically talented but economically disadvantaged African students.', url:'#', tag:'Fully Funded' },
  { id:6, name:'African Union Scholarship', org:'African Union Commission', region:'africa', countries:'54 African countries', value:'Full funding', deadline:'2025-08-15', level:'Postgraduate', field:'STEM & Social Sciences', flag:'🌍', desc:'Pan-African scholarship supporting intra-African student mobility across member states.', url:'#', tag:'Fully Funded' },
  { id:7, name:'Chevening Scholarship', org:'UK Government', region:'all', countries:'160+ countries', value:'Full funding incl. flights', deadline:'2025-11-05', level:'Masters', field:'All Fields', flag:'🇬🇧', desc:'UK government flagship scholarship for future global leaders. Fully funded one-year masters.', url:'#', tag:'Fully Funded' },
  { id:8, name:'Gates Cambridge Scholarship', org:'Gates Foundation', region:'all', countries:'All countries outside UK', value:'Full funding at Cambridge', deadline:'2025-12-04', level:'Postgraduate', field:'All Fields', flag:'🇬🇧', desc:'Study at the University of Cambridge with full funding. Extremely competitive, for exceptional students.', url:'#', tag:'Fully Funded' },
  { id:9, name:'Japanese Government (MEXT)', org:'Ministry of Education Japan', region:'all', countries:'All countries', value:'Full funding + stipend', deadline:'2025-05-30', level:'All Levels', field:'All Fields', flag:'🇯🇵', desc:'Study in Japan fully funded by the Japanese government. Covers tuition, accommodation and living.', url:'#', tag:'Fully Funded' },
  { id:10, name:'Korea Government Scholarship (GKS)', org:'Korean Government', region:'all', countries:'All countries', value:'Full funding + KRW 900,000/mo', deadline:'2025-09-10', level:'Undergraduate & Postgraduate', field:'All Fields', flag:'🇰🇷', desc:'Study in South Korea fully funded. Includes Korean language training before your degree starts.', url:'#', tag:'Fully Funded' },
  { id:11, name:'Chinese Government Scholarship (CSC)', org:'Ministry of Education China', region:'all', countries:'All countries', value:'Full funding', deadline:'2025-04-30', level:'All Levels', field:'All Fields', flag:'🇨🇳', desc:'Study in China with full scholarship covering tuition, accommodation, and monthly stipend.', url:'#', tag:'Fully Funded' },
  { id:12, name:'Aga Khan Foundation Scholarship', org:'Aga Khan Foundation', region:'africa,asia', countries:'Selected developing countries', value:'50% grant + 50% loan', deadline:'2025-06-30', level:'Postgraduate', field:'All Fields', flag:'🌍', desc:'For outstanding students from developing countries with limited financial means.', url:'#', tag:'Partial Funding' },
]

const LEVELS = ['All Levels', 'Undergraduate', 'Masters', 'Postgraduate', 'PhD', 'All Levels']
const TAGS = ['All', 'Fully Funded', 'Partial Funding']

export default function Scholarships() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [tag, setTag] = useState('All')
  const [saved, setSaved] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  const filtered = SCHOLARSHIPS.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = s.name.toLowerCase().includes(q) || s.org.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    const matchRegion = region === 'all' || s.region.includes(region) || s.region === 'all'
    const matchTag = tag === 'All' || s.tag === tag
    return matchSearch && matchRegion && matchTag
  })

  const toggleSave = (id, name) => {
    setSaved(prev => {
      const isSaved = prev.includes(id)
      showToast(isSaved ? `Removed: ${name}` : `Saved: ${name}!`)
      return isSaved ? prev.filter(s => s !== id) : [...prev, id]
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🎓 Global Scholarships</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>{SCHOLARSHIPS.length} scholarships from governments and foundations worldwide</p>
        </div>

        <input type="text" placeholder="🔍  Search scholarships by name, country, or field..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '13px 18px', borderRadius: 10, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 16 }} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: region === r.id ? r.color : 'var(--surface)',
              color: region === r.id ? '#fff' : '#94a3b8',
              border: `1px solid ${region === r.id ? r.color : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setTag(t)} style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: tag === t ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
              color: tag === t ? '#10b981' : '#64748b',
              border: `1px solid ${tag === t ? '#10b981' : 'var(--border)'}`,
            }}>{t === 'Fully Funded' ? '🏆 ' : t === 'Partial Funding' ? '💛 ' : ''}{t}</button>
          ))}
        </div>

        <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b' }}>
          Showing <strong style={{ color: '#60a5fa' }}>{filtered.length}</strong> scholarships
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
          {filtered.map(s => (
            <div key={s.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{s.flag}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                    background: s.tag === 'Fully Funded' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: s.tag === 'Fully Funded' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${s.tag === 'Fully Funded' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  }}>{s.tag === 'Fully Funded' ? '🏆 ' : '💛 '}{s.tag}</span>
                  <button onClick={() => toggleSave(s.id, s.name)} style={{
                    background: saved.includes(s.id) ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${saved.includes(s.id) ? '#f59e0b' : 'var(--border)'}`,
                    borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                    color: saved.includes(s.id) ? '#f59e0b' : '#64748b', fontSize: 12,
                  }}>{saved.includes(s.id) ? '★' : '☆'}</button>
                </div>
              </div>

              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 3 }}>{s.name}</div>
              <div style={{ color: '#60a5fa', fontSize: 12, marginBottom: 8 }}>{s.org}</div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>{s.desc}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: '💰 Value', value: s.value },
                  { label: '📅 Deadline', value: s.deadline },
                  { label: '🎓 Level', value: s.level },
                  { label: '🌍 Countries', value: s.countries },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <a href={s.url} style={{
                display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8,
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}>Apply Now →</a>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <div>No scholarships found. Try different filters.</div>
            <button onClick={() => { setSearch(''); setRegion('all'); setTag('All') }}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', cursor: 'pointer', fontSize: 13 }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}