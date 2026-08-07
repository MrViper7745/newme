import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already dismissed or installed
    if (localStorage.getItem('pwa_dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)
    if (ios) { setTimeout(() => setShow(true), 5000); return }

    // Chrome/Android install prompt
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  const dismiss = () => {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa_dismissed', '1')
  }

  if (!show || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 2000,
      background: '#0e0e1c', border: '1px solid rgba(37,99,235,0.4)',
      borderRadius: 16, padding: 18,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      display: 'flex', gap: 14, alignItems: 'flex-start',
      maxWidth: 420, margin: '0 auto',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎓</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 4 }}>Install EduLink</div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 12 }}>
            Tap <strong style={{ color: '#60a5fa' }}>Share</strong> then <strong style={{ color: '#60a5fa' }}>Add to Home Screen</strong> to install EduLink for fast access, even offline.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 12 }}>
            Add EduLink to your home screen for fast access — works offline too.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isIOS && (
            <button onClick={install} style={{ flex: 1, padding: '8px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              📲 Install
            </button>
          )}
          <button onClick={dismiss} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
            Not now
          </button>
        </div>
      </div>
      <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>×</button>
    </div>
  )
}