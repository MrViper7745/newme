import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Profile() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', bio: '', field: '', institution: '',
    country: '', username: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({ library: 0, practice: 0, sessions: 0, streak: 0 })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name || '',
      bio: profile.bio || '',
      field: profile.field || '',
      institution: profile.institution || '',
      country: profile.country || '',
      username: profile.username || '',
    })
    setAvatarUrl(profile.avatar_url || null)
    loadStats()
  }, [profile])

  const loadStats = async () => {
    if (!user) return
    const [
      { count: libCount },
      { count: practiceCount },
      { data: langData },
    ] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('practice_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      supabase.from('language_progress').select('streak').eq('user_id', user.id).order('streak', { ascending: false }).limit(1),
    ])
    setStats({
      library: libCount || 0,
      practice: practiceCount || 0,
      streak: langData?.[0]?.streak || 0,
    })
  }

  const uploadAvatar = async (file) => {
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl + '?t=' + Date.now())
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      showToast('✅ Profile photo updated!')
    } catch (e) {
      showToast('❌ ' + e.message)
    }
    setUploadingAvatar(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      bio: form.bio,
      field: form.field,
      institution: form.institution,
      country: form.country,
    }).eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else showToast('✅ Profile saved!')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!user) return null

  const I = { width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }
  const L = { fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '90px 16px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>👤 My Profile</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Your public profile and academic information</p>
        </div>

        {/* Avatar + basic info card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 28 }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: '#fff', overflow: 'hidden', border: '3px solid rgba(37,99,235,0.4)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (form.name || user.email || '?')[0]?.toUpperCase()
                }
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#2563eb', border: '2px solid var(--bg)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                title="Change photo"
              >
                {uploadingAvatar ? '⏳' : '📷'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => uploadAvatar(e.target.files[0])} style={{ display: 'none' }} />
            </div>

            {/* Name + username */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{form.name || 'Student'}</div>
              {profile?.username && <div style={{ fontSize: 14, color: '#60a5fa', marginBottom: 4 }}>@{profile.username}</div>}
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{form.field}{form.field && form.institution ? ' · ' : ''}{form.institution}</div>
              {form.bio && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, maxWidth: 400 }}>{form.bio}</div>}
              <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>{form.country}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Files Saved', value: stats.library, icon: '📚', color: '#2563eb' },
              { label: 'Exams Practised', value: stats.practice, icon: '✍️', color: '#7c3aed' },
              { label: 'Language Streak', value: `${stats.streak}d`, icon: '🔥', color: '#f59e0b' },
              { label: 'Member Since', value: new Date(user.created_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }), icon: '🎓', color: '#10b981' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Edit form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={L}>Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" style={I} />
            </div>
            <div>
              <label style={L}>Field of Study</label>
              <input value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} placeholder="e.g. Electrical Engineering" style={I} />
            </div>
            <div>
              <label style={L}>Institution</label>
              <input value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder="Your university or college" style={I} />
            </div>
            <div>
              <label style={L}>Country</label>
              <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="e.g. South Africa" style={I} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={L}>Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell people about yourself, your interests and goals..." rows={3}
                style={{ ...I, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving} style={{ marginTop: 18, padding: '11px 28px', borderRadius: 10, background: saving ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: saving ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? '⏳ Saving...' : '💾 Save Profile'}
          </button>
        </div>

        {/* Username card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>🔖 Username</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Your @username is how other students find and message you.</div>
          {profile?.username ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: '10px 16px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid rgba(37,99,235,0.3)', fontSize: 15, color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>
                @{profile.username}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`@${profile.username}`); showToast('📋 Copied!') }} style={{ padding: '10px 16px', borderRadius: 9, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📋 Copy
              </button>
            </div>
          ) : (
            <button onClick={() => router.push('/settings')} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              👤 Set Your Username
            </button>
          )}
        </div>

        {/* Quick links */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>⚡ Quick Access</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
            {[
              { href: '/library', label: '📚 My Library', desc: `${stats.library} files` },
              { href: '/exams', label: '📅 Exam Planner', desc: 'Countdowns + schedule' },
              { href: '/study-ai', label: '🤖 Study AI', desc: 'Flashcards, quizzes' },
              { href: '/community', label: '🌍 Community', desc: 'Posts & groups' },
              { href: '/messages', label: '✉️ Messages', desc: 'Direct messages' },
              { href: '/settings', label: '⚙️ Settings', desc: 'Account & preferences' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{item.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}