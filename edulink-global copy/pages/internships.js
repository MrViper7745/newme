import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { INTERNSHIPS, WORLD_REGIONS, FIELDS } from '../data/globalData'

export default function Internships() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [field, setField] = useState('All Fields')
  const [saved, setSaved] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const toggleSave = (id, title) => {
    setSaved(prev => {
      const isSaved = prev.includes(id)
      showToast(isSaved ? `Removed: ${title}` : `Saved: ${title}!`)
      return isSaved ? prev.filter(s => s !== id) : [...prev, id]
    })
  }

  const filtered = INTERNSHIPS.filter(job => {
    const q = search.toLowerCase()
    const matchSearch = job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.location.toLowerCase().includes(q)
    const matchRegion = region === 'all' || job.region === region
    const matchField = field === 'All Fields' || job.field === field
    return matchSearch && matchRegion && matchField
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop:100, maxWidth:1100, margin:'0 auto', padding:'100px 24px 80px' }}>
        <h1 style={{ fontSize:34, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>Global Internships & Jobs</h1>
        <p style={{ color:'#64748b', marginBottom:28 }}>{INTERNSHIPS.length} opportunities across {WORLD_REGIONS.length} regions</p>

        <input type="text" placeholder="🔍  Search by title, company, or city..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'13px 18px', borderRadius:10, fontSize:14, background:'var(--surface)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none', marginBottom:16 }} />

        {/* Region filters */}
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:12 }}>
          {[{ id:'all', name:'All Regions', flag:'🌐', color:'#2563eb' }, ...WORLD_REGIONS].map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)} style={{
              padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background: region === r.id ? r.color : 'var(--surface)',
              color: region === r.id ? '#fff' : '#94a3b8',
              border: `1px solid ${region === r.id ? r.color : 'var(--border)'}`,
            }}>{r.flag} {r.name}</button>
          ))}
        </div>

        {/* Field filters */}
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:28 }}>
          {FIELDS.map(f => (
            <button key={f} onClick={() => setField(f)} style={{
              padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
              background: field === f ? 'rgba(6,182,212,0.15)' : 'var(--surface)',
              color: field === f ? '#06b6d4' : '#64748b',
              border: `1px solid ${field === f ? '#06b6d4' : 'var(--border)'}`,
            }}>{f}</button>
          ))}
        </div>

        <div style={{ marginBottom:16, fontSize:13, color:'#64748b' }}>
          Showing <strong style={{ color:'#60a5fa' }}>{filtered.length}</strong> opportunities
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 }}>
          {filtered.map(job => {
            const regionInfo = WORLD_REGIONS.find(r => r.id === job.region)
            return (
              <div key={job.id} className="card-glow" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <span style={{ fontSize:30 }}>{job.logo}</span>
                  <button onClick={() => toggleSave(job.id, job.title)} style={{
                    background: saved.includes(job.id) ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${saved.includes(job.id) ? '#f59e0b' : 'var(--border)'}`,
                    borderRadius:8, padding:'5px 12px', cursor:'pointer',
                    color: saved.includes(job.id) ? '#f59e0b' : '#64748b', fontSize:12, fontWeight:600,
                  }}>{saved.includes(job.id) ? '★ Saved' : '☆ Save'}</button>
                </div>

                <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:15, marginBottom:3 }}>{job.title}</div>
                <div style={{ color:'#60a5fa', fontSize:13, marginBottom:2 }}>{job.company}</div>
                <div style={{ color:'#64748b', fontSize:12, marginBottom:4 }}>📍 {job.location}</div>
                <div style={{ fontSize:12, color:'#10b981', marginBottom:12 }}>💰 {job.salary}</div>

                <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5, marginBottom:14 }}>{job.description}</p>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                  <span style={{ fontSize:10, padding:'2px 9px', borderRadius:5, background:'rgba(37,99,235,0.12)', color:'#60a5fa', border:'1px solid rgba(37,99,235,0.2)' }}>{job.field}</span>
                  <span style={{ fontSize:10, padding:'2px 9px', borderRadius:5, background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)' }}>{job.type}</span>
                  {regionInfo && <span style={{ fontSize:10, padding:'2px 9px', borderRadius:5, background:`${regionInfo.color}18`, color:regionInfo.color, border:`1px solid ${regionInfo.color}30` }}>{regionInfo.flag} {regionInfo.name}</span>}
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#64748b' }}>Deadline: {job.deadline}</span>
                  <button style={{ padding:'7px 16px', borderRadius:8, background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                    Apply Now
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:16 }}>No internships found. Try a different search or filter.</div>
            <button onClick={() => { setSearch(''); setRegion('all'); setField('All Fields') }}
              style={{ marginTop:16, padding:'8px 20px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'#60a5fa', cursor:'pointer', fontSize:13 }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}