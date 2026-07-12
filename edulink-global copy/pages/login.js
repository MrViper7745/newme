import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('student@edulink.global')
  const [password, setPassword] = useState('password123')

  const handle = (e) => { e.preventDefault(); router.push('/dashboard') }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'100px 24px 40px' }}>
      <Navbar />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:40, width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>Welcome Back</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Sign in to EduLink Global</p>
        </div>

        <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:5, fontWeight:600 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', borderRadius:9, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none' }} />
          </div>
          <div>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:5, fontWeight:600 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', borderRadius:9, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none' }} />
          </div>
          <button type="submit" style={{ marginTop:8, padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'#fff', border:'none', fontWeight:700, fontSize:15, cursor:'pointer' }}>
            Sign In →
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#64748b' }}>
          No account?{' '}
          <Link href="/register" style={{ color:'#60a5fa', textDecoration:'none', fontWeight:600 }}>Register Free</Link>
        </div>
      </div>
    </div>
  )
}