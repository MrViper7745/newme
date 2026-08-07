import { useState, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const LABELS = [
  'Past Exam Paper', 'Memo / Marking Guide', 'Lecture Slides',
  'Study Notes', 'Textbook / Chapter', 'Tutorial / Worksheet',
  'Supplementary Exam', 'Assignment', 'Other',
]

const LABEL_COLOR = {
  'Past Exam Paper': '#ef4444', 'Memo / Marking Guide': '#10b981',
  'Lecture Slides': '#2563eb', 'Study Notes': '#8b5cf6',
  'Textbook / Chapter': '#f59e0b', 'Tutorial / Worksheet': '#06b6d4',
  'Supplementary Exam': '#f97316', 'Assignment': '#ec4899',
}

const EXT_ICON = {
  pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊',
  xls: '📈', xlsx: '📈', txt: '📋', md: '📋', png: '🖼️',
  jpg: '🖼️', jpeg: '🖼️',
}

const fmt = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'

export default function Upload() {
  const { user } = useUser()
  const router = useRouter()
  const fileInputRef = useRef(null)

  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [globalLabel, setGlobalLabel] = useState('')
  const [globalPriority, setGlobalPriority] = useState('medium')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const addFiles = useCallback((incoming) => {
    const newFiles = Array.from(incoming)
      .filter(f => f.size < 50 * 1024 * 1024)
      .map(f => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: f,
        name: f.name.replace(/\.[^.]+$/, ''),
        ext: f.name.split('.').pop().toLowerCase(),
        size: f.size,
        label: globalLabel,
        priority: globalPriority,
        uploading: false, done: false, error: null, progress: 0,
      }))
    setFiles(prev => [...prev, ...newFiles])
  }, [globalLabel, globalPriority])

  const onDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }

  const update = (id, patch) => setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  const applyAll = () => {
    setFiles(prev => prev.map(f => ({ ...f, label: globalLabel || f.label, priority: globalPriority })))
    showToast('✅ Applied to all files')
  }

  const uploadAll = async () => {
    if (!user) return
    const pending = files.filter(f => !f.done)
    if (!pending.length) return
    setUploading(true)

    for (const entry of pending) {
      update(entry.id, { uploading: true, progress: 10 })
      try {
        // Upload to Supabase Storage
        const safeName = entry.file.name.replace(/[^a-z0-9._-]/gi, '_')
        const path = `${user.id}/${Date.now()}_${safeName}`
        const { error: storageErr } = await supabase.storage.from('library').upload(path, entry.file, { upsert: true })
        if (storageErr) throw storageErr
        update(entry.id, { progress: 50 })

        const { data: { publicUrl } } = supabase.storage.from('library').getPublicUrl(path)

        // Extract text for PDFs and text files
        let contentText = null
        if (entry.ext === 'pdf') {
          try {
            const fd = new FormData(); fd.append('file', entry.file)
            const res = await fetch('/api/extract-pdf-upload', { method: 'POST', body: fd })
            const d = await res.json()
            if (d.text) contentText = d.text
          } catch {}
        } else if (['txt', 'md'].includes(entry.ext)) {
          try { contentText = await entry.file.text() } catch {}
        }

        update(entry.id, { progress: 80 })

        const { error: dbErr } = await supabase.from('library_files').insert({
          user_id: user.id, url: publicUrl,
          name: entry.file.name, title: entry.name,
          ext: entry.ext, label: entry.label || null,
          priority: entry.priority,
          content_text: contentText,
          saved_at: new Date().toISOString(),
          source: 'manual_upload',
        })
        if (dbErr) throw dbErr
        update(entry.id, { uploading: false, done: true, progress: 100 })
      } catch (e) {
        update(entry.id, { uploading: false, error: e.message, progress: 0 })
      }
    }
    setUploading(false)
    const doneNow = files.filter(f => f.done).length
    showToast(`✅ Uploaded ${pending.length} file${pending.length !== 1 ? 's' : ''}!`)
  }

  const allDone = files.length > 0 && files.every(f => f.done)

  const I = { padding: '9px 12px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '90px 16px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📤 Upload to Library</h1>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>Upload your study materials directly — no browser extension needed. PDF text is extracted automatically so the AI tutor can read and help you with the content.</p>
        </div>

        {/* Global settings */}
        {files.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>⚙️ Apply to all files</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 5 }}>FILE TYPE</label>
                <select value={globalLabel} onChange={e => setGlobalLabel(e.target.value)} style={{ ...I, width: '100%' }}>
                  <option value="">Select type...</option>
                  {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 130 }}>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 5 }}>PRIORITY</label>
                <select value={globalPriority} onChange={e => setGlobalPriority(e.target.value)} style={{ ...I, width: '100%' }}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <button onClick={applyAll} style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Apply to all</button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? '#2563eb' : 'rgba(255,255,255,0.1)'}`, borderRadius: 16, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(37,99,235,0.06)' : 'var(--surface)', transition: 'all 0.2s', marginBottom: 20 }}
        >
          <div style={{ fontSize: 44, marginBottom: 14 }}>{dragging ? '⬇️' : '📂'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
            {dragging ? 'Drop to add!' : 'Drop files here or click to browse'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
            PDF, Word, PowerPoint, Excel, TXT, Markdown<br />
            Up to 50MB per file · Multiple files at once supported
          </div>
          <div style={{ marginTop: 16, padding: '9px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'inline-block' }}>
            Choose Files
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md" onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {files.map(entry => (
              <div key={entry.id} style={{ background: 'var(--surface)', border: `1px solid ${entry.done ? 'rgba(16,185,129,0.3)' : entry.error ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{EXT_ICON[entry.ext] || '📁'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input value={entry.name} onChange={e => update(entry.id, { name: e.target.value })} disabled={entry.done || entry.uploading}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#f1f5f9', outline: 'none', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select value={entry.label} onChange={e => update(entry.id, { label: e.target.value })} disabled={entry.done || entry.uploading} style={{ ...I, fontSize: 11 }}>
                        <option value="">No label</option>
                        {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <select value={entry.priority} onChange={e => update(entry.id, { priority: e.target.value })} disabled={entry.done || entry.uploading} style={{ ...I, fontSize: 11 }}>
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{fmt(entry.size)}</span>
                      {entry.ext === 'pdf' && !entry.done && <span style={{ fontSize: 10, color: '#10b981', padding: '2px 7px', borderRadius: 5, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>📖 Text will be extracted</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {entry.done && <span style={{ fontSize: 20 }}>✅</span>}
                    {entry.error && <span title={entry.error} style={{ fontSize: 20, cursor: 'help' }}>❌</span>}
                    {!entry.done && !entry.uploading && (
                      <button onClick={() => setFiles(prev => prev.filter(f => f.id !== entry.id))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>×</button>
                    )}
                  </div>
                </div>
                {entry.uploading && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${entry.progress}%`, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {entry.progress < 50 ? 'Uploading...' : entry.ext === 'pdf' ? 'Extracting text...' : 'Saving...'}
                    </div>
                  </div>
                )}
                {entry.error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>⚠️ {entry.error}</div>}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setFiles([])} style={{ padding: '11px 20px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Clear All</button>
            {allDone
              ? <button onClick={() => router.push('/library')} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>📚 Go to Library →</button>
              : <button onClick={uploadAll} disabled={uploading} style={{ flex: 1, padding: '11px', borderRadius: 10, background: uploading ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: uploading ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {uploading ? '⏳ Uploading...' : `📤 Upload ${files.filter(f => !f.done).length} File${files.filter(f => !f.done).length !== 1 ? 's' : ''}`}
                </button>
            }
          </div>
        )}

        <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>💡 Tips</div>
          {['Label "Past Exam Paper" files so the AI tutor knows to solve the questions', 'PDFs are fully extracted — the AI can read and explain every page', 'Mark important files as High priority so they surface in dashboard insights', 'You can also get files from the browser extension while browsing your university portal'].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              <span style={{ color: '#10b981' }}>•</span><span>{t}</span>
            </div>
          ))}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}