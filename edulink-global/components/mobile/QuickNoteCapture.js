import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import VoiceInput from './VoiceInput'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function QuickNoteCapture({ user, open, onClose }) {
  const haptic = useHaptic()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)

  const reset = () => { setNote(''); setSaved(false); setAiMode(false); setAiResponse('') }

  const saveNote = async () => {
    if (!note.trim() || !user) return
    setSaving(true)
    try {
      await supabase.from('library_files').insert({
        user_id: user.id,
        title: note.slice(0, 60) + (note.length > 60 ? '...' : ''),
        name: `Quick Note — ${new Date().toLocaleString('en-ZA')}`,
        content_text: note,
        label: 'Study Notes',
        priority: 'medium',
        ext: 'txt',
        saved_at: new Date().toISOString(),
        source: 'quick_note',
      })
      setSaved(true)
      haptic.success()
    } catch {}
    setSaving(false)
  }

  const askAI = async () => {
    if (!note.trim()) return
    setAiMode(true)
    setLoadingAI(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `I have this note: "${note}"\n\nPlease: 1) Explain this concept clearly, 2) Expand on it with important details, 3) Give me 3 key points to remember, 4) Suggest what to study next related to this topic.` }],
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
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setAiResponse(full) } } catch {}
        }
      }
    } catch {}
    setLoadingAI(false)
  }

  return (
    <MobileBottomSheet open={open} onClose={() => { reset(); onClose() }} title="📝 Quick Note" height="82vh">
      <div style={{ padding: '16px' }}>
        {!aiMode ? (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Type your note or use the mic to speak..."
                rows={7}
                style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit' }}
                autoFocus />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{note.length} chars</span>
              <VoiceInput onResult={(text) => setNote(prev => prev ? prev + ' ' + text : text)} />
            </div>

            {saved && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>✅ Saved to Library!</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!saved && (
                <button onClick={saveNote} disabled={!note.trim() || saving}
                  style={{ padding: '13px', borderRadius: 11, background: note.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', color: note.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {saving ? '⏳ Saving...' : '💾 Save to Library'}
                </button>
              )}
              <button onClick={askAI} disabled={!note.trim()}
                style={{ padding: '13px', borderRadius: 11, background: note.trim() ? 'rgba(124,58,237,0.12)' : 'var(--surface2)', border: `1px solid ${note.trim() ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, color: note.trim() ? '#a78bfa' : 'var(--text3)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🤖 Ask EduBot to Explain This
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', marginBottom: 14, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
              📝 {note.slice(0, 120)}{note.length > 120 ? '...' : ''}
            </div>
            {loadingAI ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>EduBot is thinking...</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, background: 'var(--surface2)', padding: 14, borderRadius: 12, marginBottom: 14, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
                {aiResponse}
              </div>
            )}
            <button onClick={reset}
              style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              ← New Note
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}