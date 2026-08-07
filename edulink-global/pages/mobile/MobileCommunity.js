import { useState, useEffect, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import PullToRefresh from '../../components/mobile/PullToRefresh'
import MobileEduBotBubble from '../../components/mobile/MobileEduBotBubble'
import useHaptic from '../../hooks/useHaptic'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

export default function MobileCommunity() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [activeTab, setActiveTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [groups, setGroups] = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [groupInput, setGroupInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState('text')
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const msgEndRef = useRef(null)
  const channelRef = useRef(null)

  const myName = profile?.name || profile?.username || user?.email?.split('@')[0] || 'Student'
  const myUsername = profile?.username || null

  useEffect(() => { if (user) { loadPosts(); loadGroups() } }, [user])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [groupMessages])

  useEffect(() => {
    if (!activeGroup?.id) return
    loadGroupMessages(activeGroup.id)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`mobile_group_${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeGroup.id}` }, (payload) => {
        if (!payload.new) return
        setGroupMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
    channelRef.current = ch
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [activeGroup?.id])

  const loadPosts = async () => {
    setLoading(true)
    const { data } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(30)
    setPosts(data || [])
    setLoading(false)
  }

  const loadGroups = async () => {
    const { data } = await supabase.from('group_chats').select('*').eq('is_public', true).order('created_at', { ascending: false })
    setGroups(data || [])
  }

  const loadGroupMessages = async (gid) => {
    setLoadingMsgs(true)
    const { data } = await supabase.from('group_messages').select('*').eq('group_id', gid).order('created_at', { ascending: true }).limit(100)
    setGroupMessages(data || [])
    setLoadingMsgs(false)
  }

  const openGroup = async (group) => {
    haptic.tap()
    const members = Array.isArray(group.members) ? group.members : []
    if (!members.includes(user.id)) {
      const newMembers = [...members, user.id]
      await supabase.from('group_chats').update({ members: newMembers }).eq('id', group.id)
      await supabase.from('group_messages').insert({ group_id: group.id, user_id: user.id, username: myUsername, display_name: myName, content: `${myName} joined the group 👋`, message_type: 'system', created_at: new Date().toISOString() })
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members: newMembers } : g))
    }
    setActiveGroup(group)
  }

  const sendGroupMessage = async () => {
    const content = groupInput.trim()
    if (!content || !activeGroup || sending) return
    setSending(true)
    setGroupInput('')
    haptic.tap()
    const tempId = `temp_${Date.now()}`
    const tempMsg = { id: tempId, group_id: activeGroup.id, user_id: user.id, username: myUsername, display_name: myName, content, message_type: 'text', created_at: new Date().toISOString(), _temp: true }
    setGroupMessages(prev => [...prev, tempMsg])
    try {
      const { data: saved, error } = await supabase.from('group_messages').insert({ group_id: activeGroup.id, user_id: user.id, username: myUsername, display_name: myName, content, message_type: 'text', created_at: new Date().toISOString() }).select().single()
      if (error) setGroupMessages(prev => prev.filter(m => m.id !== tempId))
      else setGroupMessages(prev => prev.map(m => m.id === tempId ? saved : m))
    } catch { setGroupMessages(prev => prev.filter(m => m.id !== tempId)) }
    setSending(false)
  }

  const submitPost = async () => {
    if (!postContent.trim()) return
    try {
      const { data } = await supabase.from('community_posts').insert({ user_id: user.id, username: myUsername, display_name: myName, content: postContent, post_type: postType, likes: [], created_at: new Date().toISOString() }).select().single()
      if (data) setPosts(prev => [data, ...prev])
      setPostContent(''); setShowNewPost(false)
    } catch {}
  }

  const toggleLike = async (post) => {
    haptic.tap()
    const likes = Array.isArray(post.likes) ? post.likes : []
    const newLikes = likes.includes(user.id) ? likes.filter(id => id !== user.id) : [...likes, user.id]
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes } : p))
    await supabase.from('community_posts').update({ likes: newLikes }).eq('id', post.id)
  }

  // Full-screen group chat
  if (activeGroup) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => setActiveGroup(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>← Back</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{activeGroup.avatar || '👥'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeGroup.name}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{Array.isArray(activeGroup.members) ? activeGroup.members.length : 0} members · Type /ask for AI help</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, WebkitOverflowScrolling: 'touch' }}>
          {loadingMsgs ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>Loading messages...</div>
          ) : groupMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{activeGroup.avatar || '👥'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)' }}>Welcome to {activeGroup.name}!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Send a message or type /ask [question] for AI help</div>
            </div>
          ) : groupMessages.map((msg, i) => {
            if (msg.message_type === 'system') {
              return <div key={msg.id || i} style={{ textAlign: 'center', margin: '6px 0' }}><span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '3px 10px', borderRadius: 10 }}>{msg.content}</span></div>
            }
            const isMe = msg.user_id === user.id
            const isAI = msg.username === 'edubot'
            const showName = i === 0 || groupMessages[i-1]?.user_id !== msg.user_id
            return (
              <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {showName && !isMe && <div style={{ fontSize: 10, color: isAI ? '#60a5fa' : 'var(--text3)', marginBottom: 3, paddingLeft: 4, fontWeight: 600 }}>{msg.display_name || 'Student'}</div>}
                <div style={{ padding: '9px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : isAI ? 'rgba(37,99,235,0.08)' : 'var(--surface)', border: (isMe ? 'none' : '1px solid var(--border)'), color: isMe ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.6, maxWidth: '80%', whiteSpace: 'pre-wrap', opacity: msg._temp ? 0.7 : 1 }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, paddingLeft: isMe ? 0 : 4 }}>{timeAgo(msg.created_at)}{msg._temp ? ' · sending...' : ''}</div>
              </div>
            )
          })}
          <div ref={msgEndRef} />
        </div>

        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <input value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendGroupMessage()}
            disabled={sending}
            placeholder={`Message ${activeGroup.name}... or /ask`}
            style={{ flex: 1, padding: '11px 14px', borderRadius: 22, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--text)', outline: 'none' }} />
          <button onClick={sendGroupMessage} disabled={!groupInput.trim() || sending}
            style={{ width: 42, height: 42, borderRadius: '50%', background: groupInput.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ↑
          </button>
        </div>
      </div>
    )
  }

  return (
    <MobileLayout title="🌍 Community" rightAction={
      <button onClick={() => setShowNewPost(true)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏️ Post</button>
    }>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
        {[{ id: 'feed', label: '📰 Feed' }, { id: 'groups', label: `👥 Groups (${groups.length})` }].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); haptic.tap() }}
            style={{ flex: 1, padding: '12px 0', border: 'none', background: 'transparent', color: activeTab === t.id ? '#60a5fa' : 'var(--text3)', fontWeight: activeTab === t.id ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${activeTab === t.id ? '#2563eb' : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      <PullToRefresh onRefresh={activeTab === 'feed' ? loadPosts : loadGroups}>
        <div style={{ padding: '12px 16px' }}>
          {activeTab === 'feed' && (
            loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                Loading feed...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {posts.map(post => {
                  const likes = Array.isArray(post.likes) ? post.likes : []
                  const liked = likes.includes(user?.id)
                  return (
                    <div key={post.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {(post.display_name || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{post.display_name || 'Student'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(post.created_at)}</div>
                        </div>
                      </div>
                      {post.content && <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{post.content}</div>}
                      {post.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                          {post.tags.map((tag, i) => <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.15)' }}>{tag}</span>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <button onClick={() => toggleLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: liked ? '#ef4444' : 'var(--text3)', fontWeight: liked ? 700 : 400 }}>
                          {liked ? '❤️' : '🤍'} {likes.length}
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)' }}>
                          💬 Comment
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'groups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map(group => {
                const members = Array.isArray(group.members) ? group.members : []
                const isMember = members.includes(user?.id)
                return (
                  <div key={group.id} onClick={() => openGroup(group)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                      {group.avatar || '👥'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{members.length} member{members.length !== 1 ? 's' : ''}{group.subject ? ` · ${group.subject}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {isMember ? <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Joined</span> : <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>Join →</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* New post sheet */}
      <MobileBottomSheet open={showNewPost} onClose={() => setShowNewPost(false)} title="✏️ New Post" height="75vh">
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['text', 'question', 'link'].map(t => (
              <button key={t} onClick={() => setPostType(t)} style={{ flex: 1, padding: '8px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: postType === t ? 'rgba(37,99,235,0.15)' : 'var(--surface2)', color: postType === t ? '#60a5fa' : 'var(--text3)', border: `1px solid ${postType === t ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
                {t === 'text' ? '💬 Post' : t === 'question' ? '❓ Question' : '🔗 Link'}
              </button>
            ))}
          </div>
          <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
            placeholder={postType === 'question' ? 'What is your question? Be specific...' : 'Share something with the community...'}
            rows={8}
            style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit', marginBottom: 14 }}
            autoFocus />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowNewPost(false); setPostContent('') }} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submitPost} disabled={!postContent.trim()} style={{ flex: 2, padding: '12px', borderRadius: 11, background: postContent.trim() ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: postContent.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🚀 Post</button>
          </div>
        </div>
      </MobileBottomSheet>

      <MobileEduBotBubble />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}