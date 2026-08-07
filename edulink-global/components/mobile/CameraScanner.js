import { useRef, useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'

export default function CameraScanner({ open, onClose, onCapture }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const handleCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    setProcessing(true)
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: base64.split(',')[1] } },
              { type: 'text', text: 'This is a photo of study material. 1) Describe what you see. 2) If there are questions or problems, solve them step by step with full working. 3) If it is theory or notes, summarise the key points clearly. Be thorough.' },
            ],
          }],
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      setResult(full)
      if (onCapture) onCapture({ file, preview: url, analysis: full })
    } catch (err) {
      setResult('Could not analyse image: ' + err.message)
    }
    setProcessing(false)
    e.target.value = ''
  }

  const reset = () => { setPreview(null); setResult(null); setProcessing(false) }

  return (
    <MobileBottomSheet open={open} onClose={() => { reset(); onClose() }} title="📷 Camera Scanner" height="85vh">
      <div style={{ padding: '16px' }}>
        {!preview ? (
          <div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Point your camera at a textbook page, whiteboard, handwritten notes, or printed past paper. The AI will read, explain, and solve whatever it sees.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '📸', label: 'Take Photo', capture: true },
                { icon: '🖼️', label: 'Choose Image', capture: false },
              ].map((opt, i) => (
                <button key={i}
                  onClick={() => {
                    if (opt.capture) fileRef.current.setAttribute('capture', 'environment')
                    else fileRef.current.removeAttribute('capture')
                    fileRef.current.click()
                  }}
                  style={{ padding: '22px 12px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
                </button>
              ))}
            </div>
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              Works best with: textbook pages, exam papers, lecture slides, handwritten equations, whiteboard photos.
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleCapture} style={{ display: 'none' }} />
          </div>
        ) : (
          <div>
            <img src={preview} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 220, objectFit: 'cover' }} />
            {processing ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>AI is reading your image...</div>
              </div>
            ) : result ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--surface2)', padding: 14, borderRadius: 12, marginBottom: 14, maxHeight: 300, overflowY: 'auto' }}>{result}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={reset} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Scan Another</button>
                  <button onClick={() => { reset(); onClose() }} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Done</button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}