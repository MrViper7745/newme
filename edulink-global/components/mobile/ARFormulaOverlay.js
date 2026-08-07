import { useState, useRef, useEffect } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

export default function ARFormulaOverlay({ open, onClose }) {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) { stopCamera(); setResult(null); setError(null) }
    else startCamera()
  }, [open])

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch { setError('Camera permission denied. Please allow camera access.') }
  }

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
  }

  const capture = async () => {
    if (!videoRef.current) return
    setCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: 'Look at this image. Identify any mathematical equations, formulas, scientific notation, or academic content. For each formula or equation found: 1) State what it is, 2) Explain what each variable means, 3) Give an example calculation. If it is a diagram, explain what it shows. Be concise and educational.' }
            ]
          }]
        })
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim(); if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setResult(full) } } catch {}
        }
      }
    } catch (err) { setError('Could not analyse image: ' + err.message) }
    setCapturing(false)
  }

  return (
    <MobileBottomSheet open={open} onClose={() => { stopCamera(); onClose() }} title="🔍 AR Formula Scanner" height="90vh">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)', padding: '12px 16px' }}>
        {error ? (
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
        ) : (
          <div style={{ position: 'relative', marginBottom: 12, borderRadius: 14, overflow: 'hidden', background: '#000', flex: result ? '0 0 180px' : 1 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {!capturing && !result && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ border: '2px solid rgba(37,99,235,0.7)', borderRadius: 12, width: '70%', height: '40%' }} />
              </div>
            )}
            {capturing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.3)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
          </div>
        )}

        {result && (
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: '14px', marginBottom: 12, fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {result && (
            <button onClick={() => setResult(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Scan Again
            </button>
          )}
          <button onClick={capture} disabled={capturing || !!error}
            style={{ flex: 2, padding: '13px', borderRadius: 12, background: capturing || error ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: capturing || error ? 'var(--text3)' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {capturing ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Analysing...</> : '📸 Capture & Analyse'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}