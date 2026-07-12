import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const TAGS = [
  '#Engineering', '#Mathematics', '#Physics', '#ComputerScience',
  '#Chemistry', '#Economics', '#Law', '#Medicine',
  '#Question', '#Resources', '#Tips', '#Internships', '#General',
]
const POST_TYPE_ICONS = { text: '💬', question: '❓', image: '🖼️', document: '📄', link: '🔗' }
const GROUP_EMOJIS = ['👥', '📚', '🎓', '💡', '🔬', '⚡', '💻', '🧪', '📐', '🌍', '🏗️', '🎯']

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ name, size = 36, color = 'linear-gradient(135deg,#7c3aed,#2563eb)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {(name || '?')[0]?.toUpperCase()}
    </div>
  )
}

export default function Community() {
  const { user, profile } = useUser()

  // Derive these safely — they can be null on first render
  const myUsername = profile?.username || null
  const myName = profile?.name || profile?.username || user?.email?.split('@')[0] || 'Student'

  const [activeTab, setActiveTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTag, setActiveTag] = useState(null)

  // New post state
  const [showNewPost, setShowNewPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState('text')
  const [postTags, setPostTags] = useState([])
  const [postImages, setPostImages] = useState([])
  const [postDoc, setPostDoc] = useState(null)
  const [postLink, setPostLink] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Comments state
  const [expandedPost, setExpandedPost] = useState(null)
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [submittingComment, setSubmittingComment] = useState(null)

  // Groups state
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [groupInput, setGroupInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupSubject, setNewGroupSubject] = useState('')
  const [newGroupAvatar, setNewGroupAvatar] = useState('👥')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)
  const groupFileRef = useRef(null)
  const msgEndRef = useRef(null)

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => {
    if (user) { loadPosts(); loadGroups() }
  }, [user])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [groupMessages])

  useEffect(() => {
    if (!activeGroup?.id || !user) return
    loadGroupMessages(activeGroup.id)

    const channel = supabase
      .channel(`group_chat_${activeGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${activeGroup.id}`,
      }, payload => {
        setGroupMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeGroup?.id])

  const loadPosts = async () => {
    setLoadingPosts(true)
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setPosts(data || [])
    setLoadingPosts(false)
  }

  const loadGroups = async () => {
    setLoadingGroups(true)
    const { data } = await supabase
      .from('group_chats')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setGroups(data || [])
    setLoadingGroups(false)
  }

  const loadGroupMessages = async (groupId) => {
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)
    setGroupMessages(data || [])
  }

  const loadComments = async (postId) => {
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [postId]: data || [] }))
  }

  const uploadFile = async (file, bucket = 'community') => {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files).slice(0, 4)
    const previews = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setPostImages(prev => [...prev, ...previews].slice(0, 4))
    setPostType('image')
  }

  const handleDocSelect = (e) => {
    const file = e.target.files[0]
    if (file) { setPostDoc(file); setPostType('document') }
  }

  // ── SUBMIT POST (with optimistic update) ─────────────────────
  const submitPost = async () => {
    const content = postContent.trim()
    if (!content && !postImages.length && !postDoc) return
    if (!user?.id) { showToast('❌ Please wait — still loading your account'); return }

    setSubmittingPost(true)
    try {
      let imageUrls = []
      let documentUrl = null
      let documentName = null

      for (const img of postImages) {
        const url = await uploadFile(img.file)
        imageUrls.push(url)
      }
      if (postDoc) {
        documentUrl = await uploadFile(postDoc)
        documentName = postDoc.name
      }

      const { data: newPost, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          username: myUsername,
          display_name: myName,
          content,
          post_type: postType,
          image_urls: imageUrls,
          document_url: documentUrl,
          document_name: documentName,
          link_url: postLink || null,
          tags: postTags,
          likes: [],
          views: 0,
        })
        .select()
        .single()

      if (error) throw error

      // Optimistic update — add to top of feed immediately
      if (newPost) setPosts(prev => [newPost, ...prev])

      // Reset form
      setPostContent(''); setPostType('text'); setPostTags([])
      setPostImages([]); setPostDoc(null); setPostLink('')
      setShowNewPost(false)
      showToast('✅ Posted!')
    } catch (e) {
      showToast('❌ ' + (e.message || 'Could not post'))
      loadPosts() // Reload as fallback
    }
    setSubmittingPost(false)
  }

  const submitComment = async (postId) => {
    const content = commentInputs[postId]?.trim()
    if (!content || !user?.id) return
    setSubmittingComment(postId)
    try {
      const { data: newComment, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          username: myUsername,
          display_name: myName,
          content,
          likes: [],
        })
        .select()
        .single()

      if (error) throw error

      setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      // Optimistic update
      if (newComment) setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
    } catch (e) {
      showToast('❌ ' + e.message)
    }
    setSubmittingComment(null)
  }

  const toggleLike = async (postId) => {
    if (!user?.id) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const likes = Array.isArray(post.likes) ? post.likes : []
    const already = likes.includes(user.id)
    const newLikes = already ? likes.filter(id => id !== user.id) : [...likes, user.id]

    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p))
    await supabase.from('community_posts').update({ likes: newLikes }).eq('id', postId)
  }

  const toggleExpand = async (postId) => {
    if (expandedPost === postId) { setExpandedPost(null); return }
    setExpandedPost(postId)
    if (!comments[postId]) await loadComments(postId)
  }

  const joinOrOpenGroup = async (group) => {
    if (!user?.id) return
    const members = Array.isArray(group.members) ? group.members : []
    if (!members.includes(user.id)) {
      const newMembers = [...members, user.id]
      await supabase.from('group_chats').update({ members: newMembers }).eq('id', group.id)
      await supabase.from('group_messages').insert({
        group_id: group.id,
        user_id: user.id,
        username: myUsername,
        display_name: myName,
        content: `${myName} joined the group`,
        message_type: 'system',
      })
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members: newMembers } : g))
      setActiveGroup({ ...group, members: newMembers })
    } else {
      setActiveGroup(group)
    }
  }

  // ── CREATE GROUP (fixed null check) ──────────────────────────
  const createGroup = async () => {
    if (!newGroupName.trim()) { showToast('⚠️ Group name is required'); return }
    if (!user?.id) { showToast('❌ Please wait — still loading your account'); return }

    setCreatingGroup(true)
    try {
      const { data, error } = await supabase
        .from('group_chats')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || null,
          subject: newGroupSubject.trim() || null,
          created_by: user.id,
          members: [user.id],
          avatar: newGroupAvatar,
          is_public: true,
        })
        .select()
        .single()

      if (error) throw error
      if (!data?.id) throw new Error('Group was not created — please try again')

      // Post system message
      await supabase.from('group_messages').insert({
        group_id: data.id,
        user_id: user.id,
        username: myUsername,
        display_name: myName,
        content: `${myName} created the group 🎉`,
        message_type: 'system',
      })

      setShowNewGroup(false)
      setNewGroupName(''); setNewGroupDesc(''); setNewGroupSubject(''); setNewGroupAvatar('👥')
      setGroups(prev => [data, ...prev])
      setActiveGroup(data)
      showToast('✅ Group created!')
    } catch (e) {
      showToast('❌ ' + (e.message || 'Could not create group'))
    }
    setCreatingGroup(false)
  }

  const sendGroupMessage = async () => {
    const content = groupInput.trim()
    if (!content || !activeGroup?.id || sendingMsg || !user?.id) return
    setSendingMsg(true)
    setGroupInput('')
    try {
      await supabase.from('group_messages').insert({
        group_id: activeGroup.id,
        user_id: user.id,
        username: myUsername,
        display_name: myName,
        content,
        message_type: 'text',
      })
    } catch (e) {
      showToast('❌ ' + e.message)
    }
    setSendingMsg(false)
  }

  const sendGroupFile = async (file) => {
    if (!file || !activeGroup?.id || !user?.id) return
    showToast('⏳ Uploading...')
    try {
      const url = await uploadFile(file)
      const isImage = file.type.startsWith('image/')
      await supabase.from('group_messages').insert({
        group_id: activeGroup.id,
        user_id: user.id,
        username: myUsername,
        display_name: myName,
        content: isImage ? '' : file.name,
        message_type: isImage ? 'image' : 'document',
        image_url: isImage ? url : null,
        document_url: isImage ? null : url,
        document_name: isImage ? null : file.name,
      })
      showToast('✅ File sent!')
    } catch (e) {
      showToast('❌ ' + e.message)
    }
  }

  const deletePost = async (postId) => {
    if (!confirm('Delete this post?')) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('community_posts').delete().eq('id', postId)
    showToast('🗑 Post deleted')
  }

  const filteredPosts = posts.filter(p => {
    if (activeTag) return p.tags?.includes(activeTag)
    if (activeFilter === 'questions') return p.post_type === 'question' || p.tags?.includes('#Question')
    if (activeFilter === 'resources') return p.tags?.includes('#Resources') || p.post_type === 'document'
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 5 }}>🌍 Community</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Ask questions, share resources, and connect with students in group chats</p>
          </div>
          <button onClick={() => setShowNewPost(true)} style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ✏️ New Post
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[{ id: 'feed', label: '📰 Feed' }, { id: 'groups', label: '👥 Group Chats' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '11px 22px', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === tab.id ? '#60a5fa' : '#64748b', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 14, borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}`, transition: 'color 0.1s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FEED ─────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>
            <div>
              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {[{ id: 'all', label: 'All Posts' }, { id: 'questions', label: '❓ Questions' }, { id: 'resources', label: '📚 Resources' }].map(f => (
                  <button key={f.id} onClick={() => { setActiveFilter(f.id); setActiveTag(null) }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeFilter === f.id && !activeTag ? 'rgba(37,99,235,0.18)' : 'var(--surface)', color: activeFilter === f.id && !activeTag ? '#60a5fa' : '#64748b', border: `1px solid ${activeFilter === f.id && !activeTag ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, transition: 'all 0.1s' }}>
                    {f.label}
                  </button>
                ))}
                {activeTag && (
                  <button onClick={() => setActiveTag(null)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                    {activeTag} ×
                  </button>
                )}
              </div>

              {/* Posts */}
              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading posts...
                </div>
              ) : filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>No posts yet</div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>Be the first to post something!</div>
                  <button onClick={() => setShowNewPost(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✏️ Create Post</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredPosts.map(post => {
                    const likes = Array.isArray(post.likes) ? post.likes : []
                    const liked = user && likes.includes(user.id)
                    const isExpanded = expandedPost === post.id
                    const postComments = comments[post.id] || []

                    return (
                      <div key={post.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ padding: '16px 18px' }}>
                          {/* Post header */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                            <Avatar name={post.display_name || post.username} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{post.display_name || 'Student'}</span>
                                {post.username && <span style={{ fontSize: 12, color: '#60a5fa' }}>@{post.username}</span>}
                                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: 'rgba(37,99,235,0.1)', color: '#60a5fa' }}>
                                  {POST_TYPE_ICONS[post.post_type] || '💬'} {post.post_type}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(post.created_at)}</div>
                            </div>
                            {user && post.user_id === user.id && (
                              <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 6 }} title="Delete post"
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                              >🗑</button>
                            )}
                          </div>

                          {/* Content */}
                          {post.content && (
                            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.75, marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {post.content}
                            </div>
                          )}

                          {/* Images */}
                          {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : '1fr 1fr', gap: 6, marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                              {post.image_urls.map((url, i) => (
                                <img key={i} src={url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                              ))}
                            </div>
                          )}

                          {/* Document */}
                          {post.document_url && (
                            <a href={post.document_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', textDecoration: 'none', marginBottom: 12 }}>
                              <span style={{ fontSize: 24 }}>📄</span>
                              <div>
                                <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>{post.document_name || 'Document'}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>Click to open</div>
                              </div>
                            </a>
                          )}

                          {/* Link */}
                          {post.link_url && (
                            <a href={post.link_url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', textDecoration: 'none', marginBottom: 12, fontSize: 12, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              🔗 {post.link_url}
                            </a>
                          )}

                          {/* Tags */}
                          {post.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                              {post.tags.map((tag, i) => (
                                <button key={i} onClick={() => { setActiveTag(tag); setActiveFilter('all') }} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>{tag}</button>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <button onClick={() => toggleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: liked ? '#ef4444' : '#64748b', fontWeight: liked ? 700 : 400, padding: 0, transition: 'color 0.1s' }}>
                              {liked ? '❤️' : '🤍'} {likes.length}
                            </button>
                            <button onClick={() => toggleExpand(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isExpanded ? '#60a5fa' : '#64748b', padding: 0, transition: 'color 0.1s' }}>
                              💬 {isExpanded ? 'Hide' : `${postComments.length || 0} Comments`}
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/community#' + post.id); showToast('🔗 Link copied!') }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', padding: 0, marginLeft: 'auto' }}>
                              🔗 Share
                            </button>
                          </div>
                        </div>

                        {/* Comments */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
                            {postComments.length === 0 && (
                              <div style={{ padding: '12px 18px', fontSize: 12, color: '#64748b' }}>No comments yet — be the first!</div>
                            )}
                            {postComments.map(comment => (
                              <div key={comment.id} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 9 }}>
                                <Avatar name={comment.display_name || comment.username} size={28} color="linear-gradient(135deg,#10b981,#2563eb)" />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{comment.display_name || 'Student'}</span>
                                    {comment.username && <span style={{ fontSize: 11, color: '#60a5fa' }}>@{comment.username}</span>}
                                    <span style={{ fontSize: 10, color: '#64748b' }}>{timeAgo(comment.created_at)}</span>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{comment.content}</div>
                                </div>
                              </div>
                            ))}
                            <div style={{ padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Avatar name={myName} size={28} color="linear-gradient(135deg,#7c3aed,#2563eb)" />
                              <input
                                value={commentInputs[post.id] || ''}
                                onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id) }}
                                placeholder="Write a comment..."
                                style={{ flex: 1, padding: '8px 12px', borderRadius: 20, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }}
                              />
                              <button onClick={() => submitComment(post.id)} disabled={submittingComment === post.id || !commentInputs[post.id]?.trim()} style={{ padding: '8px 14px', borderRadius: 20, background: commentInputs[post.id]?.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', color: commentInputs[post.id]?.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                {submittingComment === post.id ? '...' : '↑'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ position: 'sticky', top: 90 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>🏷️ Browse by Topic</div>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveFilter('all') }} style={{ display: 'block', width: '100%', padding: '7px 12px', borderRadius: 8, background: activeTag === tag ? 'rgba(124,58,237,0.15)' : 'transparent', border: `1px solid ${activeTag === tag ? 'rgba(124,58,237,0.35)' : 'transparent'}`, color: activeTag === tag ? '#a78bfa' : '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'left', fontWeight: activeTag === tag ? 700 : 400, marginBottom: 2, transition: 'all 0.1s' }}
                    onMouseEnter={e => { if (activeTag !== tag) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (activeTag !== tag) e.currentTarget.style.background = 'transparent' }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>📊 Community</div>
                {[
                  { label: 'Total Posts', value: posts.length },
                  { label: 'Questions', value: posts.filter(p => p.post_type === 'question' || p.tags?.includes('#Question')).length },
                  { label: 'Resources', value: posts.filter(p => p.post_type === 'document' || p.tags?.includes('#Resources')).length },
                  { label: 'Groups', value: groups.length },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{s.label}</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GROUPS ───────────────────────────────────────── */}
        {activeTab === 'groups' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Group list */}
            <div>
              <button onClick={() => setShowNewGroup(true)} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>
                ➕ Create Group Chat
              </button>
              {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 13 }}>Loading groups...</div>
              ) : groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>No groups yet.<br />Create one above!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groups.map(group => {
                    const members = Array.isArray(group.members) ? group.members : []
                    const isMember = user && members.includes(user.id)
                    const isActive = activeGroup?.id === group.id
                    return (
                      <div key={group.id} onClick={() => joinOrOpenGroup(group)}
                        style={{ padding: '12px 14px', borderRadius: 12, cursor: 'pointer', background: isActive ? 'rgba(37,99,235,0.15)' : 'var(--surface)', border: `1px solid ${isActive ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, transition: 'all 0.1s' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(37,99,235,0.25)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ fontSize: 26, flexShrink: 0 }}>{group.avatar || '👥'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#60a5fa' : '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{members.length} member{members.length !== 1 ? 's' : ''}{group.subject ? ` · ${group.subject}` : ''}</div>
                          </div>
                          {isMember && <span style={{ fontSize: 10, color: '#10b981', flexShrink: 0 }}>✓</span>}
                        </div>
                        {group.description && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Group chat area */}
            {activeGroup ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', height: 'calc(100vh - 200px)', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
                {/* Group header */}
                <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(37,99,235,0.06))', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{activeGroup.avatar || '👥'}</div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>{activeGroup.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {Array.isArray(activeGroup.members) ? activeGroup.members.length : 0} members
                        {activeGroup.subject ? ` · ${activeGroup.subject}` : ''}
                      </div>
                    </div>
                    {activeGroup.description && (
                      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', maxWidth: 200, textAlign: 'right', lineHeight: 1.4 }}>{activeGroup.description}</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groupMessages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{activeGroup.avatar || '👥'}</div>
                      <div style={{ fontSize: 14 }}>Welcome to <strong style={{ color: '#f1f5f9' }}>{activeGroup.name}</strong>!</div>
                      <div style={{ fontSize: 12, marginTop: 5 }}>Send a message, share an image, or post a document</div>
                    </div>
                  )}
                  {groupMessages.map((msg, i) => {
                    if (msg.message_type === 'system') {
                      return (
                        <div key={msg.id || i} style={{ textAlign: 'center', margin: '6px 0' }}>
                          <span style={{ fontSize: 11, color: '#64748b', background: 'var(--surface)', padding: '3px 12px', borderRadius: 12, border: '1px solid var(--border)' }}>{msg.content}</span>
                        </div>
                      )
                    }
                    const isMe = user && msg.user_id === user.id
                    const showHeader = i === 0 || groupMessages[i - 1]?.user_id !== msg.user_id || groupMessages[i - 1]?.message_type === 'system'
                    return (
                      <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {showHeader && !isMe && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                            <Avatar name={msg.display_name || msg.username} size={20} color="linear-gradient(135deg,#1d4ed8,#7c3aed)" />
                            <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>{msg.display_name || 'Student'}</span>
                            {msg.username && <span style={{ fontSize: 10, color: '#64748b' }}>@{msg.username}</span>}
                          </div>
                        )}
                        {msg.message_type === 'image' && msg.image_url ? (
                          <img src={msg.image_url} alt="" style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, cursor: 'pointer', objectFit: 'cover' }} onClick={() => window.open(msg.image_url, '_blank')} />
                        ) : msg.message_type === 'document' && msg.document_url ? (
                          <a href={msg.document_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: isMe ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${isMe ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, textDecoration: 'none', maxWidth: 240 }}>
                            <span style={{ fontSize: 22 }}>📄</span>
                            <div>
                              <div style={{ fontSize: 12, color: isMe ? '#93c5fd' : '#60a5fa', fontWeight: 600 }}>{msg.document_name || 'Document'}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>Click to open</div>
                            </div>
                          </a>
                        ) : (
                          <div style={{ padding: '9px 13px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: isMe ? 'none' : '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, maxWidth: '70%', wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, paddingLeft: isMe ? 0 : 4 }}>{timeAgo(msg.created_at)}</div>
                      </div>
                    )
                  })}
                  <div ref={msgEndRef} />
                </div>

                {/* Group input */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, background: 'var(--bg)' }}>
                  <button onClick={() => groupFileRef.current?.click()} title="Send image or document" style={{ padding: '9px 10px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#64748b', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>📎</button>
                  <input ref={groupFileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.ppt,.pptx" onChange={e => { if (e.target.files[0]) sendGroupFile(e.target.files[0]) }} style={{ display: 'none' }} />
                  <input value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage() } }} disabled={sendingMsg} placeholder={`Message ${activeGroup.name}...`}
                    style={{ flex: 1, padding: '10px 13px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', color: '#e2e8f0', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(16,185,129,0.3)'}
                  />
                  <button onClick={sendGroupMessage} disabled={!groupInput.trim() || sendingMsg} style={{ padding: '10px 14px', borderRadius: 10, background: groupInput.trim() && !sendingMsg ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)', color: groupInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>↑</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#64748b', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 52 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>Select a group to start chatting</div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>Join an existing group or create a new one for your module or study group</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NEW POST MODAL ─────────────────────────────────── */}
      {showNewPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: 26, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>✏️ New Post</div>
              <button onClick={() => setShowNewPost(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            {/* Author */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={myName} size={40} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{myName}</div>
                {myUsername && <div style={{ fontSize: 12, color: '#60a5fa' }}>@{myUsername}</div>}
              </div>
            </div>

            {/* Post type */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {[{ id: 'text', label: '💬 Post' }, { id: 'question', label: '❓ Question' }, { id: 'link', label: '🔗 Link' }].map(t => (
                <button key={t.id} onClick={() => setPostType(t.id)} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: postType === t.id ? 'rgba(37,99,235,0.18)' : 'var(--surface2)', color: postType === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${postType === t.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>
                  {t.label}
                </button>
              ))}
            </div>

            <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
              placeholder={postType === 'question' ? "What's your question? Be specific — include module, year level, and what you've tried..." : "Share something with the community..."}
              rows={5}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', marginBottom: 12 }}
              autoFocus
            />

            {postType === 'link' && (
              <input value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 12 }} />
            )}

            {/* Image previews */}
            {postImages.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {postImages.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={img.preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button onClick={() => setPostImages(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Document preview */}
            {postDoc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <span style={{ fontSize: 13, color: '#60a5fa', flex: 1 }}>{postDoc.name}</span>
                <button onClick={() => { setPostDoc(null); setPostType('text') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            )}

            {/* Attachment buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>🖼️ Add Image</button>
              <button onClick={() => docInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>📄 Add Document</button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={handleDocSelect} style={{ display: 'none' }} />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Tags</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => setPostTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ padding: '4px 11px', borderRadius: 14, fontSize: 11, cursor: 'pointer', background: postTags.includes(tag) ? 'rgba(124,58,237,0.18)' : 'var(--surface2)', color: postTags.includes(tag) ? '#a78bfa' : '#64748b', border: `1px solid ${postTags.includes(tag) ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, fontWeight: postTags.includes(tag) ? 700 : 400 }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewPost(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitPost} disabled={submittingPost || (!postContent.trim() && !postImages.length && !postDoc)} style={{ flex: 2, padding: '11px', borderRadius: 10, background: (postContent.trim() || postImages.length || postDoc) && !submittingPost ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: (postContent.trim() || postImages.length || postDoc) ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {submittingPost ? '⏳ Posting...' : '🚀 Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE GROUP MODAL ─────────────────────────────── */}
      {showNewGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 18, padding: 26, maxWidth: 440, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>➕ Create Group Chat</div>
              <button onClick={() => setShowNewGroup(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            {/* Avatar picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Group Icon</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GROUP_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setNewGroupAvatar(emoji)} style={{ width: 38, height: 38, borderRadius: 9, border: `2px solid ${newGroupAvatar === emoji ? '#10b981' : 'var(--border)'}`, background: newGroupAvatar === emoji ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Group Name *', value: newGroupName, setter: setNewGroupName, placeholder: 'e.g. Power Systems III Study Group', required: true },
              { label: 'Subject / Module', value: newGroupSubject, setter: setNewGroupSubject, placeholder: 'e.g. ELE3011 Power Systems' },
              { label: 'Description', value: newGroupDesc, setter: setNewGroupDesc, placeholder: 'What is this group for?' },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: `1px solid ${field.required && !field.value ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, color: '#e2e8f0', outline: 'none' }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={() => setShowNewGroup(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createGroup} disabled={!newGroupName.trim() || creatingGroup} style={{ flex: 2, padding: '11px', borderRadius: 10, background: newGroupName.trim() && !creatingGroup ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface2)', color: newGroupName.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {creatingGroup ? '⏳ Creating...' : '✅ Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,100% { transform: translateY(0); opacity: .3 } 50% { transform: translateY(-5px); opacity: 1 } }
      `}</style>
    </div>
  )
}