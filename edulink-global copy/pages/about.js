import Link from 'next/link'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS } from '../data/globalData'

export default function About() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌐</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#f1f5f9', marginBottom: 14 }}>About EduLink Global</h1>
          <p style={{ color: '#94a3b8', fontSize: 17, maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            EduLink Global was born from a simple belief: every student, regardless of where they live, deserves access to world-class academic resources and career opportunities.
          </p>
        </div>

        {/* Mission */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 60 }}>
          {[
            { icon: '🎯', title: 'Our Mission', desc: 'To democratize access to education, internships, and career opportunities for students in every country — from Lagos to London, Delhi to Dubai.' },
            { icon: '🌍', title: 'Our Reach', desc: 'We connect students from 120+ countries across Africa, Asia, Europe, the Americas, the Middle East, and Oceania with global employers.' },
            { icon: '🤖', title: 'Our Technology', desc: 'AI-powered career guidance, smart internship matching, and intelligent resource recommendations tailored to your region and field of study.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 8 }}>{item.title}</div>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Regions */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 24, textAlign: 'center' }}>Regions We Serve</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {WORLD_REGIONS.map(r => (
              <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${r.color}30`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 24 }}>{r.flag}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.countries.length} countries</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 24, textAlign: 'center' }}>Our Values</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            {[
              { icon: '⚖️', value: 'Equity', desc: 'Every student deserves the same opportunities regardless of their location or background.' },
              { icon: '🔗', value: 'Connection', desc: 'We bridge the gap between talented students and global employers.' },
              { icon: '🚀', value: 'Growth', desc: 'We exist to accelerate career readiness and professional development.' },
              { icon: '🌐', value: 'Inclusivity', desc: 'We celebrate cultural diversity and build a truly global student community.' },
            ].map(v => (
              <div key={v.value} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{v.value}</div>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(6,182,212,0.08))', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 20, padding: '48px 32px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Ready to Join?</h2>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 15 }}>It's free. Always will be for students.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ padding: '13px 30px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>Create Free Account</Link>
            <Link href="/assistant" style={{ padding: '13px 30px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#e2e8f0', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Talk to EduBot 🤖</Link>
          </div>
        </div>
      </div>
    </div>
  )
}