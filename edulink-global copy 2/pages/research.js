import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const FIELDS = ['Computer Science', 'Medicine', 'Engineering', 'Business', 'Psychology', 'Economics', 'Biology', 'Physics', 'Mathematics', 'Law', 'Education', 'Environmental Science']

export default function Research() {
  const { user } = useUser()
  const [papers, setPapers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('search')
  const [selectedField, setSelectedField] = useState('')
  const [aiSummary, setAiSummary] = useState({})
  const [summarising, setSummarising] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }
  useEffect(() => { if (user) fetchPapers() }, [user])

  const fetchPapers = async () => {
    const { data } = await supabase.from('saved_papers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPapers(data || [])
  }

  // Search using Semantic Scholar public API
  const searchPapers = async () => {
    if (!searchQuery.trim()) { showToast('Enter a search term'); return }
    setSearching(true); setResults([])
    try {
      const query = encodeURIComponent(`${searchQuery} ${selectedField}`.trim())
      const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=10&fields=title,abstract,authors,year,url,openAccessPdf,citationCount`)
      const data = await res.json()
      setResults(data.data || [])
      if (!data.data?.length) showToast('No papers found — try different keywords')
    } catch {
      showToast('⚠️ Search failed. Try: scholar.google.com, arxiv.org, or pubmed.ncbi.nlm.nih.gov')
    }
    setSearching(false)
  }

  const savePaper = async (paper) => {
    if (!user) { showToast('Sign in to save papers'); return }
    const alreadySaved = papers.find(p => p.title === paper.title)
    if (alreadySaved) { showToast('Already saved!'); return }
    await supabase.from('saved_papers').insert({
      user_id: user.id,
      title: paper.title,
      authors: paper.authors?.map(a => a.name).join(', '),
      abstract: paper.abstract?.slice(0, 1000),
      url: paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      year: paper.year,
      field: selectedField,
    })
    fetchPapers()
    showToast('✅ Paper saved!')
  }

  const deletePaper = async (id) => {
    await supabase.from('saved_papers').delete().eq('id', id)
    fetchPapers()
  }

  const summarisePaper = async (paperId, abstract) => {
    if (!abstract) { showToast('No abstract to summarise'); return }
    setSummarising(paperId)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Summarise this academic paper abstract in simple language for a student. Give:
1. What problem it addresses (1 sentence)
2. What they found / proposed (2 sentences)
3. Why it matters (1 sentence)

Abstract: ${abstract}

Be clear and avoid jargon. Max 100 words total.`
          }]
        })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') { setAiSummary(p => ({ ...p, [paperId]: full })); setSummarising(null); return }
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setAiSummary(prev => ({ ...prev, [paperId]: full })) } } catch {}
        }
      }
    } catch { showToast('❌ Could not summarise') }
    setSummarising(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 960, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🔬 Research Paper Finder</h1>
          <p style={{ color: '#64748b' }}>Search millions of academic papers, get AI plain-English summaries, and save them for your studies</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[{ id: 'search', l: '🔍 Search Papers' }, { id: 'saved', l: `📚 Saved Papers (${papers.length})` }, { id: 'databases', l: '🌐 Academic Databases' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: tab === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${tab === t.id ? '#2563eb' : 'var(--border)'}` }}>{t.l}</button>
          ))}
        </div>

        {tab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchPapers()} placeholder="Search for papers, e.g. 'machine learning healthcare' or 'climate change Africa'" style={{ flex: 1, minWidth: 280, padding: '11px 16px', borderRadius: 10, fontSize: 14, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.4)', color: '#e2e8f0', outline: 'none' }} />
              <select value={selectedField} onChange={e => setSelectedField(e.target.value)} style={{ padding: '11px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}>
                <option value="">All Fields</option>
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={searchPapers} disabled={searching} style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: searching ? 0.7 : 1 }}>
                {searching ? '⏳ Searching...' : '🔍 Search'}
              </button>
            </div>

            {results.length > 0 && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{results.length} papers found via Semantic Scholar</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {results.map((paper, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, lineHeight: 1.4, marginBottom: 6 }}>{paper.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {paper.authors?.slice(0, 3).map(a => a.name).join(', ')}{paper.authors?.length > 3 ? ` +${paper.authors.length - 3} more` : ''} · {paper.year}
                        {paper.citationCount !== undefined && ` · ${paper.citationCount} citations`}
                      </div>
                    </div>
                    <button onClick={() => savePaper(paper)} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>+ Save</button>
                  </div>

                  {paper.abstract && (
                    <div>
                      <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>{paper.abstract.slice(0, 300)}{paper.abstract.length > 300 ? '...' : ''}</p>
                      {aiSummary[paper.paperId] ? (
                        <div style={{ padding: '10px 14px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 9, fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                          <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 4 }}>🤖 AI PLAIN-ENGLISH SUMMARY</div>
                          {aiSummary[paper.paperId]}
                        </div>
                      ) : (
                        <button onClick={() => summarisePaper(paper.paperId, paper.abstract)} disabled={summarising === paper.paperId} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontWeight: 600, cursor: 'pointer', opacity: summarising === paper.paperId ? 0.7 : 1 }}>
                          {summarising === paper.paperId ? '⏳ Summarising...' : '🤖 Explain Simply'}
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <a href={paper.openAccessPdf?.url || `https://www.semanticscholar.org/paper/${paper.paperId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                      {paper.openAccessPdf ? '📄 Read Free PDF' : '🔗 View Paper'}
                    </a>
                    {paper.openAccessPdf && <span style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>Open Access ✓</span>}
                  </div>
                </div>
              ))}
            </div>

            {results.length === 0 && !searching && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🔬</div>
                <div>Search for academic papers above</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Powered by Semantic Scholar — 200M+ academic papers</div>
              </div>
            )}
          </div>
        )}

        {tab === 'saved' && (
          <div>
            {papers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📚</div>
                <div>No saved papers yet. Search and save papers above.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {papers.map(paper => (
                  <div key={paper.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>{paper.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{paper.authors} · {paper.year}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {paper.url && <a href={paper.url} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Read</a>}
                        <button onClick={() => deletePaper(paper.id)} style={{ padding: '5px 8px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>×</button>
                      </div>
                    </div>
                    {paper.abstract && <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{paper.abstract.slice(0, 200)}...</p>}
                    {paper.notes && <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, fontSize: 12, color: '#94a3b8' }}>📝 {paper.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'databases' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[
              { name: 'Google Scholar', desc: 'Largest academic search engine. Search any topic across all fields.', url: 'https://scholar.google.com', free: true, icon: '🎓' },
              { name: 'Semantic Scholar', desc: '200M+ papers with AI-powered search and citation analysis.', url: 'https://www.semanticscholar.org', free: true, icon: '🔬' },
              { name: 'arXiv', desc: 'Free preprints in CS, Math, Physics, Biology, Economics.', url: 'https://arxiv.org', free: true, icon: '📐' },
              { name: 'PubMed', desc: 'Biomedical and life sciences literature. NIH database.', url: 'https://pubmed.ncbi.nlm.nih.gov', free: true, icon: '🧬' },
              { name: 'JSTOR', desc: 'Humanities, social sciences, arts. Some free access.', url: 'https://www.jstor.org', free: false, icon: '📖' },
              { name: 'ResearchGate', desc: 'Social network for researchers. Many papers available free.', url: 'https://www.researchgate.net', free: true, icon: '🤝' },
              { name: 'Sci-Hub', desc: 'Access to paywalled papers. Legal status varies by country.', url: 'https://sci-hub.se', free: true, icon: '🔓', note: 'Legal status varies' },
              { name: 'SSRN', desc: 'Social Sciences and Humanities preprints and working papers.', url: 'https://www.ssrn.com', free: true, icon: '💼' },
              { name: 'African Journals Online', desc: 'African-published research across all disciplines.', url: 'https://www.ajol.info', free: true, icon: '🌍' },
            ].map((db, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 28 }}>{db.icon}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: db.free ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: db.free ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{db.free ? 'FREE' : 'SUBSCRIPTION'}</span>
                </div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>{db.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>{db.desc}</div>
                {db.note && <div style={{ fontSize: 10, color: '#f59e0b', marginBottom: 8 }}>⚠️ {db.note}</div>}
                <a href={db.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Open Database →</a>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}