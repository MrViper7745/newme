import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const LABEL_COLOR = {
  'Past Exam Paper': '#ef4444', 'Memo / Marking Guide': '#10b981',
  'Lecture Slides': '#2563eb', 'Study Notes': '#8b5cf6',
  'Textbook / Chapter': '#f59e0b', 'Tutorial / Worksheet': '#06b6d4',
}

function highlight(text, query) {
  if (!query || !text) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: 3, padding: '0 1px' }}>{part}</mark>
      : part
  )
}

export default function Search() {
  const { user } = useUser()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filterLabel, setFilterLabel] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const inputRef = useRef(null)
  const debounce = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    // Pre-populate from URL query
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) { setQuery(q); doSearch(q) }
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(query), 350)
    return () => clearTimeout(debounce.current)
  }, [query])

  const doSearch = async (q) => {
    if (!user || !q.trim()) return
    setLoading(true); setSearched(true)

    // Full text search across title, content_text, label, domain
    const { data } = await supabase
      .from('library_files')
      .select('id, title, name, label, ext, domain, saved_at, last_opened, content_text, priority')
      .eq('user_id', user.id)
      .or(`title.ilike.%${q}%,name.ilike.%${q}%,content_text.ilike.%${q}%,label.ilike.%${q}%`)
      .order('saved_at', { ascending: false })
      .limit(30)

    // Score results by relevance
    const scored = (data || []).map(file => {
      let score = 0
      const ql = q.toLowerCase()
      if (file.title?.toLowerCase().includes(ql)) score += 10
      if (file.name?.toLowerCase().includes(ql)) score += 8
      if (file.label?.toLowerCase().includes(ql)) score += 6
      if (file.content_text?.toLowerCase().includes(ql)) score += 3
      if (file.priority === 'high') score += 2
      return { ...file, _score: score }
    })

    setResults(scored)
    setLoading(false)
  }

  const filtered = results
    .filter(r => filterLabel === 'all' || r.label === filterLabel)
    .sort((a, b) => {
      if (sortBy === 'relevance') return b._score - a._score
      if (sortBy === 'date') return new Date(b.saved_at) - new Date(a.saved_at)
      if (sortBy === 'name') return (a.title || a.name || '').localeCompare(b.title || b.name || '')
      return 0
    })

  const labels = [...new Set(results.map(r => r.label).filter(Boolean))]

  // Snippet extraction
  const getSnippet = (text, q) => {
    if (!text || !q) return null
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return null
    const start = Math.max(0, idx - 80)
    const end = Math.min(text.length, idx + q.length + 160)
    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '90px 16px 80px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🔍 Search Library</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Search across all your files — including inside PDF text content</p>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, topic, keyword, or any text inside your files..."
            style={{ width: '100%', padding: '14px 44px 14px 48px', borderRadius: 14, fontSize: 15, background: 'var(--surface)', border: '2px solid rgba(37,99,235,0.3)', color: '#e2e8f0', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
            onBlur={e => e.target.style.borderColor = 'rgba(37,99,235,0.3)'}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus() }}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
          )}
        </div>

        {/* Filters */}
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ flex: 1 }} />
            <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
              <option value="all">All types</option>
              {labels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
              <option value="relevance">Best match</option>
              <option value="date">Most recent</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Searching...
          </div>
        ) : searched && filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>No files match "{query}"</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Try a different keyword, or upload more files to your library
            </div>
            <button onClick={() => router.push('/upload')} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📤 Upload Files</button>
          </div>
        ) : !searched ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Search your entire library</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>Searches file names and inside PDF text content</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(file => {
              const snippet = getSnippet(file.content_text, query)
              return (
                <div key={file.id} onClick={() => router.push('/library')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: snippet ? 10 : 0 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                        {highlight(file.title || file.name, query)}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {file.label && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: `${LABEL_COLOR[file.label] || '#64748b'}15`, color: LABEL_COLOR[file.label] || '#94a3b8', fontWeight: 700 }}>{file.label}</span>}
                        {file.priority === 'high' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700 }}>🔴 High</span>}
                        {file.content_text && <span style={{ fontSize: 10, color: '#10b981' }}>📖 Readable</span>}
                        {file.domain && <span style={{ fontSize: 10, color: '#64748b' }}>🌐 {file.domain}</span>}
                        <span style={{ fontSize: 10, color: '#374151' }}>{new Date(file.saved_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); router.push('/library') }} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      🤖 Open
                    </button>
                  </div>
                  {snippet && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, borderLeft: '3px solid rgba(37,99,235,0.3)' }}>
                      {highlight(snippet, query)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}