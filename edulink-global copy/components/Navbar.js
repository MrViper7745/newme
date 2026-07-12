import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Navbar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home' },
    { href: '/internships', label: '💼 Internships' },
    { href: '/scholarships', label: '🎓 Scholarships' },
    { href: '/resources', label: '📚 Resources' },
    { href: '/community', label: '👥 Community' },
    { href: '/employers', label: '🏢 Employers' },
    { href: '/assistant', label: '🤖 EduBot' },
  ]

  return (
    <nav className="nav-blur" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌐</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#e2e8f0' }}>
            Edu<span style={{ color: '#60a5fa' }}>Link</span>{' '}
            <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 400 }}>Global</span>
          </span>
        </Link>

        {/* Desktop */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: router.pathname === l.href ? '#60a5fa' : '#94a3b8',
              background: router.pathname === l.href ? 'rgba(37,99,235,0.12)' : 'transparent',
            }}>{l.label}</Link>
          ))}
          <Link href="/dashboard" style={{ marginLeft: 4, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/profile" style={{ marginLeft: 4, padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: '#e2e8f0', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Profile</Link>
        </div>
      </div>
    </nav>
  )
}