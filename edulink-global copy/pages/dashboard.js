import Link from 'next/link'
import Navbar from '../components/Navbar'
import { INTERNSHIPS, RESOURCES, WORLD_REGIONS } from '../data/globalData'

export default function Dashboard() {
  const featured = INTERNSHIPS.slice(0, 3)
  const recentRes = RESOURCES.slice(0, 3)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop:100, maxWidth:1100, margin:'0 auto', padding:'100px 24px 80px' }}>
        {/* Welcome */}
        <div style={{ marginBottom:36 }}>
          <h1 style={{ fontSize:30, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>Welcome back, Student! 👋</h1>
          <p style={{ color:'#64748b' }}>Your global career dashboard — {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:36 }}>
          {[
            { label:'Saved Internships', value:'0', icon:'💼', color:'#2563eb' },
            { label:'Resources Downloaded', value:'0', icon:'📚', color:'#10b981' },
            { label:'Profile Completion', value:'40%', icon:'👤', color:'#f59e0b' },
            { label:'Countries Available', value:'120+', icon:'🌐', color:'#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* EduBot Banner */}
        <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(37,99,235,0.1))', border:'1px solid rgba(139,92,246,0.25)', borderRadius:14, padding:20, marginBottom:36, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontWeight:700, color:'#f1f5f9', marginBottom:4 }}>🤖 Ask EduBot AI</div>
            <div style={{ color:'#94a3b8', fontSize:13 }}>Get personalized internship recommendations, career advice, and more — for any country!</div>
          </div>
          <Link href="/assistant" style={{ padding:'10px 22px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', fontWeight:600, fontSize:13, textDecoration:'none', whiteSpace:'nowrap' }}>
            Chat with EduBot →
          </Link>
        </div>

        {/* Featured Internships */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>Featured Internships</h2>
            <Link href="/internships" style={{ color:'#60a5fa', textDecoration:'none', fontSize:13, fontWeight:600 }}>View All →</Link>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
            {featured.map(job => (
              <div key={job.id} className="card-glow" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:26, marginBottom:10 }}>{job.logo}</div>
                <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, marginBottom:3 }}>{job.title}</div>
                <div style={{ color:'#60a5fa', fontSize:13, marginBottom:3 }}>{job.company}</div>
                <div style={{ color:'#64748b', fontSize:12, marginBottom:10 }}>📍 {job.location}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, padding:'2px 9px', borderRadius:5, background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)' }}>{job.field}</span>
                  <span style={{ fontSize:11, color:'#64748b' }}>{job.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Resources */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>Popular Resources</h2>
            <Link href="/resources" style={{ color:'#60a5fa', textDecoration:'none', fontSize:13, fontWeight:600 }}>View All →</Link>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:16 }}>
            {recentRes.map(res => (
              <div key={res.id} className="card-glow" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:26, marginBottom:10 }}>{res.icon}</div>
                <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, marginBottom:3 }}>{res.title}</div>
                <div style={{ color:'#60a5fa', fontSize:12, marginBottom:10 }}>{res.subject} · {res.type}</div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, color:'#64748b' }}>⬇ {res.downloads.toLocaleString()}</span>
                  <span style={{ fontSize:11, color:'#f59e0b' }}>★ {res.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}