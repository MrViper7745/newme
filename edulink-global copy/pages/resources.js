import { useState } from 'react'
import Navbar from '../components/Navbar'
import { RESOURCES, WORLD_REGIONS } from '../data/globalData'

const TYPES = ['All Types','Past Papers','Tutorial','Notes','Study Notes','Academic Guide']

export default function Resources() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All Types')
  const [region, setRegion] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  const filtered = RESOURCES.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)
    const matchType = type === 'All Types' || r.type === type
    const matchRegion = region === 'all' || r.region === 'all' || r.region === region
    return matchSearch && matchType && matchRegion
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop:100, maxWidth:1100, margin:'0 auto', padding:'100px 24px 80px' }}>
        <h1 style={{ fontSize:34, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>Academic Resources</h1>
        <p style={{ color:'#64748b', marginBottom:28 }}>Past papers, notes, and tutorials from institutions worldwide</p>

        <input type="text" placeholder="🔍  Search resources..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'13px 18px', borderRadius:10, fontSize:14, background:'var(--surface)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none', marginBottom:16 }} />

        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:12 }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background: type === t ? '#2563eb' : 'var(--surface)',
              color: type === t ? '#fff' : '#94a3b8',
              border: `1px solid ${type === t ? '#2563eb' : 'var(--border)'}`,
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:28 }}>
          {[{ id:'all', name:'All Regions', flag:'🌐' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)} style={{
              padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
              background: region === r.id ? 'rgba(6,182,212,0.15)' : 'var(--surface)',
              color: region === r.id ? '#06b6d4' : '#64748b',
              border: `1px solid ${region === r.id ? '#06b6d4' : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
          {filtered.map(res => (
            <div key={res.id} className="card-glow" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:22 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{res.icon}</div>
              <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, marginBottom:4 }}>{res.title}</div>
              <div style={{ color:'#60a5fa', fontSize:12, marginBottom:12 }}>{res.subject}</div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                <span style={{ fontSize:10, padding:'2px 9px', borderRadius:5, background:'rgba(37,99,235,0.12)', color:'#60a5fa', border:'1px solid rgba(37,99,235,0.2)' }}>{res.type}</span>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:11, color:'#64748b' }}>⬇ {res.downloads.toLocaleString()} downloads</span>
                <span style={{ fontSize:11, color:'#f59e0b' }}>{'★'.repeat(Math.floor(res.rating))} {res.rating}</span>
              </div>

              <button onClick={() => showToast(`Downloading "${res.title}"...`)}
                style={{ width:'100%', padding:'9px', borderRadius:8, background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Download Resource
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📚</div>
            <div>No resources found. Try different search terms.</div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}