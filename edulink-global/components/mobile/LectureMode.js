import { useState, useEffect, useRef } from 'react'
import useVoiceInput from '../../hooks/useVoiceInput'
import useWakeLock from '../../hooks/useWakeLock'
import useHaptic from '../../hooks/useHaptic'
import { supabase } from '../../lib/supabase'

export default function LectureMode({ user, open, onClose }) {
  const haptic = useHaptic()
  const { request: wakeLockRequest, release: wakeLockRelease } = useWakeLock()
  const [notes, setNotes] = useState('')
  const [voiceNotes, setVoiceNotes] = useState([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState('active') // active | done | summarising | summary
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const textareaRef = useRef(null)

  const { listening, supported, start, stop } = useVoiceInput((text) => {
    setVoiceNotes(prev => [...prev, { text, time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) }])
    setNotes(prev => prev + (prev ? '\n' : '') + text)
    haptic.tap()
  })

  useEffect(() => {
    if (!open) return
    wakeLockRequest()
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    // Auto-save every 30 seconds
    autoSaveRef.current = setInterval(() => {
      if (notes.trim()) saveToLibrary(false)
    }, 30000)
    return () => {
      wakeLockRelease()
      clearInterval(timerRef.current)
      clearInterval(autoSaveRef.current)
    }
  }, [open])

  if (!open) return null

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const saveToLibrary = async (final = true) => {
    if (!notes.trim() || !user) return
    setSaving(true)
    try {
      await supabase.from('library_files').upsert({
        user_id: user.id,
        title: `Lecture Notes — ${new Date().toLocaleDateString('en-ZA')}`,
        name: `lecture_${Date.now()}.txt`,
        content_text: notes,
        label: 'Study Notes',
        priority: 'high',
        ext: 'txt',
        saved_at: new Date().toISOString(),
        source: 'lecture_mode',
      })
    } catch {}
    setSaving(false)
    if (final) haptic.success()
  }

  const endLecture = async () => {
    clearInterval(timerRef.current)
    clearInterval(autoSaveRef.current)
    wakeLockRelease()
    await saveToLibrary(true)
    setPhase('done')
  }

  const generateSummary = async () => {
    setPhase('summarising')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `These are notes from a university lecture:\n\n${notes}\n\nPlease:\n1. Write a clear summary of the key points covered\n2. List the most important concepts to remember\n3. Suggest 3 topics to study further\n4. Create 5 flashcard questions from these notes`,
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setSummary(full) } } catch {}
        }
      }
      setPhase('summary')
    } catch { setPhase('done') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: phase === 'active' ? 'pulse 1s ease-in-out infinite' : 'none' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>📖 Lecture Mode</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtTime(elapsed)} · {notes.length} characters · Auto-saving</div>
        </div>
        {phase === 'active' && (
          <button onClick={endLecture} style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            End Lecture
          </button>
        )}
      </div>

      {phase === 'active' && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 12 }}>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Type notes here... or hold the mic to speak"
              style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.7, fontFamily: 'inherit' }}
              autoFocus
            />
            {voiceNotes.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {voiceNotes.slice(-3).map((vn, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#60a5fa', marginRight: 6 }}>{vn.time}</span>{vn.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          {supported && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onTouchStart={() => { haptic.tap(); start() }}
                onTouchEnd={stop}
                onMouseDown={start}
                onMouseUp={stop}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: listening ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.1)', border: `2px solid ${listening ? '#ef4444' : 'rgba(37,99,235,0.3)'}`, color: listening ? '#ef4444' : '#60a5fa', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{listening ? '🔴' : '🎤'}</span>
                {listening ? 'Listening... Release to stop' : 'Hold to Speak'}
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6, textAlign: 'center' }}>Lecture saved!</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
            {notes.length} characters saved to your library. Duration: {fmtTime(elapsed)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
            <button onClick={generateSummary} style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              🤖 Generate AI Summary & Flashcards
            </button>
            <button onClick={onClose} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {phase === 'summarising' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
          <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: 'var(--text3)' }}>AI is summarising your lecture notes...</div>
          </div>
          {summary && <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1, overflowY: 'auto' }}>{summary}</div>}
        </div>
      )}

      {phase === 'summary' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ✅ Done — Go to Library
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  )
}