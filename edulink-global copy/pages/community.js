import { useState } from 'react'
import Navbar from '../components/Navbar'
import { WORLD_REGIONS } from '../data/globalData'

const STUDY_GROUPS = [
  { id:1, name:'AI & Machine Learning Hub', region:'all', flag:'🤖', members:342, field:'IT', active:true, desc:'Daily discussions on ML papers, coding challenges, and project collaboration.', tags:['Python','TensorFlow','Research'] },
  { id:2, name:'African Engineering Network', region:'africa', flag:'🌍', members:189, field:'Engineering', active:true, desc:'Engineering students across Africa sharing resources, projects, and opportunities.', tags:['Civil','Mechanical','Electrical'] },
  { id:3, name:'Fintech & Banking Students', region:'all', flag:'💳', members:256, field:'Finance', active:false, desc:'Discussing the future of finance, banking trends, and internship experiences.', tags:['Finance','Banking','Crypto'] },
  { id:4, name:'Web Dev Bootcamp Group', region:'all', flag:'🌐', members:511, field:'IT', active:true, desc:'Learn HTML, CSS, JavaScript, React together. Weekly coding challenges.', tags:['React','CSS','Projects'] },
  { id:5, name:'Asia-Pacific Business Circle', region:'asia', flag:'🌏', members:143, field:'Business', active:false, desc:'Business students from Asia and Oceania sharing case studies and job leads.', tags:['Strategy','Marketing','MBA'] },
  { id:6, name:'Medical Students Global', region:'all', flag:'🏥', members:298, field:'Medicine', active:true, desc:'Peer support, past papers, and clinical experience sharing for med students worldwide.', tags:['Clinical','Research','Exams'] },
  { id:7, name:'European Tech Talent', region:'europe', flag:'🏰', members:174, field:'IT', active:true, desc:'Tech students in Europe. Sharing Erasmus tips, internship leads, and project ideas.', tags:['Startups','Tech','EU'] },
  { id:8, name:'Design & Creative Arts Global', region:'all', flag:'🎨', members:221, field:'Design', active:false, desc:'UI/UX designers, graphic designers, and creative students sharing portfolios and feedback.', tags:['UI/UX','Branding','Portfolio'] },
]

const DISCUSSIONS = [
  { id:1, author:'Amara K.', country:'Ghana', flag:'🇬🇭', time:'2 hours ago', title:'Best resources for AWS certification?', replies:12, likes:34, field:'IT' },
  { id:2, author:'Lucas M.', country:'Brazil', flag:'🇧🇷', time:'5 hours ago', title:'Tips for applying to European internships as a non-EU student?', replies:28, likes:67, field:'Business' },
  { id:3, author:'Priya S.', country:'India', flag:'🇮🇳', time:'1 day ago', title:'How I got a Google internship — sharing my experience', replies:54, likes:213, field:'IT' },
  { id:4, author:'Chen W.', country:'Singapore', flag:'🇸🇬', time:'1 day ago', title:'MasterCard Foundation Scholars — application tips?', replies:19, likes:45, field:'All' },
  { id:5, author:'Sofia A.', country:'Nigeria', flag:'🇳🇬', time:'2 days ago', title:'Building a portfolio with no experience — what worked for me', replies:41, likes:89, field:'Design' },
  { id:6, author:'James O.', country:'Kenya', flag:'🇰🇪', time:'3 days ago', title:'DAAD Scholarship 2025 — anyone applied? Let\'s discuss!', replies:33, likes:72, field:'All' },
]

export default function Community() {
  const [activeTab, setActiveTab] = useState('groups')
  const [regionFilter, setRegionFilter] = useState('all')
  const [joined, setJoined] = useState([1, 4])
  const [liked, setLiked] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2300) }

  const toggleJoin = (id, name) => {
    setJoined(prev => {
      const isJoined = prev.includes(id)
      showToast(isJoined ? `Left: ${name}` : `Joined: ${name}!`)
      return isJoined ? prev.filter(s => s !== id) : [...prev, id]
    })
  }

  const toggleLike = (id) => setLiked(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])

  const filteredGroups = STUDY_GROUPS.filter(g => regionFilter === 'all' || g.region === regionFilter || g.region === 'all')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>👥 Global Community</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Connect with students worldwide — study groups, discussions, peer support</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'var(--surface)', borderRadius: 12, padding: 5, width: 'fit-content', border: '1px solid var(--border)' }}>
          {[{ id: 'groups', label: '👥 Study Groups' }, { id: 'discuss', label: '💬 Discussions' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: activeTab === tab.id ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#64748b',
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'groups' && (
          <>
            {/* Region filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {[{ id: 'all', name: 'All Regions', flag: '🌐', color: '#2563eb' }, ...WORLD_REGIONS].map(r => (
                <button key={r.id} onClick={() => setRegionFilter(r.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: regionFilter === r.id ? r.color : 'var(--surface)',
                  color: regionFilter === r.id ? '#fff' : '#94a3b8',
                  border: `1px solid ${regionFilter === r.id ? r.color : 'var(--border)'}`,
                }}>{r.flag} {r.name}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
              {filteredGroups.map(group => (
                <div key={group.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 32 }}>{group.flag}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.active ? '#10b981' : '#374151', display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: group.active ? '#10b981' : '#64748b' }}>{group.active ? 'Active' : 'Quiet'}</span>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 }}>{group.name}</div>
                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>{group.desc}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {group.tags.map(t => (
                      <span key={t} style={{ fontSize: 10, padding: '2px 9px', borderRadius: 5, background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>{t}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>👥 {group.members.toLocaleString()} members</span>
                    <button onClick={() => toggleJoin(group.id, group.name)} style={{
                      padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: joined.includes(group.id) ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                      color: joined.includes(group.id) ? '#10b981' : '#fff',
                      border: `1px solid ${joined.includes(group.id) ? '#10b981' : 'transparent'}`,
                    }}>{joined.includes(group.id) ? '✓ Joined' : 'Join Group'}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'discuss' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Post button */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => showToast('💬 Post feature coming soon!')}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
              <div style={{ flex: 1, padding: '9px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#64748b', fontSize: 13 }}>Start a discussion or ask a question...</div>
              <button style={{ padding: '9px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Post</button>
            </div>

            {DISCUSSIONS.map(post => (
              <div key={post.id} className="card-glow" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {post.flag}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{post.author}</span>
                        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>from {post.country}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{post.time}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{post.title}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => toggleLike(post.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                    color: liked.includes(post.id) ? '#2563eb' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5
                  }}>
                    {liked.includes(post.id) ? '👍' : '👍'} {post.likes + (liked.includes(post.id) ? 1 : 0)}
                  </button>
                  <button onClick={() => showToast('💬 Reply feature coming soon!')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    💬 {post.replies} replies
                  </button>
                  <button onClick={() => showToast('🔗 Link copied!')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    🔗 Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}