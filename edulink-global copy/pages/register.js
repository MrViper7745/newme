import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS } from '../data/globalData'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ name:'', email:'', password:'', country:'', institution:'', field:'' })

  const handle = (e) => {
    e.preventDefault()
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'100px 24px 40px' }}>
      <Navbar />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:40, width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🌐</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>Join EduLink Global</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Connect with opportunities worldwide</p>
        </div>

        <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { key:'name', label:'Full Name', placeholder:'Your full name', type:'text' },
            { key:'email', label:'Email Address', placeholder:'your@email.com', type:'email' },
            { key:'password', label:'Password', placeholder:'Min 8 characters', type:'password' },
            { key:'institution', label:'University / Institution', placeholder:'Your institution name', type:'text' },
            { key:'field', label:'Field of Study', placeholder:'e.g. Computer Science, Engineering...', type:'text' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:5, fontWeight:600 }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ width:'100%', padding:'11px 14px', borderRadius:9, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none' }} />
            </div>
          ))}

          <div>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:5, fontWeight:600 }}>Country</label>
            <select value={form.country} onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
              style={{ width:'100%', padding:'11px 14px', borderRadius:9, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'#e2e8f0', outline:'none' }}>
              <option value="">Select your country...</option>
              {WORLD_REGIONS.map(r => (
                <optgroup key={r.id} label={`${r.flag} ${r.name}`}>
                  {r.countries.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <button type="submit" style={{ marginTop:8, padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'#fff', border:'none', fontWeight:700, fontSize:15, cursor:'pointer' }}>
            Create Account →
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#64748b' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color:'#60a5fa', textDecoration:'none', fontWeight:600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  )
}