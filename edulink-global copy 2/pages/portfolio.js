import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['web', 'mobile', 'data', 'ai/ml', 'design', 'other']
const CAT_COLORS = { web: '#2563eb', mobile: '#10b981', data: '#f59e0b', 'ai/ml': '#8b5cf6', design: '#ef4444', other: '#64748b' }

const TECH_OPTIONS = ['React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Python', 'Django', 'Flask', 'FastAPI', 'PostgreSQL', 'MongoDB', 'Firebase', 'Supabase', 'AWS', 'Docker', 'TypeScript', 'JavaScript', 'Java', 'Flutter', 'React Native', 'TensorFlow', 'PyTorch', 'Figma', 'Tailwind CSS', 'GraphQL', 'REST API']

export default function Portfolio() {
  const { user, profile } = useUser()
  const [projects, setProjects] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedDesc, setGeneratedDesc] = useState('')
  const [form, setForm] = useState({ title: '', description: '', tech_stack: [], live_url: '', github_url: '', image_url: '', category: 'web', featured: false })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchProjects() }, [user])

  const fetchProjects = async () => {
    const { data } = await supabase.from('portfolio_projects').select('*').eq('user_id', user.id).order('featured', { ascending: false }).order('created_at', { ascending: false })
    setProjects(data || [])
  }

  const saveProject = async () => {
    if (!form.title.trim()) { showToast('Enter a project title'); return }
    if (!user) { showToast('Sign in to save projects'); return }
    await supabase.from('portfolio_projects').insert({ user_id: user.id, ...form, description: generatedDesc || form.description })
    setForm({ title: '', description: '', tech_stack: [], live_url: '', github_url: '', image_url: '', category: 'web', featured: false })
    setGeneratedDesc('')
    setShowNew(false)
    fetchProjects()
    showToast('✅ Project added!')
  }

  const deleteProject = async (id) => {
    await supabase.from('portfolio_projects').delete().eq('id', id)
    fetchProjects()
    showToast('Project removed')
  }

  const toggleFeatured = async (project) => {
    await supabase.from('portfolio_projects').update({ featured: !project.featured }).eq('id', project.id)
    fetchProjects()
  }

  const generateDescription = async () => {
    if (!form.title) { showToast('Enter project title first'); return }
    setGenerating(true)
    setGeneratedDesc('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Write a compelling 3-4 sentence project description for a student portfolio for this project:
Title: ${form.title}
Tech Stack: ${form.tech_stack.join(', ') || 'not specified'}
Category: ${form.category}
Student field: ${profile?.field || 'Computer Science'}

Make it professional, highlight the impact and technical skills demonstrated. Start with what the project does, then what makes it interesting, then what you learned or achieved. Return only the description text.`
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
          if (d === '[DONE]') { setGeneratedDesc(full); setGenerating(false); return }
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setGeneratedDesc(full) } } catch {}
        }
      }
    } catch { showToast('❌ Error generating description') }
    setGenerating(false)
  }

  const copyPortfolioLink = () => {
    const url = `${window.location.origin}/p/${user?.id}`
    navigator.clipboard.writeText(url)
    showToast('📋 Portfolio link copied!')
  }

  const I = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 960, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🚀 Portfolio Builder</h1>
            <p style={{ color: '#64748b' }}>Showcase your projects to employers. AI writes professional descriptions for each one.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {projects.length > 0 && user && (
              <button onClick={copyPortfolioLink} style={{ padding: '9px 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🔗 Share Portfolio</button>
            )}
            <button onClick={() => setShowNew(!showNew)} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add Project</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { l: 'Projects', v: projects.length, c: '#2563eb' },
            { l: 'Featured', v: projects.filter(p => p.featured).length, c: '#f59e0b' },
            { l: 'With Live Demo', v: projects.filter(p => p.live_url).length, c: '#10b981' },
            { l: 'Open Source', v: projects.filter(p => p.github_url).length, c: '#8b5cf6' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* New project form */}
        {showNew && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>Add New Project</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={L}>Project Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. EduConnect — Student Networking App" style={I} />
              </div>
              <div>
                <label style={L}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={I}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={L}>Featured Project?</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setForm(p => ({ ...p, featured: v }))} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.featured === v ? 'rgba(245,158,11,0.15)' : 'var(--surface2)', color: form.featured === v ? '#f59e0b' : '#64748b', border: `1px solid ${form.featured === v ? '#f59e0b' : 'var(--border)'}` }}>
                      {v ? '⭐ Yes — Featured' : 'Regular'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={L}>Live URL</label>
                <input value={form.live_url} onChange={e => setForm(p => ({ ...p, live_url: e.target.value }))} placeholder="https://myproject.vercel.app" style={I} />
              </div>
              <div>
                <label style={L}>GitHub URL</label>
                <input value={form.github_url} onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} placeholder="https://github.com/you/project" style={I} />
              </div>
            </div>

            {/* Tech stack */}
            <div style={{ marginBottom: 14 }}>
              <label style={L}>Tech Stack (click to add)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {TECH_OPTIONS.map(t => {
                  const active = form.tech_stack.includes(t)
                  return (
                    <button key={t} onClick={() => setForm(p => ({ ...p, tech_stack: active ? p.tech_stack.filter(x => x !== t) : [...p.tech_stack, t] }))} style={{ padding: '4px 11px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.03)', color: active ? '#60a5fa' : '#64748b', border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>
                      {active ? '✓ ' : ''}{t}
                    </button>
                  )
                })}
              </div>
              {form.tech_stack.length > 0 && <div style={{ fontSize: 11, color: '#10b981' }}>Selected: {form.tech_stack.join(', ')}</div>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={L}>Project Description</label>
                <button onClick={generateDescription} disabled={generating || !form.title} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 600, cursor: 'pointer', opacity: generating ? 0.7 : 1 }}>
                  {generating ? '⏳ Writing...' : '🤖 AI Write Description'}
                </button>
              </div>
              <textarea value={generatedDesc || form.description} onChange={e => { setGeneratedDesc(e.target.value) }} rows={4} placeholder="Describe your project — what it does, technologies used, impact..." style={{ ...I, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveProject} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Add to Portfolio 🚀</button>
            </div>
          </div>
        )}

        {projects.length === 0 && !showNew ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🚀</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>No projects yet</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Add your projects — class assignments, personal builds, open source contributions all count!</div>
          </div>
        ) : (
          <>
            {projects.filter(p => p.featured).length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14, marginBottom: 14 }}>⭐ Featured Projects</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
                  {projects.filter(p => p.featured).map(proj => <ProjectCard key={proj.id} proj={proj} onDelete={deleteProject} onToggle={toggleFeatured} />)}
                </div>
              </div>
            )}
            {projects.filter(p => !p.featured).length > 0 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>All Projects</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                  {projects.filter(p => !p.featured).map(proj => <ProjectCard key={proj.id} proj={proj} onDelete={deleteProject} onToggle={toggleFeatured} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function ProjectCard({ proj, onDelete, onToggle }) {
  const color = CAT_COLORS[proj.category] || '#64748b'
  return (
    <div className="card-glow" style={{ background: 'var(--surface)', border: `1px solid ${proj.featured ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{proj.title}</div>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${color}15`, color, border: `1px solid ${color}30`, fontWeight: 700 }}>{proj.category}</span>
        </div>
        <button onClick={() => onToggle(proj)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: proj.featured ? '#f59e0b' : '#374151' }}>⭐</button>
      </div>
      {proj.description && <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{proj.description}</p>}
      {proj.tech_stack?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {proj.tech_stack.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
        {proj.live_url && <a href={proj.live_url} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>🌐 Live</a>}
        {proj.github_url && <a href={proj.github_url} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', textDecoration: 'none', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>💻 Code</a>}
        <button onClick={() => onDelete(proj.id)} style={{ padding: '7px 10px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>×</button>
      </div>
    </div>
  )
}