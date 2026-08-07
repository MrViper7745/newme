import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function LivingTextbookViewer({ file, userId, open, onClose }) {
  const haptic = useHaptic()
  const [annotations, setAnnotations] = useState([])
  const [highlights, setHighlights] = useState([])
  const [adding, setAdding] = useState(null) // selected text
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file?.id || !userId) return
    loadAnnotations()
  }, [file?.id])

  const loadAnnotations = async () => {
    const { data } = await supabase.from('library_sessions')
      .select('conversation')
      .eq('user_id', userId)
      .eq('file_id', file.id)
      .single()
    if (data?.conversation) {
      const aiNotes = data.conversation
        .filter(m => m.role === 'assistant')
        .map((m, i) => ({ id: `session_${i}`, type: 'ai', content: m.content?.slice(0, 200), source: 'AI Tutor' }))
      setAnnotations(aiNotes.slice(0, 5))
    }
  }

  const addAnnotation = async () => {
    if (!noteText.trim() || !adding) return
    haptic.success()
    const annotation = {
      id: `manual_${Date.now()}`,
      type: 'manual',
      selectedText: adding,
      content: noteText,
      source: 'Your note',
      timestamp: new Date().toISOString(),
    }
    setAnnotations(prev => [annotation, ...prev])
    setNoteText(''); setAdding(null)
  }

  const explainWithAI = async (text) => {
    setLoading(true)
    haptic.tap()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Explain this passage briefly and clearly: "${text}" — Context: file titled "${file?.title || file?.name}"` }] })
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
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      const annotation = { id: `ai_${Date.now()}`, type: 'ai', selectedText: text, content: full, source: 'AI Explanation' }
      setAnnotations(prev => [annotation, ...prev])
    } catch {}
    setLoading(false)
  }

  if (!open || !file) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📖 {file.title || file.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Living Textbook — {annotations.length} annotations</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* File content */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Document</div>
          {file.url ? (
            <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px', borderRadius: 10, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa', fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>
              📄 Open original file ↗
            </a>
          ) : null}
          {file.content_text ? (
            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {file.content_text.slice(0, 2000)}{file.content_text.length > 2000 ? '\n...' : ''}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '30px 0' }}>PDF text not extracted. Open the file directly.</div>
          )}
        </div>

        {/* Annotations */}
        <div style={{ overflowY: 'auto', padding: '14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Annotations</div>

          <button onClick={() => setAdding('Selected passage')} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'rgba(37,99,235,0.08)', border: '1px dashed rgba(37,99,235,0.25)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            + Add Note
          </button>

          {adding && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 11, padding: 12, marginBottom: 12 }}>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Your annotation..." rows={3} autoFocus
                style={{ width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setAdding(null)} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                <button onClick={addAnnotation} style={{ flex: 2, padding: '7px', borderRadius: 8, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Save Note</button>
              </div>
            </div>
          )}

          {annotations.map(a => (
            <div key={a.id} style={{ padding: '10px 12px', borderRadius: 11, background: a.type === 'ai' ? 'rgba(124,58,237,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${a.type === 'ai' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)'}`, marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: a.type === 'ai' ? '#a78bfa' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{a.source}</div>
              <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{a.content?.slice(0, 150)}{a.content?.length > 150 ? '...' : ''}</div>
            </div>
          ))}

          {annotations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>No annotations yet. Add notes or open the AI chat to generate them automatically.</div>
          )}
        </div>
      </div>
    </div>
  )
}