import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

export default function MobileBookClub() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [clubs, setClubs] = useState([])
  const [activeClub, setActiveClub] = useState(null)
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', book_title: '', book_author: '', subject: '', chapter_pace: '', description: '' })
  const [newDiscussion, setNewDiscussion] = useState('')
  const [posting, setPosting] = useState(false)
  const [aiQuestion, setAiQuestion] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('book_clubs')
      .select('*, members:book_club_members(count)')
      .eq('active', true)
      .order('created_at', { ascending: false })
    setClubs(data || [])
    setLoading(false)
  }

  const loadDiscussions = async (clubId) => {
    const { data } = await supabase.from('book_club_posts')
      .select('*, author:profiles!user_id(name,username,avatar_url)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(30)
    setDiscussions(data || [])
  }

  const openClub = async (club) => {
    haptic.tap()
    setActiveClub(club)
    await loadDiscussions(club.id)
    await supabase.from('book_club_members').upsert({ club_id: club.id, user_id: user.id }, { onConflict: 'club_id,user_id' })
  }

  const postDiscussion = async () => {
    if (!newDiscussion.trim() || !activeClub) return
    setPosting(true)
    await supabase.from('book_club_posts').insert({
      club_id: activeClub.id,
      user_id: user.id,
      content: newDiscussion.trim(),
      created_at: new Date().toISOString(),
    })
    setNewDiscussion('')
    setPosting(false)
    haptic.success()
    loadDiscussions(activeClub.id)
  }

  const generateAIQuestion = async () => {
    if (!activeClub) return
    setLoadingAI(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate a thoughtful discussion question for a university book club reading "${activeClub.book_title}" by ${activeClub.book_author || 'the author'}${activeClub.subject ? ` for a ${activeClub.subject} course` : ''}. The question should promote critical thinking and group discussion. Return only the question, nothing else.`
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
          try { const p = JSON.parse(d); if (p.text) full += p.text } catch {}
        }
      }
      setAiQuestion(full.trim())
    } catch {}
    setLoadingAI(false)
  }

  const createClub = async () => {
    if (!form.name || !form.book_title) return
    await supabase.from('book_clubs').insert({ ...form, created_by: user.id, active: true })
    setShowCreate(false)
    setForm({ name: '', book_title: '', book_author: '', subject: '', chapter_pace: '', description: '' })
    load()
  }

  const timeAgo = (ts) => {
    const d = Math.floor((Date.now() - new Date(ts)) / 1000)
    if (d < 60) return 'just now'
    if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`
    return `${Math.floor(d / 86400)}d ago`
  }

  if (activeClub) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => { setActiveClub(null); setDiscussions([]) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeClub.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>📖 {activeClub.book_title}</div>
          </div>
          <button onClick={generateAIQuestion} disabled={loadingAI}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            {loadingAI ? '⏳' : '🤖 Question'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {aiQuestion && (
            <div style={{ padding: '14px', borderRadius: 13, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>🤖 AI Discussion Question</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>{aiQuestion}</div>
              <button onClick={() => setNewDiscussion(aiQuestion)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Use as discussion prompt
              </button>
            </div>
          )}

          {discussions.map((d, i) => (
            <div key={d.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {d.author?.avatar_url ? <img src={d.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (d.author?.name || '?')[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{d.author?.name || 'Student'} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· {timeAgo(d.created_at)}</span></div>
                  <div style={{ padding: '10px 13px', borderRadius: '4px 14px 14px 14px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                    {d.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {discussions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📖</div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>No discussions yet — start the conversation!</div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <textarea value={newDiscussion} onChange={e => setNewDiscussion(e.target.value)}
            placeholder="Share your thoughts on this chapter..."
            rows={2}
            style={{ flex: 1, padding: '10px 13px', borderRadius: 12, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} />
          <button onClick={postDiscussion} disabled={!newDiscussion.trim() || posting}
            style={{ width: 42, height: 42, borderRadius: '50%', background: newDiscussion.trim() ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0 }}>
            ↑
          </button>
        </div>
      </div>
    )
  }

  return (
    <MobileLayout title="📖 Book Club" rightAction={
      <button onClick={() => setShowCreate(true)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Club</button>
    }>
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>Loading clubs...</div>
        ) : clubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No book clubs yet</div>
            <button onClick={() => setShowCreate(true)} style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Start a Club</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clubs.map(club => (
              <div key={club.id} onClick={() => openClub(club)}
                style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
                onTouchEnd={e => e.currentTarget.style.background = 'var(--surface)'}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{club.name}</div>
                <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 4 }}>📖 {club.book_title}{club.book_author ? ` — ${club.book_author}` : ''}</div>
                {club.subject && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>📚 {club.subject}</div>}
                {club.description && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{club.description.slice(0, 80)}{club.description.length > 80 ? '...' : ''}</div>}
                {club.chapter_pace && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>📅 Pace: {club.chapter_pace}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileBottomSheet open={showCreate} onClose={() => setShowCreate(false)} title="📖 Start a Book Club" height="80vh">
        <div style={{ padding: '16px' }}>
          {[
            { key: 'name', label: 'Club Name *', placeholder: 'e.g. Engineering Ethics Reading Group' },
            { key: 'book_title', label: 'Book Title *', placeholder: 'e.g. The Lean Startup' },
            { key: 'book_author', label: 'Author', placeholder: 'e.g. Eric Ries' },
            { key: 'subject', label: 'Subject / Module', placeholder: 'e.g. Business Management 301' },
            { key: 'chapter_pace', label: 'Reading Pace', placeholder: 'e.g. 2 chapters per week' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this club about? Who should join?" rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <button onClick={createClub} disabled={!form.name || !form.book_title}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: form.name && form.book_title ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: form.name && form.book_title ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            📖 Create Club
          </button>
        </div>
      </MobileBottomSheet>
    </MobileLayout>
  )
}