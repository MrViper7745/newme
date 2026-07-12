import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS, INTERNSHIPS } from '../data/globalData'

export default function Home() {
  const [activeRegion, setActiveRegion] = useState(null)
  const [count, setCount] = useState({ students: 0, internships: 0, countries: 0 })

  useEffect(() => {
    const targets = { students: 48200, internships: 3700, countries: 120 }
    let step = 0
    const timer = setInterval(() => {
      step++
      const p = step / 60
      const e = 1 - Math.pow(1 - p, 3)
      setCount({
        students: Math.round(targets.students * e),
        internships: Math.round(targets.internships * e),
        countries: Math.round(targets.countries * e),
      })
      if (step >= 60) clearInterval(timer)
    }, 33)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />

      {/* HERO */}
      <section style={{ paddingTop:130, paddingBottom:80, maxWidth:1100, margin:'0 auto', padding:'130px 24px 80px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(37,99,235,0.12)', border:'1px solid rgba(37,99,235,0.3)', borderRadius:999, padding:'6px 16px', marginBottom:32, fontSize:13, color:'#93c5fd', fontWeight:600 }}>
          🌐 Connecting Students Worldwide — 120+ Countries
        </div>

        <h1 style={{ fontSize:'clamp(2rem,6vw,3.8rem)', fontWeight:800, lineHeight:1.15, color:'#f1f5f9', marginBottom:24, letterSpacing:'-0.02em' }}>
          Your Global Gateway to{' '}
          <span className="gradient-text">Academic Success</span>
          {' & '}
          <span className="gradient-text">Career Opportunities</span>
        </h1>

        <p style={{ fontSize:18, color:'#94a3b8', maxWidth:640, margin:'0 auto 40px', lineHeight:1.7 }}>
          EduLink Global connects students from every corner of the world — Africa, Asia, Europe, the Americas, and beyond — with resources, internships, and employers.
        </p>

        <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/register" style={{ padding:'14px 32px', borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'#fff', fontWeight:700, fontSize:16, textDecoration:'none', boxShadow:'0 8px 32px rgba(37,99,235,0.35)' }}>
            Get Started Free →
          </Link>
          <Link href="/internships" style={{ padding:'14px 32px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', color:'#e2e8f0', fontWeight:600, fontSize:16, textDecoration:'none' }}>
            Browse Internships
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, maxWidth:520, margin:'60px auto 0' }}>
          {[
            { label:'Students Worldwide', value:count.students.toLocaleString()+'+' },
            { label:'Internship Listings', value:count.internships.toLocaleString()+'+' },
            { label:'Countries Covered', value:count.countries+'+' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:30, fontWeight:800, color:'#60a5fa' }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* REGIONS */}
      <section style={{ padding:'60px 24px', maxWidth:1100, margin:'0 auto' }}>
        <h2 style={{ textAlign:'center', fontSize:30, fontWeight:700, color:'#f1f5f9', marginBottom:10 }}>Explore by Region</h2>
        <p style={{ textAlign:'center', color:'#64748b', marginBottom:40 }}>Click a region to see countries and opportunities</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:18 }}>
          {WORLD_REGIONS.map(region => (
            <div key={region.id}
              onClick={() => setActiveRegion(activeRegion === region.id ? null : region.id)}
              style={{
                background: activeRegion === region.id ? `${region.color}18` : 'var(--surface)',
                border: `1px solid ${activeRegion === region.id ? region.color : 'var(--border)'}`,
                borderRadius:14, padding:20, cursor:'pointer', transition:'all 0.3s'
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <span style={{ fontSize:28 }}>{region.flag}</span>
                <div>
                  <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:16 }}>{region.name}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{region.countries.length} countries</div>
                </div>
                <div style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:999, background:`${region.color}20`, color:region.color, fontSize:11, fontWeight:600, border:`1px solid ${region.color}40` }}>
                  {INTERNSHIPS.filter(i => i.region === region.id).length} listings
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {region.hubs.slice(0,4).map(hub => (
                  <span key={hub} style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:'rgba(255,255,255,0.04)', color:'#64748b', border:'1px solid var(--border)' }}>📍{hub}</span>
                ))}
              </div>

              {activeRegion === region.id && (
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:12 }}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>Countries we serve:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:14 }}>
                    {region.countries.map(c => (
                      <span key={c} style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'rgba(255,255,255,0.03)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.06)' }}>{c}</span>
                    ))}
                  </div>
                  <Link href={`/internships?region=${region.id}`} style={{ display:'inline-block', padding:'7px 16px', borderRadius:8, background:region.color, color:'#fff', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                    View {region.name} Internships →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ padding:'20px 24px 80px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:'#f1f5f9' }}>Featured Opportunities</h2>
          <Link href="/internships" style={{ padding:'7px 18px', borderRadius:8, border:'1px solid var(--border)', color:'#60a5fa', textDecoration:'none', fontSize:13, fontWeight:600 }}>View All →</Link>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:16 }}>
          {INTERNSHIPS.slice(0,4).map(job => (
            <div key={job.id} className="card-glow" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:26, marginBottom:10 }}>{job.logo}</div>
              <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, marginBottom:3 }}>{job.title}</div>
              <div style={{ color:'#60a5fa', fontSize:13, marginBottom:3 }}>{job.company}</div>
              <div style={{ color:'#64748b', fontSize:12, marginBottom:14 }}>📍 {job.location}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, padding:'2px 9px', borderRadius:5, background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)' }}>{job.field}</span>
                <span style={{ fontSize:11, color:'#64748b' }}>Due: {job.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ margin:'0 24px 80px', borderRadius:20, padding:'60px 32px', textAlign:'center', background:'linear-gradient(135deg,rgba(29,78,216,0.18),rgba(6,182,212,0.08))', border:'1px solid rgba(37,99,235,0.22)' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>🚀</div>
        <h2 style={{ fontSize:30, fontWeight:800, color:'#f1f5f9', marginBottom:10 }}>Ready to Launch Your Career?</h2>
        <p style={{ color:'#94a3b8', fontSize:16, maxWidth:480, margin:'0 auto 28px', lineHeight:1.6 }}>
          Join students from 120+ countries building their professional future with EduLink Global.
        </p>
        <Link href="/register" style={{ padding:'14px 36px', borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#06b6d4)', color:'#fff', fontWeight:700, fontSize:16, textDecoration:'none', boxShadow:'0 8px 40px rgba(37,99,235,0.4)' }}>
          Create Your Free Account
        </Link>
      </section>

      <footer style={{ borderTop:'1px solid var(--border)', padding:'36px 24px', textAlign:'center' }}>
        <div style={{ fontSize:18, marginBottom:6, color:'#64748b' }}>🌐 EduLink Global — 2025</div>
        <div style={{ display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap', marginTop:12 }}>
          {['About','Internships','Resources','Privacy','Contact'].map(l => (
            <a key={l} href="#" style={{ color:'#374151', textDecoration:'none', fontSize:13 }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}