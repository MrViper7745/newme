import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const INCOME_IDEAS = [
  { title: 'Freelance Web Development', earn: '$15–80/hr', difficulty: 'Medium', time: '5–20hr/week', platforms: ['Upwork', 'Fiverr', 'Freelancer'], skills: 'HTML, CSS, JavaScript, React', icon: '💻', suitable: 'Can work from dorm, flexible hours' },
  { title: 'Graphic Design', earn: '$10–50/hr', difficulty: 'Easy', time: '3–15hr/week', platforms: ['Fiverr', '99designs', 'Canva Jobs'], skills: 'Canva, Figma, Photoshop', icon: '🎨', suitable: 'Perfect for creative students, work anytime' },
  { title: 'Online Tutoring', earn: '$15–60/hr', difficulty: 'Easy', time: '4–12hr/week', platforms: ['Preply', 'Superprof', 'Tutor.com'], skills: 'Subject knowledge, patience', icon: '📚', suitable: 'Teach what you already know from your courses' },
  { title: 'Content Writing', earn: '$10–40/hr', difficulty: 'Easy', time: '5–20hr/week', platforms: ['Upwork', 'ProBlogger', 'LinkedIn'], skills: 'Writing, research, SEO', icon: '✍️', suitable: 'Write blog posts between classes' },
  { title: 'Social Media Management', earn: '$200–800/client/mo', difficulty: 'Easy', time: '5–10hr/week/client', platforms: ['LinkedIn', 'Direct outreach'], skills: 'Content creation, scheduling', icon: '📱', suitable: 'Manage 2–3 small businesses, recurring income' },
  { title: 'Data Entry & Virtual Assistant', earn: '$8–20/hr', difficulty: 'Very Easy', time: '10–30hr/week', platforms: ['Upwork', 'Remote.co', 'Fiverr'], skills: 'Typing, Excel, attention to detail', icon: '⌨️', suitable: 'Entry level, no experience needed, flexible' },
  { title: 'Video Editing', earn: '$20–80/hr', difficulty: 'Medium', time: '5–15hr/week', platforms: ['Fiverr', 'Upwork', 'YouTube creators'], skills: 'Premiere Pro, DaVinci Resolve', icon: '🎬', suitable: 'High demand from YouTubers and businesses' },
  { title: 'Translation', earn: '$0.05–0.15/word', difficulty: 'Easy', time: 'Flexible', platforms: ['ProZ', 'Gengo', 'Upwork'], skills: 'Bilingual fluency', icon: '🌐', suitable: 'Translate between your native language and English' },
  { title: 'Photography & Editing', earn: '$50–300/session', difficulty: 'Medium', time: 'Weekends mainly', platforms: ['Instagram', 'Local businesses'], skills: 'Photography, Lightroom', icon: '📸', suitable: 'Shoot events on weekends, edit during the week' },
  { title: 'Survey & Research Panels', earn: '$2–10/survey', difficulty: 'Very Easy', time: '1–5hr/week', platforms: ['Toluna', 'Swagbucks', 'Prolific'], skills: 'None required', icon: '📋', suitable: 'Fill in during lectures or free time — easy passive income' },
  { title: 'Print on Demand', earn: '$100–1000/mo passive', difficulty: 'Easy', time: '5hr setup + passive', platforms: ['Redbubble', 'Merch by Amazon', 'Printify'], skills: 'Basic design', icon: '👕', suitable: 'Create once, earn while you sleep — true passive income' },
  { title: 'AI Prompt Engineering', earn: '$20–100/hr', difficulty: 'Medium', time: 'Flexible', platforms: ['PromptBase', 'Upwork', 'LinkedIn'], skills: 'AI tools knowledge, creativity', icon: '🤖', suitable: 'Fastest growing skill, sell AI prompts or AI services' },
]

const REMOTE_JOB_SITES = [
  { name: 'Remote.co', url: 'https://remote.co/remote-jobs', icon: '💼', desc: 'Curated remote jobs across all fields' },
  { name: 'We Work Remotely', url: 'https://weworkremotely.com', icon: '🌍', desc: 'Largest remote work community' },
  { name: 'Remotive', url: 'https://remotive.com', icon: '🚀', desc: 'Hand-screened remote tech jobs' },
  { name: 'Upwork', url: 'https://upwork.com', icon: '💻', desc: 'Freelance projects in any skill' },
  { name: 'Fiverr', url: 'https://fiverr.com', icon: '🎯', desc: 'Sell services starting from $5' },
  { name: 'Toptal', url: 'https://toptal.com', icon: '⭐', desc: 'Top 3% of talent — premium rates' },
  { name: 'Turing', url: 'https://turing.com', icon: '🔬', desc: 'Remote developer jobs, USD salaries' },
  { name: 'Andela', url: 'https://andela.com', icon: '🌍', desc: 'African tech talent, global companies' },
  { name: 'Deel', url: 'https://deel.com/careers', icon: '💳', desc: 'Get paid from any country' },
]

const EXPENSE_CATEGORIES = ['Rent', 'Food', 'Transport', 'Books/Stationery', 'Airtime/Data', 'Entertainment', 'Clothing', 'Fees', 'Other']
const INCOME_CATEGORIES = ['Freelance', 'Allowance', 'Part-time Job', 'Tutoring', 'Sales', 'Gift', 'Bursary', 'Other']

const streamRequest = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
        if (d === '[DONE]') { onDone(full); return }
        try { const p = JSON.parse(d); if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function Income() {
  const { user, profile } = useUser()
  const [tab, setTab] = useState('remote')
  const [transactions, setTransactions] = useState([])
  const [projects, setProjects] = useState([])
  const [toast, setToast] = useState(null)
  const [aiAdvice, setAiAdvice] = useState('')
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)

  const [txForm, setTxForm] = useState({ type: 'expense', category: 'Food', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
  const [projectForm, setProjectForm] = useState({ title: '', client: '', rate: '', rate_type: 'hourly', status: 'active', deadline: '', description: '' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) { fetchTransactions(); fetchProjects() } }, [user])

  const fetchTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50)
    setTransactions(data || [])
  }

  const fetchProjects = async () => {
    const { data } = await supabase.from('freelance_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setProjects(data || [])
  }

  const addTransaction = async () => {
    if (!txForm.amount || !txForm.category) { showToast('Fill in all fields'); return }
    await supabase.from('transactions').insert({ user_id: user.id, ...txForm, amount: parseFloat(txForm.amount) })
    setTxForm({ type: 'expense', category: 'Food', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
    setShowAddTx(false); fetchTransactions(); showToast('✅ Logged!')
  }

  const addProject = async () => {
    if (!projectForm.title) { showToast('Enter project title'); return }
    await supabase.from('freelance_projects').insert({ user_id: user.id, ...projectForm, rate: parseFloat(projectForm.rate) || 0 })
    setProjectForm({ title: '', client: '', rate: '', rate_type: 'hourly', status: 'active', deadline: '', description: '' })
    setShowAddProject(false); fetchProjects(); showToast('✅ Project added!')
  }

  const logHours = async (id, hours, rate, rateType) => {
    const p = projects.find(x => x.id === id)
    const newHours = (p.hours_logged || 0) + hours
    const earned = rateType === 'hourly' ? newHours * rate : (p.total_earned || 0)
    await supabase.from('freelance_projects').update({ hours_logged: newHours, total_earned: earned }).eq('id', id)
    fetchProjects(); showToast(`+${hours}h logged!`)
  }

  const getAIAdvice = async () => {
    setLoadingAdvice(true); setAiAdvice('')
    await streamRequest({
      messages: [{
        role: 'user',
        content: `Give practical, actionable advice for a university student who wants to earn extra income while studying.
Student profile:
- Field: ${profile?.field || 'general'}
- Country: ${profile?.country || 'global'}
- Skills: ${profile?.skills?.join(', ') || 'not specified'}

Give:
1. Top 3 income ideas best suited to their skills and location
2. How much they can realistically earn per month starting out
3. Which platform to start with and exact first steps
4. How to manage income alongside studying (time management)
5. One mindset tip for student entrepreneurs

Be specific, encouraging, and realistic. Max 300 words.`
      }]
    }, c => setAiAdvice(c), () => setLoadingAdvice(false), e => { showToast('❌ ' + e); setLoadingAdvice(false) })
  }

  // Financial stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const freelanceEarned = projects.reduce((s, p) => s + (p.total_earned || 0), 0)

  const I = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }

  const TABS = [
    { id: 'remote', label: '🌍 Remote Jobs' },
    { id: 'ideas', label: '💡 Income Ideas' },
    { id: 'freelance', label: '💻 My Projects' },
    { id: 'budget', label: '💰 Money Tracker' },
    { id: 'advice', label: '🤖 AI Advice' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>💰 Income & Money Hub</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Find remote jobs, track freelance projects, manage your money, and get AI-powered income advice — all in one place</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { l: 'Money In', v: `$${totalIncome.toFixed(0)}`, c: '#10b981' },
            { l: 'Money Out', v: `$${totalExpense.toFixed(0)}`, c: '#ef4444' },
            { l: 'Balance', v: `$${balance.toFixed(0)}`, c: balance >= 0 ? '#10b981' : '#ef4444' },
            { l: 'Freelance Earned', v: `$${freelanceEarned.toFixed(0)}`, c: '#2563eb' },
            { l: 'Active Projects', v: projects.filter(p => p.status === 'active').length, c: '#f59e0b' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '11px 18px', border: 'none', cursor: 'pointer', background: 'transparent', whiteSpace: 'nowrap', color: tab === t.id ? '#60a5fa' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: 13, borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>

        {/* REMOTE JOBS */}
        {tab === 'remote' && (
          <div>
            <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(16,185,129,0.08))', border: '1px solid rgba(37,99,235,0.2)' }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16, marginBottom: 6 }}>🌍 Work From Anywhere — Get Paid in USD</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                These platforms let you earn in hard currency from your laptop, anywhere in the world. Many students earn $200–$1,500/month part-time while studying.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 32 }}>
              {REMOTE_JOB_SITES.map((site, i) => (
                <a key={i} href={site.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, cursor: 'pointer', height: '100%' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{site.icon}</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{site.name}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14 }}>{site.desc}</div>
                    <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>Visit Site →</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Getting started guide */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>🚀 How to Get Your First Remote Job as a Student</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                {[
                  { step: '01', title: 'Pick ONE skill', desc: 'Don\'t try to offer everything. Pick the skill you are best at and focus on it for your first 3 months.' },
                  { step: '02', title: 'Create your profile', desc: 'Sign up on Upwork or Fiverr. Write a clear profile. Add 2–3 portfolio samples even if they are practice projects.' },
                  { step: '03', title: 'Start low, build reviews', desc: 'Accept your first 3–5 jobs at a lower rate to build reviews. Reviews are worth more than the money at this stage.' },
                  { step: '04', title: 'Raise your rate', desc: 'After 5+ positive reviews, increase your rate by 20%. Repeat every 10 jobs. Top students earn $50+/hr within 6 months.' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 18, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {s.step}</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INCOME IDEAS */}
        {tab === 'ideas' && (
          <div>
            <div style={{ marginBottom: 20, fontSize: 13, color: '#64748b' }}>
              All ideas below can be done from your phone or laptop while at university. Sorted from easiest to hardest to start.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
              {INCOME_IDEAS.map((idea, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{idea.icon}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: idea.difficulty === 'Very Easy' ? 'rgba(16,185,129,0.12)' : idea.difficulty === 'Easy' ? 'rgba(96,165,250,0.12)' : 'rgba(245,158,11,0.12)', color: idea.difficulty === 'Very Easy' ? '#10b981' : idea.difficulty === 'Easy' ? '#60a5fa' : '#f59e0b', fontWeight: 700 }}>{idea.difficulty}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{idea.title}</div>
                  <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>💰 {idea.earn}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>⏱ {idea.time}</div>
                  <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 8 }}>🛠 {idea.skills}</div>
                  <div style={{ fontSize: 12, color: '#10b981', marginBottom: 12, padding: '6px 10px', background: 'rgba(16,185,129,0.07)', borderRadius: 7 }}>✅ {idea.suitable}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {idea.platforms.map(p => (
                      <span key={p} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FREELANCE PROJECTS */}
        {tab === 'freelance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>My Freelance Projects</div>
              <button onClick={() => setShowAddProject(!showAddProject)} style={{ padding: '9px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Project</button>
            </div>

            {showAddProject && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[{ k: 'title', l: 'Project Title *', p: 'Website for local restaurant' }, { k: 'client', l: 'Client Name', p: 'Sarah\'s Bakery' }].map(f => (
                    <div key={f.k}><label style={L}>{f.l}</label><input value={projectForm[f.k]} onChange={e => setProjectForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={I} /></div>
                  ))}
                  <div>
                    <label style={L}>Rate & Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" value={projectForm.rate} onChange={e => setProjectForm(p => ({ ...p, rate: e.target.value }))} placeholder="25" style={{ ...I, flex: 1 }} />
                      <select value={projectForm.rate_type} onChange={e => setProjectForm(p => ({ ...p, rate_type: e.target.value }))} style={{ ...I, width: 100 }}>
                        <option value="hourly">/ hour</option>
                        <option value="fixed">fixed</option>
                        <option value="monthly">/ month</option>
                      </select>
                    </div>
                  </div>
                  <div><label style={L}>Deadline</label><input type="date" value={projectForm.deadline} onChange={e => setProjectForm(p => ({ ...p, deadline: e.target.value }))} style={I} /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={L}>Description</label><input value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this project involve?" style={I} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowAddProject(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addProject} style={{ flex: 2, padding: '10px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Project</button>
                </div>
              </div>
            )}

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💻</div>
                <div>No projects yet. Add your first freelance project above.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {projects.map(proj => (
                  <div key={proj.id} style={{ background: 'var(--surface)', border: `1px solid ${proj.status === 'active' ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderLeft: `4px solid ${proj.status === 'active' ? '#10b981' : proj.status === 'completed' ? '#2563eb' : '#64748b'}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{proj.title}</div>
                        {proj.client && <div style={{ fontSize: 12, color: '#64748b' }}>Client: {proj.client}</div>}
                        {proj.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{proj.description}</div>}
                      </div>
                      <select value={proj.status} onChange={async e => { await supabase.from('freelance_projects').update({ status: e.target.value }).eq('id', proj.id); fetchProjects() }}
                        style={{ padding: '4px 8px', borderRadius: 7, fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', cursor: 'pointer', outline: 'none' }}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                      {[
                        { l: 'Rate', v: proj.rate ? `$${proj.rate}/${proj.rate_type === 'hourly' ? 'hr' : proj.rate_type}` : '—' },
                        { l: 'Hours', v: `${proj.hours_logged || 0}h` },
                        { l: 'Earned', v: `$${(proj.total_earned || 0).toFixed(0)}` },
                      ].map(s => (
                        <div key={s.l} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{s.v}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {proj.status === 'active' && proj.rate_type === 'hourly' && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>Log hours:</span>
                        {[0.5, 1, 2, 3, 4, 8].map(h => (
                          <button key={h} onClick={() => logHours(proj.id, h, proj.rate, proj.rate_type)} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa' }}>+{h}h</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MONEY TRACKER */}
        {tab === 'budget' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>Income & Expense Tracker</div>
              <button onClick={() => setShowAddTx(!showAddTx)} style={{ padding: '9px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Log Transaction</button>
            </div>

            {showAddTx && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {['expense', 'income'].map(t => (
                    <button key={t} onClick={() => setTxForm(p => ({ ...p, type: t, category: t === 'income' ? 'Freelance' : 'Food' }))} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: txForm.type === t ? (t === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'var(--surface2)', color: txForm.type === t ? (t === 'income' ? '#10b981' : '#ef4444') : '#64748b', border: `1px solid ${txForm.type === t ? (t === 'income' ? '#10b981' : '#ef4444') : 'var(--border)'}` }}>
                      {t === 'income' ? '💚 Income' : '🔴 Expense'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={L}>Category</label>
                    <select value={txForm.category} onChange={e => setTxForm(p => ({ ...p, category: e.target.value }))} style={I}>
                      {(txForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={L}>Amount</label><input type="number" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={I} /></div>
                  <div><label style={L}>Date</label><input type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} style={I} /></div>
                  <div><label style={L}>Description (optional)</label><input value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Paid for tutoring session" style={I} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowAddTx(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addTransaction} style={{ flex: 2, padding: '10px', borderRadius: 9, background: txForm.type === 'income' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Log {txForm.type}</button>
                </div>
              </div>
            )}

            {/* Balance summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                { l: 'Total Income', v: `$${totalIncome.toFixed(2)}`, c: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
                { l: 'Total Expenses', v: `$${totalExpense.toFixed(2)}`, c: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
                { l: 'Current Balance', v: `$${balance.toFixed(2)}`, c: balance >= 0 ? '#10b981' : '#ef4444', bg: `rgba(${balance >= 0 ? '16,185,129' : '239,68,68'},0.08)`, border: `rgba(${balance >= 0 ? '16,185,129' : '239,68,68'},0.25)` },
              ].map(s => (
                <div key={s.l} style={{ padding: '18px', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Transactions list */}
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
                <div>No transactions yet. Start logging your income and expenses.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transactions.map(tx => (
                  <div key={tx.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: tx.type === 'income' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {tx.type === 'income' ? '💚' : '🔴'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{tx.category}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{tx.description || ''} · {tx.date}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: tx.type === 'income' ? '#10b981' : '#ef4444', fontSize: 15 }}>
                      {tx.type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI ADVICE */}
        {tab === 'advice' && (
          <div style={{ maxWidth: 740, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🤖</div>
              <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22, marginBottom: 8 }}>AI Income Coach</h2>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>Get personalised advice on how to earn extra income as a student based on your skills, field, and country.</p>
            </div>
            <button onClick={getAIAdvice} disabled={loadingAdvice} style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 12, background: loadingAdvice ? 'var(--surface)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: loadingAdvice ? '#64748b' : '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: loadingAdvice ? 'not-allowed' : 'pointer', marginBottom: 24 }}>
              {loadingAdvice ? '⏳ Getting your personalised advice...' : '🤖 Get My Income Advice'}
            </button>
            {aiAdvice && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, padding: 26 }}>
                <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: aiAdvice.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>').replace(/##(.*)/g, '<h3 style="color:#a78bfa;margin:16px 0 8px;font-size:16px">$1</h3>') }} />
              </div>
            )}

            {/* Rate calculator */}
            <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>💰 Rate Calculator — What Should You Charge?</div>
              <RateCalc />
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function RateCalc() {
  const [monthly, setMonthly] = useState(500)
  const [hours, setHours] = useState(10)
  const [tax, setTax] = useState(15)
  const hoursMonth = hours * 4.33
  const gross = monthly / (1 - tax / 100)
  const rate = gross / hoursMonth
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <div>
        {[
          { l: 'Monthly take-home target ($)', v: monthly, set: setMonthly, min: 50, max: 5000 },
          { l: 'Hours available per week', v: hours, set: setHours, min: 1, max: 40 },
          { l: 'Tax estimate (%)', v: tax, set: setTax, min: 0, max: 40 },
        ].map(f => (
          <div key={f.l} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{f.v}</span>
            </div>
            <input type="range" min={f.min} max={f.max} value={f.v} onChange={e => f.set(+e.target.value)} style={{ width: '100%', accentColor: '#2563eb' }} />
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.08))', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Minimum hourly rate</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: '#60a5fa' }}>${rate.toFixed(0)}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>per hour</div>
        <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
          {hoursMonth.toFixed(0)}h / month needed<br />
          ${gross.toFixed(0)} gross before tax
        </div>
      </div>
    </div>
  )
}