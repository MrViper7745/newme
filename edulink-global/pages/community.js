import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'
import withMobile from '../components/withMobile'

import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const MobileCommunity = dynamic(() => import('./mobile/MobileCommunity'), { ssr: false })

export default function CommunityPage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileCommunity />
  return <Community/>
}


const TAGS = [
  '#Engineering', '#Mathematics', '#Physics', '#ComputerScience',
  '#Chemistry', '#Economics', '#Law', '#Medicine',
  '#Question', '#Resources', '#Tips', '#Internships', '#General',
]
const POST_TYPE_ICONS = { text: '💬', question: '❓', image: '🖼️', document: '📄', link: '🔗' }
const GROUP_EMOJIS = ['👥','📚','🎓','💡','🔬','⚡','💻','🧪','📐','🌍','🏗️','🎯','✍️','🔭','⚗️','📡']

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ name, size = 36, gradient = 'linear-gradient(135deg,#7c3aed,#2563eb)', url }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?')[0]?.toUpperCase()}
    </div>
  )
}

function Community() {
  
  const { user, profile } = useUser()
  const myUsername = profile?.username || null
  const myName = profile?.name || profile?.username || user?.email?.split('@')[0] || 'Student'

  const [activeTab, setActiveTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTag, setActiveTag] = useState(null)
  const [toast, setToast] = useState(null)

  // Post state
  const [showNewPost, setShowNewPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState('text')
  const [postTags, setPostTags] = useState([])
  const [postImages, setPostImages] = useState([])
  const [postDoc, setPostDoc] = useState(null)
  const [postLink, setPostLink] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Comments
  const [expandedPost, setExpandedPost] = useState(null)
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [submittingComment, setSubmittingComment] = useState(null)

  // Groups
  const [groups, setGroups] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [groupInput, setGroupInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupSubject, setNewGroupSubject] = useState('')
  const [newGroupAvatar, setNewGroupAvatar] = useState('👥')
  const [newGroupPrivate, setNewGroupPrivate] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Group features
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showGroupSearch, setShowGroupSearch] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState('')
  const [groupListSearch, setGroupListSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [editingGroup, setEditingGroup] = useState(null)
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [showPinned, setShowPinned] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [groupAILoading, setGroupAILoading] = useState(false)
  const [groupAIStream, setGroupAIStream] = useState('')

  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)
  const groupFileRef = useRef(null)
  const msgEndRef = useRef(null)
  const groupInputRef = useRef(null)
  const channelRef = useRef(null)
  const searchTimeout = useRef(null)

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(null), dur) }

  useEffect(() => { if (user) { loadPosts(); loadGroups() } }, [user])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [groupMessages, groupAIStream])

  // ── REALTIME SUBSCRIPTION ─────────────────────────────────
  useEffect(() => {
    if (!activeGroup?.id || !user) return

    setLoadingMessages(true)
    loadGroupMessages(activeGroup.id)
    loadPinnedMessages(activeGroup.id)

    // Remove previous channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = `group_msgs_${activeGroup.id}_${user.id}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${activeGroup.id}`,
      }, (payload) => {
        if (!payload.new) return
        setGroupMessages(prev => {
          // Avoid duplicate — if message already exists (from optimistic update), skip
          if (prev.find(m => m.id === payload.new.id)) return prev
          // If it's a temp message from us, replace it
          const withoutTemp = prev.filter(m => !(m._temp && m.user_id === payload.new.user_id && m.content === payload.new.content))
          return [...withoutTemp, payload.new]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${activeGroup.id}`,
      }, (payload) => {
        if (!payload.new) return
        setGroupMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
        // Update pinned messages too
        if (payload.new.is_pinned) {
          setPinnedMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [payload.new, ...prev]
          })
        } else {
          setPinnedMessages(prev => prev.filter(m => m.id !== payload.new.id))
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${activeGroup.id}`,
      }, (payload) => {
        if (!payload.old?.id) return
        setGroupMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscribed to', channelName)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [activeGroup?.id])

  const loadPosts = async () => {
    setLoadingPosts(true)
    const { data } = await supabase.from('community_posts').select('*')
      .order('created_at', { ascending: false }).limit(50)
    setPosts(data || [])
    setLoadingPosts(false)
  }

  const loadGroups = async () => {
    setLoadingGroups(true)
    const { data } = await supabase.from('group_chats').select('*')
      .eq('is_public', true).order('created_at', { ascending: false })
    setGroups(data || [])
    if (user) setMyGroups((data || []).filter(g => Array.isArray(g.members) && g.members.includes(user.id)))
    setLoadingGroups(false)
  }

  const loadGroupMessages = async (groupId) => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (!error) setGroupMessages(data || [])
    setLoadingMessages(false)
  }

  const loadPinnedMessages = async (groupId) => {
    const { data } = await supabase.from('group_messages').select('*')
      .eq('group_id', groupId).eq('is_pinned', true)
      .order('created_at', { ascending: false }).limit(10)
    setPinnedMessages(data || [])
  }

  const loadComments = async (postId) => {
    const { data } = await supabase.from('community_comments').select('*')
      .eq('post_id', postId).order('created_at', { ascending: true })
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

  // ── POSTS ─────────────────────────────────────────────────
  const submitPost = async () => {
    const content = postContent.trim()
    if (!content && !postImages.length && !postDoc) return
    if (!user?.id) { showToast('❌ Still loading your account...'); return }
    setSubmittingPost(true)
    try {
      let imageUrls = [], documentUrl = null, documentName = null
      for (const img of postImages) imageUrls.push(await uploadFile(img.file))
      if (postDoc) { documentUrl = await uploadFile(postDoc); documentName = postDoc.name }
      const { data: newPost, error } = await supabase.from('community_posts').insert({
        user_id: user.id, username: myUsername, display_name: myName,
        content, post_type: postType, image_urls: imageUrls,
        document_url: documentUrl, document_name: documentName,
        link_url: postLink || null, tags: postTags, likes: [], views: 0,
      }).select().single()
      if (error) throw error
      if (newPost) setPosts(prev => [newPost, ...prev])
      setPostContent(''); setPostType('text'); setPostTags([])
      setPostImages([]); setPostDoc(null); setPostLink('')
      setShowNewPost(false)
      showToast('✅ Posted!')
    } catch (e) { showToast('❌ ' + (e.message || 'Could not post')); loadPosts() }
    setSubmittingPost(false)
  }

  const submitComment = async (postId) => {
    const content = commentInputs[postId]?.trim()
    if (!content || !user?.id) return
    setSubmittingComment(postId)
    try {
      const { data: newComment, error } = await supabase.from('community_comments').insert({
        post_id: postId, user_id: user.id, username: myUsername,
        display_name: myName, content, likes: [],
      }).select().single()
      if (error) throw error
      setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      if (newComment) setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
    } catch (e) { showToast('❌ ' + e.message) }
    setSubmittingComment(null)
  }

  const toggleLike = async (postId) => {
    if (!user?.id) return
    const post = posts.find(p => p.id === postId); if (!post) return
    const likes = Array.isArray(post.likes) ? post.likes : []
    const newLikes = likes.includes(user.id) ? likes.filter(id => id !== user.id) : [...likes, user.id]
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p))
    await supabase.from('community_posts').update({ likes: newLikes }).eq('id', postId)
  }

  const toggleExpand = async (postId) => {
    if (expandedPost === postId) { setExpandedPost(null); return }
    setExpandedPost(postId)
    if (!comments[postId]) await loadComments(postId)
  }

  const deletePost = async (postId) => {
    if (!confirm('Delete this post?')) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('community_posts').delete().eq('id', postId)
    showToast('🗑 Post deleted')
  }

  const savePostDocToLibrary = async (post) => {
    if (!post.document_url || !user?.id) return
    try {
      await supabase.from('library_files').insert({
        user_id: user.id, url: post.document_url,
        name: post.document_name || 'Community Document',
        title: `${post.document_name || 'Document'} (shared by ${post.display_name})`,
        ext: (post.document_name || '').split('.').pop() || 'pdf',
        saved_at: new Date().toISOString(),
      })
      showToast('✅ Saved to your Library!')
    } catch (e) { showToast('❌ ' + e.message) }
  }

  // ── GROUPS ────────────────────────────────────────────────
  const joinOrOpenGroup = async (group) => {
    if (!user?.id) return
    const members = Array.isArray(group.members) ? group.members : []
    if (!members.includes(user.id)) {
      const newMembers = [...members, user.id]
      const { error } = await supabase.from('group_chats').update({ members: newMembers }).eq('id', group.id)
      if (!error) {
        await supabase.from('group_messages').insert({
          group_id: group.id, user_id: user.id, username: myUsername,
          display_name: myName, content: `${myName} joined the group 👋`,
          message_type: 'system', created_at: new Date().toISOString(),
        })
        const updated = { ...group, members: newMembers }
        setGroups(prev => prev.map(g => g.id === group.id ? updated : g))
        setMyGroups(prev => [...prev.filter(g => g.id !== group.id), updated])
        setActiveGroup(updated)
      }
    } else {
      setActiveGroup(group)
    }
    setShowGroupInfo(false)
    setGroupMessages([])
  }

  const leaveGroup = async (group) => {
    if (!user?.id || !confirm('Leave this group?')) return
    const members = (group.members || []).filter(id => id !== user.id)
    await supabase.from('group_chats').update({ members }).eq('id', group.id)
    await supabase.from('group_messages').insert({
      group_id: group.id, user_id: user.id, username: myUsername,
      display_name: myName, content: `${myName} left the group`,
      message_type: 'system', created_at: new Date().toISOString(),
    })
    setActiveGroup(null)
    setGroupMessages([])
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members } : g))
    setMyGroups(prev => prev.filter(g => g.id !== group.id))
    showToast('✅ You left the group')
  }

  const deleteGroup = async (group) => {
    if (!confirm('Delete this group permanently?')) return
    await supabase.from('group_chats').delete().eq('id', group.id)
    setGroups(prev => prev.filter(g => g.id !== group.id))
    setMyGroups(prev => prev.filter(g => g.id !== group.id))
    setActiveGroup(null)
    setGroupMessages([])
    showToast('🗑 Group deleted')
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) { showToast('⚠️ Group name is required'); return }
    if (!user?.id) { showToast('❌ Still loading your account...'); return }
    setCreatingGroup(true)
    try {
      const { data, error } = await supabase.from('group_chats').insert({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || null,
        subject: newGroupSubject.trim() || null,
        created_by: user.id, members: [user.id],
        avatar: newGroupAvatar, is_public: !newGroupPrivate,
      }).select().single()
      if (error) throw error
      if (!data?.id) throw new Error('Group was not created')

      // Insert welcome system message
      await supabase.from('group_messages').insert({
        group_id: data.id, user_id: user.id, username: myUsername,
        display_name: myName,
        content: `${myName} created the group "${data.name}" 🎉`,
        message_type: 'system', created_at: new Date().toISOString(),
      })

      setShowNewGroup(false)
      setNewGroupName(''); setNewGroupDesc(''); setNewGroupSubject('')
      setNewGroupAvatar('👥'); setNewGroupPrivate(false)
      setGroups(prev => [data, ...prev])
      setMyGroups(prev => [data, ...prev])
      setActiveGroup(data)
      setActiveTab('groups')
      showToast('✅ Group created!')
    } catch (e) { showToast('❌ ' + (e.message || 'Could not create group')) }
    setCreatingGroup(false)
  }

  const updateGroup = async () => {
    if (!editingGroup) return
    const { error } = await supabase.from('group_chats').update({
      name: editingGroup.name, description: editingGroup.description,
      subject: editingGroup.subject, avatar: editingGroup.avatar,
    }).eq('id', editingGroup.id)
    if (error) { showToast('❌ ' + error.message); return }
    const updated = { ...editingGroup }
    setGroups(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g))
    setMyGroups(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g))
    setActiveGroup(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    setEditingGroup(null); setShowGroupInfo(false)
    showToast('✅ Group updated!')
  }

  // ── SEND MESSAGE — THE CRITICAL FIX ──────────────────────
  const sendGroupMessage = async () => {
    const content = groupInput.trim()
    if (!content || !activeGroup?.id || sendingMsg || !user?.id) return
    setSendingMsg(true)
    setGroupInput('')

    // Handle /ask AI command
    if (content.startsWith('/ask ')) {
      const question = content.slice(5).trim()
      if (!question) { setSendingMsg(false); return }

      // Optimistically add the /ask message immediately
      const tempAskMsg = {
        id: `temp_ask_${Date.now()}`,
        group_id: activeGroup.id, user_id: user.id,
        username: myUsername, display_name: myName,
        content, message_type: 'text',
        created_at: new Date().toISOString(), _temp: true,
      }
      setGroupMessages(prev => [...prev, tempAskMsg])

      // Save the /ask message to DB
      const { data: savedAsk } = await supabase.from('group_messages').insert({
        group_id: activeGroup.id, user_id: user.id, username: myUsername,
        display_name: myName, content, message_type: 'text',
        created_at: new Date().toISOString(),
      }).select().single()

      // Replace temp with real
      if (savedAsk) {
        setGroupMessages(prev => prev.map(m => m.id === tempAskMsg.id ? savedAsk : m))
      }

      setGroupAILoading(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: `You are EduBot AI in a group study chat called "${activeGroup.name}"${activeGroup.subject ? ` studying ${activeGroup.subject}` : ''}. Answer the question clearly and concisely. Use proper math notation. Sign off as "— EduBot 🤖"`,
            }, { role: 'user', content: question }],
          }),
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
            try { const p = JSON.parse(d); if (p.text) { full += p.text; setGroupAIStream(full) } } catch {}
          }
        }
        setGroupAIStream('')

        // Save AI response + add to local state immediately
        const { data: aiMsg } = await supabase.from('group_messages').insert({
          group_id: activeGroup.id,
          user_id: user.id,
          username: 'edubot',
          display_name: 'EduBot AI 🤖',
          content: full,
          message_type: 'text',
          created_at: new Date().toISOString(),
        }).select().single()

        if (aiMsg) {
          setGroupMessages(prev => {
            if (prev.find(m => m.id === aiMsg.id)) return prev
            return [...prev, aiMsg]
          })
        }
      } catch (e) { showToast('❌ AI error: ' + e.message) }
      setGroupAILoading(false)
      setSendingMsg(false)
      return
    }

    // Regular message — OPTIMISTIC UPDATE FIRST
    const insertContent = replyingTo
      ? `↩️ Replying to ${replyingTo.display_name}: "${replyingTo.content?.slice(0, 50)}..."\n\n${content}`
      : content
    setReplyingTo(null)

    // Add temp message immediately so user sees it right away
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const tempMsg = {
      id: tempId,
      group_id: activeGroup.id,
      user_id: user.id,
      username: myUsername,
      display_name: myName,
      content: insertContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_pinned: false,
      _temp: true,
    }
    setGroupMessages(prev => [...prev, tempMsg])

    try {
      const { data: savedMsg, error } = await supabase.from('group_messages').insert({
        group_id: activeGroup.id,
        user_id: user.id,
        username: myUsername,
        display_name: myName,
        content: insertContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
      }).select().single()

      if (error) {
        // Remove temp on failure
        setGroupMessages(prev => prev.filter(m => m.id !== tempId))
        showToast('❌ Message failed: ' + error.message)
      } else if (savedMsg) {
        // Replace temp with the real saved message
        setGroupMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m))
      }
    } catch (e) {
      setGroupMessages(prev => prev.filter(m => m.id !== tempId))
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

      const msgData = {
        group_id: activeGroup.id, user_id: user.id,
        username: myUsername, display_name: myName,
        content: isImage ? '' : file.name,
        message_type: isImage ? 'image' : 'document',
        image_url: isImage ? url : null,
        document_url: isImage ? null : url,
        document_name: isImage ? null : file.name,
        created_at: new Date().toISOString(),
      }

      const { data: savedMsg, error } = await supabase.from('group_messages').insert(msgData).select().single()
      if (error) throw error
      // Add to local state immediately
      if (savedMsg) setGroupMessages(prev => [...prev, savedMsg])
      showToast('✅ File sent!')
    } catch (e) { showToast('❌ ' + e.message) }
  }

  const pinMessage = async (msg) => {
    if (activeGroup?.created_by !== user?.id) { showToast('⚠️ Only the group creator can pin messages'); return }
    const newPinned = !msg.is_pinned
    const { error } = await supabase.from('group_messages').update({ is_pinned: newPinned }).eq('id', msg.id)
    if (error) { showToast('❌ ' + error.message); return }
    setGroupMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: newPinned } : m))
    if (newPinned) {
      setPinnedMessages(prev => [{ ...msg, is_pinned: true }, ...prev.filter(m => m.id !== msg.id)])
      showToast('📌 Pinned')
    } else {
      setPinnedMessages(prev => prev.filter(m => m.id !== msg.id))
      showToast('📌 Unpinned')
    }
  }

  const deleteMessage = async (msgId) => {
    const { error } = await supabase.from('group_messages').delete().eq('id', msgId)
    if (error) { showToast('❌ ' + error.message); return }
    setGroupMessages(prev => prev.filter(m => m.id !== msgId))
    showToast('🗑 Deleted')
  }

  const saveGroupFileToLibrary = async (msg) => {
    if (!msg.document_url || !user?.id) return
    try {
      await supabase.from('library_files').insert({
        user_id: user.id, url: msg.document_url,
        name: msg.document_name || 'Group Document',
        title: `${msg.document_name || 'Document'} (from ${activeGroup?.name})`,
        ext: (msg.document_name || '').split('.').pop() || 'pdf',
        saved_at: new Date().toISOString(),
      })
      showToast('✅ Saved to Library!')
    } catch (e) { showToast('❌ ' + e.message) }
  }

  const searchResults = msgSearchQuery.trim()
    ? groupMessages.filter(m => m.content?.toLowerCase().includes(msgSearchQuery.toLowerCase()) && m.message_type !== 'system')
    : []

  const displayedGroups = groups.filter(g => {
    const q = groupListSearch.toLowerCase()
    if (q && !g.name.toLowerCase().includes(q) && !g.subject?.toLowerCase().includes(q)) return false
    if (groupFilter === 'mine') return myGroups.some(m => m.id === g.id)
    return true
  })

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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 5 }}>🌍 Community</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Ask questions, share resources, connect in group chats</p>
          </div>
          <button onClick={() => setShowNewPost(true)} style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✏️ New Post</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[{ id: 'feed', label: '📰 Feed' }, { id: 'groups', label: `👥 Group Chats (${groups.length})` }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '11px 22px', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === tab.id ? '#60a5fa' : '#64748b', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 14, borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}` }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FEED ─────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {[{ id: 'all', label: 'All Posts' }, { id: 'questions', label: '❓ Questions' }, { id: 'resources', label: '📚 Resources' }].map(f => (
                  <button key={f.id} onClick={() => { setActiveFilter(f.id); setActiveTag(null) }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeFilter === f.id && !activeTag ? 'rgba(37,99,235,0.18)' : 'var(--surface)', color: activeFilter === f.id && !activeTag ? '#60a5fa' : '#64748b', border: `1px solid ${activeFilter === f.id && !activeTag ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>{f.label}</button>
                ))}
                {activeTag && <button onClick={() => setActiveTag(null)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>{activeTag} ×</button>}
              </div>

              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading posts...
                </div>
              ) : filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>No posts yet</div>
                  <button onClick={() => setShowNewPost(true)} style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 10 }}>✏️ Be first to post</button>
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
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                            <Avatar name={post.display_name || post.username} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{post.display_name || 'Student'}</span>
                                {post.username && <span style={{ fontSize: 12, color: '#60a5fa' }}>@{post.username}</span>}
                                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: 'rgba(37,99,235,0.1)', color: '#60a5fa' }}>{POST_TYPE_ICONS[post.post_type] || '💬'} {post.post_type}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(post.created_at)}</div>
                            </div>
                            {user && post.user_id === user.id && (
                              <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                              >🗑</button>
                            )}
                          </div>

                          {post.content && <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.75, marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</div>}

                          {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : '1fr 1fr', gap: 6, marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                              {post.image_urls.map((url, i) => <img key={i} src={url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />)}
                            </div>
                          )}

                          {post.document_url && (
                            <div style={{ marginBottom: 12 }}>
                              <a href={post.document_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', textDecoration: 'none', marginBottom: 6 }}>
                                <span style={{ fontSize: 24 }}>📄</span>
                                <div>
                                  <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>{post.document_name || 'Document'}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>Click to open</div>
                                </div>
                              </a>
                              <button onClick={() => savePostDocToLibrary(post)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                                📚 Save to My Library
                              </button>
                            </div>
                          )}

                          {post.link_url && (
                            <a href={post.link_url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', textDecoration: 'none', marginBottom: 12, fontSize: 12, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 {post.link_url}</a>
                          )}

                          {post.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                              {post.tags.map((tag, i) => <button key={i} onClick={() => { setActiveTag(tag); setActiveFilter('all') }} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>{tag}</button>)}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <button onClick={() => toggleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: liked ? '#ef4444' : '#64748b', fontWeight: liked ? 700 : 400, padding: 0 }}>
                              {liked ? '❤️' : '🤍'} {likes.length}
                            </button>
                            <button onClick={() => toggleExpand(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isExpanded ? '#60a5fa' : '#64748b', padding: 0 }}>
                              💬 {postComments.length || 0}
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/community#' + post.id); showToast('🔗 Copied!') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', padding: 0, marginLeft: 'auto' }}>🔗</button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
                            {postComments.length === 0 && <div style={{ padding: '12px 18px', fontSize: 12, color: '#64748b' }}>No comments yet — be first!</div>}
                            {postComments.map(comment => (
                              <div key={comment.id} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 9 }}>
                                <Avatar name={comment.display_name || comment.username} size={28} gradient="linear-gradient(135deg,#10b981,#2563eb)" />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{comment.display_name || 'Student'}</span>
                                    {comment.username && <span style={{ fontSize: 11, color: '#60a5fa' }}>@{comment.username}</span>}
                                    <span style={{ fontSize: 10, color: '#64748b' }}>{timeAgo(comment.created_at)}</span>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{comment.content}</div>
                                </div>
                              </div>
                            ))}
                            <div style={{ padding: '10px 18px', display: 'flex', gap: 8 }}>
                              <Avatar name={myName} size={28} />
                              <input value={commentInputs[post.id] || ''} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id) }}
                                placeholder="Write a comment..." style={{ flex: 1, padding: '8px 12px', borderRadius: 20, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
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
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>🏷️ Topics</div>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveFilter('all') }} style={{ display: 'block', width: '100%', padding: '7px 12px', borderRadius: 8, background: activeTag === tag ? 'rgba(124,58,237,0.15)' : 'transparent', border: `1px solid ${activeTag === tag ? 'rgba(124,58,237,0.35)' : 'transparent'}`, color: activeTag === tag ? '#a78bfa' : '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'left', fontWeight: activeTag === tag ? 700 : 400, marginBottom: 2 }}
                    onMouseEnter={e => { if (activeTag !== tag) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (activeTag !== tag) e.currentTarget.style.background = 'transparent' }}
                  >{tag}</button>
                ))}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>📊 Stats</div>
                {[
                  { label: 'Total Posts', value: posts.length },
                  { label: 'Questions', value: posts.filter(p => p.post_type === 'question' || p.tags?.includes('#Question')).length },
                  { label: 'Resources', value: posts.filter(p => p.post_type === 'document' || p.tags?.includes('#Resources')).length },
                  { label: 'Active Groups', value: groups.length },
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

        {/* ── GROUPS ─────────────────────────────────────────── */}
        {activeTab === 'groups' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
            <div>
              <button onClick={() => setShowNewGroup(true)} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                ➕ Create Group Chat
              </button>
              <div style={{ marginBottom: 10 }}>
                <input value={groupListSearch} onChange={e => setGroupListSearch(e.target.value)} placeholder="🔍 Search groups..." style={{ width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{ id: 'all', label: `All (${groups.length})` }, { id: 'mine', label: `Mine (${myGroups.length})` }].map(f => (
                    <button key={f.id} onClick={() => setGroupFilter(f.id)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: groupFilter === f.id ? 'rgba(37,99,235,0.18)' : 'var(--surface)', color: groupFilter === f.id ? '#60a5fa' : '#64748b', border: `1px solid ${groupFilter === f.id ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>{f.label}</button>
                  ))}
                </div>
              </div>

              {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 13 }}>Loading groups...</div>
              ) : displayedGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>
                  {groupFilter === 'mine' ? "You haven't joined any groups yet." : 'No groups found.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayedGroups.map(group => {
                    const members = Array.isArray(group.members) ? group.members : []
                    const isMember = user && members.includes(user.id)
                    const isOwner = user && group.created_by === user.id
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
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {members.length} member{members.length !== 1 ? 's' : ''}
                              {group.subject ? ` · ${group.subject}` : ''}
                              {!group.is_public && ' · 🔒'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
                            {isMember && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>✓ Joined</span>}
                            {isOwner && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>👑 Owner</span>}
                          </div>
                        </div>
                        {group.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Group chat */}
            {activeGroup ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', height: 'calc(100vh - 200px)', minHeight: 500, display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(37,99,235,0.06))', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 26 }}>{activeGroup.avatar || '👥'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>{activeGroup.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {Array.isArray(activeGroup.members) ? activeGroup.members.length : 0} members
                        {activeGroup.subject ? ` · ${activeGroup.subject}` : ''}
                        {!activeGroup.is_public && ' · 🔒 Private'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setShowGroupSearch(s => !s); setMsgSearchQuery('') }} title="Search messages"
                        style={{ padding: '5px 9px', borderRadius: 7, background: showGroupSearch ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${showGroupSearch ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, color: showGroupSearch ? '#60a5fa' : '#64748b', fontSize: 13, cursor: 'pointer' }}>🔍</button>
                      {pinnedMessages.length > 0 && (
                        <button onClick={() => setShowPinned(s => !s)} title="Pinned messages"
                          style={{ padding: '5px 9px', borderRadius: 7, background: showPinned ? 'rgba(245,158,11,0.2)' : 'var(--surface2)', border: `1px solid ${showPinned ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, color: showPinned ? '#f59e0b' : '#64748b', fontSize: 13, cursor: 'pointer' }}>📌 {pinnedMessages.length}</button>
                      )}
                      <button onClick={() => setShowGroupInfo(s => !s)} title="Group info"
                        style={{ padding: '5px 9px', borderRadius: 7, background: showGroupInfo ? 'rgba(124,58,237,0.2)' : 'var(--surface2)', border: `1px solid ${showGroupInfo ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, color: showGroupInfo ? '#a78bfa' : '#64748b', fontSize: 13, cursor: 'pointer' }}>ℹ️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 5 }}>
                    💡 Type <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, color: '#60a5fa' }}>/ask [question]</code> to summon AI help visible to everyone
                  </div>
                </div>

                {/* Search bar */}
                {showGroupSearch && (
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <input value={msgSearchQuery} onChange={e => setMsgSearchQuery(e.target.value)}
                      placeholder="Search messages in this group..." style={{ width: '100%', padding: '7px 12px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} autoFocus />
                    {searchResults.length > 0 && (
                      <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
                        {searchResults.map((msg, i) => (
                          <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--surface2)', marginBottom: 4, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
                            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{msg.display_name}: </span>{msg.content?.slice(0, 80)}
                          </div>
                        ))}
                      </div>
                    )}
                    {msgSearchQuery.trim() && searchResults.length === 0 && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>No messages found</div>}
                  </div>
                )}

                {/* Pinned */}
                {showPinned && pinnedMessages.length > 0 && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(245,158,11,0.04)', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>📌 Pinned Messages</div>
                    {pinnedMessages.map(msg => (
                      <div key={msg.id} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 5, fontSize: 12, color: '#94a3b8' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{msg.display_name}: </span>{msg.content?.slice(0, 100)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Group info panel */}
                {showGroupInfo && (
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'rgba(124,58,237,0.03)', flexShrink: 0, maxHeight: 300, overflowY: 'auto' }}>
                    <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 14, marginBottom: 12 }}>ℹ️ Group Info & Settings</div>
                    {editingGroup?.id === activeGroup.id ? (
                      <div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                          {GROUP_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => setEditingGroup(prev => ({ ...prev, avatar: emoji }))} style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${editingGroup.avatar === emoji ? '#a78bfa' : 'var(--border)'}`, background: editingGroup.avatar === emoji ? 'rgba(124,58,237,0.15)' : 'var(--surface2)', fontSize: 18, cursor: 'pointer' }}>{emoji}</button>
                          ))}
                        </div>
                        {[{ l: 'Name', k: 'name', ph: 'Group name' }, { l: 'Subject', k: 'subject', ph: 'e.g. ELE3011' }, { l: 'Description', k: 'description', ph: 'What is this group for?' }].map(f => (
                          <div key={f.k} style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>{f.l}</label>
                            <input value={editingGroup[f.k] || ''} onChange={e => setEditingGroup(prev => ({ ...prev, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setEditingGroup(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          <button onClick={updateGroup} style={{ flex: 2, padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontSize: 32 }}>{activeGroup.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{activeGroup.name}</div>
                            {activeGroup.subject && <div style={{ fontSize: 12, color: '#64748b' }}>{activeGroup.subject}</div>}
                            {activeGroup.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{activeGroup.description}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                          👥 {Array.isArray(activeGroup.members) ? activeGroup.members.length : 0} members · {activeGroup.is_public ? '🌍 Public' : '🔒 Private'} · Created {timeAgo(activeGroup.created_at)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {activeGroup.created_by === user?.id && (
                            <button onClick={() => setEditingGroup({ ...activeGroup })} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✏️ Edit Group</button>
                          )}
                          {myGroups.some(g => g.id === activeGroup.id) && activeGroup.created_by !== user?.id && (
                            <button onClick={() => leaveGroup(activeGroup)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🚪 Leave Group</button>
                          )}
                          {activeGroup.created_by === user?.id && (
                            <button onClick={() => deleteGroup(activeGroup)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🗑 Delete Group</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reply indicator */}
                {replyingTo && (
                  <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', background: 'rgba(37,99,235,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#60a5fa' }}>↩️ Replying to <strong>{replyingTo.display_name}</strong>: {replyingTo.content?.slice(0, 50)}...</div>
                    <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {loadingMessages ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                      <div style={{ width: 24, height: 24, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                      Loading messages...
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{activeGroup.avatar || '👥'}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Welcome to {activeGroup.name}!</div>
                      <div style={{ fontSize: 12, marginTop: 5, lineHeight: 1.6 }}>Send a message · Share files · Use <code style={{ color: '#60a5fa' }}>/ask</code> for AI help</div>
                    </div>
                  ) : (
                    groupMessages.map((msg, i) => {
                      if (msg.message_type === 'system') {
                        return (
                          <div key={msg.id || i} style={{ textAlign: 'center', margin: '8px 0' }}>
                            <span style={{ fontSize: 11, color: '#64748b', background: 'var(--surface)', padding: '3px 12px', borderRadius: 12, border: '1px solid var(--border)' }}>{msg.content}</span>
                          </div>
                        )
                      }
                      const isMe = user && msg.user_id === user.id
                      const isAI = msg.username === 'edubot'
                      const isTemp = msg._temp
                      const showHeader = i === 0 || groupMessages[i - 1]?.user_id !== msg.user_id || groupMessages[i - 1]?.message_type === 'system'

                      return (
                        <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {showHeader && !isMe && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                              <Avatar name={msg.display_name || msg.username} size={20}
                                gradient={isAI ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'linear-gradient(135deg,#7c3aed,#2563eb)'} />
                              <span style={{ fontSize: 11, color: isAI ? '#60a5fa' : '#94a3b8', fontWeight: 600 }}>{msg.display_name || 'Student'}</span>
                              {msg.is_pinned && <span style={{ fontSize: 10, color: '#f59e0b' }}>📌</span>}
                            </div>
                          )}

                          <div style={{ position: 'relative' }}
                            onMouseEnter={e => { const a = e.currentTarget.querySelector('.msg-acts'); if (a) a.style.opacity = '1' }}
                            onMouseLeave={e => { const a = e.currentTarget.querySelector('.msg-acts'); if (a) a.style.opacity = '0' }}
                          >
                            {msg.message_type === 'image' && msg.image_url ? (
                              <img src={msg.image_url} alt="" style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, cursor: 'pointer', objectFit: 'cover', display: 'block' }} onClick={() => window.open(msg.image_url, '_blank')} />
                            ) : msg.message_type === 'document' && msg.document_url ? (
                              <div>
                                <a href={msg.document_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: isMe ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${isMe ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, textDecoration: 'none', maxWidth: 240, marginBottom: 4 }}>
                                  <span style={{ fontSize: 22 }}>📄</span>
                                  <div>
                                    <div style={{ fontSize: 12, color: isMe ? '#93c5fd' : '#60a5fa', fontWeight: 600 }}>{msg.document_name || 'Document'}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>Click to open</div>
                                  </div>
                                </a>
                                <button onClick={() => saveGroupFileToLibrary(msg)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer' }}>📚 Save to Library</button>
                              </div>
                            ) : (
                              <div style={{
                                padding: '9px 13px',
                                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                background: isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : isAI ? 'rgba(37,99,235,0.1)' : 'var(--surface2)',
                                border: isMe ? 'none' : isAI ? '1px solid rgba(37,99,235,0.25)' : '1px solid var(--border)',
                                color: '#e2e8f0', fontSize: 13, lineHeight: 1.6,
                                maxWidth: '72%', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                                borderLeft: msg.is_pinned && !isMe ? '3px solid #f59e0b' : undefined,
                                opacity: isTemp ? 0.7 : 1,
                              }}>
                                {msg.content}
                              </div>
                            )}

                            {/* Hover actions */}
                            {!isTemp && (
                              <div className="msg-acts" style={{ opacity: 0, transition: 'opacity 0.15s', position: 'absolute', top: 0, [isMe ? 'left' : 'right']: 'calc(100% + 5px)', display: 'flex', gap: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px', zIndex: 10, pointerEvents: 'all' }}>
                                <button onClick={() => setReplyingTo(msg)} title="Reply" style={{ padding: '3px 7px', borderRadius: 5, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>↩️</button>
                                {activeGroup.created_by === user?.id && (
                                  <button onClick={() => pinMessage(msg)} title={msg.is_pinned ? 'Unpin' : 'Pin'} style={{ padding: '3px 7px', borderRadius: 5, background: 'none', border: 'none', color: msg.is_pinned ? '#f59e0b' : '#64748b', cursor: 'pointer', fontSize: 12 }}>📌</button>
                                )}
                                {(isMe || activeGroup.created_by === user?.id) && (
                                  <button onClick={() => deleteMessage(msg.id)} title="Delete" style={{ padding: '3px 7px', borderRadius: 5, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: 9, color: '#374151', marginTop: 2, paddingLeft: isMe ? 0 : 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {timeAgo(msg.created_at)}
                            {isTemp && <span style={{ color: '#374151' }}>· sending...</span>}
                          </div>
                        </div>
                      )
                    })
                  )}

                  {/* AI streaming */}
                  {groupAILoading && groupAIStream && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Avatar name="E" size={20} gradient="linear-gradient(135deg,#1d4ed8,#2563eb)" />
                        <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>EduBot AI 🤖</span>
                      </div>
                      <div style={{ padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, maxWidth: '72%', whiteSpace: 'pre-wrap' }}>
                        {groupAIStream}
                      </div>
                    </div>
                  )}

                  <div ref={msgEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, alignItems: 'flex-end', flexShrink: 0, background: 'var(--bg)' }}>
                  <button onClick={() => groupFileRef.current?.click()} title="Send file or image"
                    style={{ padding: '9px 10px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#64748b', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>📎</button>
                  <input ref={groupFileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.ppt,.pptx"
                    onChange={e => { if (e.target.files[0]) { sendGroupFile(e.target.files[0]); e.target.value = '' } }}
                    style={{ display: 'none' }} />
                  <input
                    ref={groupInputRef}
                    value={groupInput}
                    onChange={e => setGroupInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendGroupMessage()
                      }
                    }}
                    disabled={sendingMsg || groupAILoading}
                    placeholder={`Message ${activeGroup.name}... or /ask [question] for AI`}
                    style={{ flex: 1, padding: '10px 13px', borderRadius: 10, fontSize: 13, background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', color: '#e2e8f0', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(16,185,129,0.3)'}
                  />
                  <button
                    onClick={sendGroupMessage}
                    disabled={!groupInput.trim() || sendingMsg || groupAILoading}
                    style={{ padding: '10px 14px', borderRadius: 10, background: groupInput.trim() && !sendingMsg ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)', color: groupInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>↑</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 14, color: '#64748b' }}>
                <div style={{ fontSize: 52 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>Select a group to chat</div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                  Join a group or create one for your module.<br />
                  <span style={{ color: '#60a5fa' }}>Use /ask to summon AI help for everyone.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NEW POST MODAL ─────────────────────────────────────── */}
      {showNewPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: 26, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>✏️ New Post</div>
              <button onClick={() => setShowNewPost(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={myName} size={40} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{myName}</div>
                {myUsername && <div style={{ fontSize: 12, color: '#60a5fa' }}>@{myUsername}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[{ id: 'text', label: '💬 Post' }, { id: 'question', label: '❓ Question' }, { id: 'link', label: '🔗 Link' }].map(t => (
                <button key={t.id} onClick={() => setPostType(t.id)} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: postType === t.id ? 'rgba(37,99,235,0.18)' : 'var(--surface2)', color: postType === t.id ? '#60a5fa' : '#64748b', border: `1px solid ${postType === t.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}>{t.label}</button>
              ))}
            </div>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
              placeholder={postType === 'question' ? "What's your question? Be specific..." : "Share something with the community..."}
              rows={5} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', marginBottom: 12 }} autoFocus />
            {postType === 'link' && <input value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', marginBottom: 12 }} />}
            {postImages.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {postImages.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={img.preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    <button onClick={() => setPostImages(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {postDoc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <span style={{ fontSize: 13, color: '#60a5fa', flex: 1 }}>{postDoc.name}</span>
                <button onClick={() => { setPostDoc(null); setPostType('text') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>🖼️ Image</button>
              <button onClick={() => docInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>📄 Document</button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => { const files = Array.from(e.target.files).slice(0, 4); setPostImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 4)); setPostType('image') }} style={{ display: 'none' }} />
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={e => { if (e.target.files[0]) { setPostDoc(e.target.files[0]); setPostType('document') } }} style={{ display: 'none' }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Tags</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => setPostTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ padding: '4px 11px', borderRadius: 14, fontSize: 11, cursor: 'pointer', background: postTags.includes(tag) ? 'rgba(124,58,237,0.18)' : 'var(--surface2)', color: postTags.includes(tag) ? '#a78bfa' : '#64748b', border: `1px solid ${postTags.includes(tag) ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, fontWeight: postTags.includes(tag) ? 700 : 400 }}>{tag}</button>
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

      {/* ── CREATE GROUP MODAL ─────────────────────────────────── */}
      {showNewGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 18, padding: 26, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>➕ Create Group Chat</div>
              <button onClick={() => setShowNewGroup(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Group Icon</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {GROUP_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setNewGroupAvatar(emoji)} style={{ width: 38, height: 38, borderRadius: 9, border: `2px solid ${newGroupAvatar === emoji ? '#10b981' : 'var(--border)'}`, background: newGroupAvatar === emoji ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{emoji}</button>
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
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: `1px solid ${field.required && !field.value ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, color: '#e2e8f0', outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setNewGroupPrivate(p => !p)}>
              <div style={{ width: 40, height: 22, borderRadius: 11, background: newGroupPrivate ? '#2563eb' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: newGroupPrivate ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{newGroupPrivate ? '🔒 Private Group' : '🌍 Public Group'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{newGroupPrivate ? 'Only members you invite can see this group' : 'Anyone can discover and join this group'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
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

