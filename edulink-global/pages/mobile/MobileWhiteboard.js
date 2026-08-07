import { useRef, useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import useHaptic from '../../hooks/useHaptic'

const COLORS = ['#ffffff', '#60a5fa', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#000000']
const WIDTHS = [2, 4, 8, 16]
const TOOLS = ['pen', 'eraser', 'text']

export default function MobileWhiteboard() {
  const canvasRef = useRef(null)
  const haptic = useHaptic()
  const [drawing, setDrawing] = useState(false)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#ffffff')
  const [width, setWidth] = useState(4)
  const [history, setHistory] = useState([])
  const [solving, setSolving] = useState(false)
  const [solution, setSolution] = useState(null)
  const lastPos = useRef(null)
  const historyIdx = useRef(-1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return {
      x: (t.clientX - rect.left),
      y: (t.clientY - rect.top),
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    const canvas = canvasRef.current; if (!canvas) return
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)

    if (tool === 'eraser') {
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = width * 3
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = width
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => {
    if (!drawing) return
    setDrawing(false)
    saveHistory()
    lastPos.current = null
  }

  const saveHistory = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const snap = canvas.toDataURL()
    setHistory(prev => [...prev.slice(0, historyIdx.current + 1), snap])
    historyIdx.current++
  }

  const undo = () => {
    if (historyIdx.current < 0) return
    historyIdx.current--
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (historyIdx.current < 0) {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)
    } else {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)
      img.src = history[historyIdx.current]
    }
    haptic.tap()
  }

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)
    setHistory([]); historyIdx.current = -1; setSolution(null)
    haptic.tap()
  }

  const solveWithAI = async () => {
    const canvas = canvasRef.current; if (!canvas) return
    setSolving(true); setSolution(null)
    haptic.tap()
    try {
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
              { type: 'text', text: 'This is a whiteboard with handwritten content. Please: 1) Describe what you see, 2) If there are mathematical equations or problems, solve them with full working, 3) If it is a diagram, explain it, 4) If it is notes, summarise them clearly.' }
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setSolution(full) } } catch {}
        }
      }
    } catch (err) { setSolution('Could not analyse: ' + err.message) }
    setSolving(false)
  }

  const saveImage = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `edulink-whiteboard-${Date.now()}.png`
    a.click()
    haptic.success()
  }

  return (
    <MobileLayout title="🖊️ Whiteboard" noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 56px - 65px)' }}>

        {/* Toolbar */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, overflowX: 'auto' }}>
          {/* Tools */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {[{ id: 'pen', icon: '✏️' }, { id: 'eraser', icon: '🧹' }].map(t => (
              <button key={t.id} onClick={() => setTool(t.id)}
                style={{ width: 36, height: 36, borderRadius: 9, background: tool === t.id ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${tool === t.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.icon}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Colors */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => { setColor(c); setTool('pen') }}
                style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }} />
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Width */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {WIDTHS.map(w => (
              <div key={w} onClick={() => setWidth(w)}
                style={{ width: 28, height: 28, borderRadius: 6, background: width === w ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', border: `1px solid ${width === w ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <div style={{ width: Math.min(w * 2, 18), height: Math.min(w * 2, 18), borderRadius: '50%', background: color }} />
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={undo} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↩</button>
            <button onClick={clear} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          />

          {/* AI solution overlay */}
          {solution && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(13,13,28,0.96)', borderTop: '1px solid rgba(37,99,235,0.3)', padding: '14px', maxHeight: '40%', overflowY: 'auto', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa' }}>🤖 AI Analysis</div>
                <button onClick={() => setSolution(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
              <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{solution}</div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '8px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={solveWithAI} disabled={solving}
            style={{ flex: 2, padding: '11px', borderRadius: 11, background: solving ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: solving ? 'var(--text3)' : '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {solving ? '⏳ Analysing...' : '🤖 AI Solve'}
          </button>
          <button onClick={saveImage}
            style={{ flex: 1, padding: '11px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            💾 Save
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}