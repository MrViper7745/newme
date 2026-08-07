import { useState, useEffect } from 'react'

export default function ThemeToggle({ style }) {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <button onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', ...style }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
      <span style={{ fontSize: 12, fontWeight: 600 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  )
}