import useIsMobile from '../hooks/useIsMobile'
import dynamic from 'next/dynamic'
import MobileProfile from './mobile/MobileProfile'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import UsernameSetup from '../components/UsernameSetup'

const MobileProfile = dynamic(() => import('./mobile/MobileProfile'), { ssr: false })

export default function ProfilePage() {
  const { isMobile } = useIsMobile()
  if (isMobile) return <MobileProfile />
  return <Profile />
}

const FIELDS = ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Computer Science', 'Information Technology', 'Chemical Engineering', 'Industrial Engineering', 'Architecture', 'Accounting', 'Law', 'Medicine', 'Nursing', 'Education', 'Business Management', 'Economics', 'Psychology', 'Other']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate', 'Masters', 'PhD']
const QUAL_TYPES = ['National Diploma', 'BTech', 'BEng / BSc Eng', 'BCom', 'BSc', 'BA', 'LLB', 'MBChB', 'Honours', 'Masters', 'PhD', 'Other']


 function Profile() {
  
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', bio: '', field: '', qualification_type: '',
    year_of_study: '', institution: '', country: '',
    notifications_email: true, notifications_reminders: true, notifications_opportunities: true,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({ library: 0, practice: 0, streak: 0, posts: 0 })
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)
  const [activeSection, setActiveSection] = useState('personal') // 'personal' | 'academic' | 'notifications'

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
      qualification_type: profile.qualification_type || '',
      year_of_study: profile.year_of_study || '',
      institution: profile.institution || '',
      country: profile.country || '',
      notifications_email: profile.notifications_email !== false,
      notifications_reminders: profile.notifications_reminders !== false,
      notifications_opportunities: profile.notifications_opportunities !== false,
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
      { count: postCount },
    ] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('practice_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      supabase.from('language_progress').select('streak').eq('user_id', user.id).order('streak', { ascending: false }).limit(1),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({ library: libCount || 0, practice: practiceCount || 0, streak: langData?.[0]?.streak || 0, posts: postCount || 0 })
  }

  const uploadAvatar = async (file) => {
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = publicUrl + '?t=' + Date.now()
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      showToast('✅ Profile photo updated!')
    } catch (e) { showToast('❌ ' + e.message) }
    setUploadingAvatar(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      bio: form.bio,
      field: form.field,
      qualification_type: form.qualification_type,
      year_of_study: form.year_of_study,
      institution: form.institution,
      country: form.country,
      notifications_email: form.notifications_email,
      notifications_reminders: form.notifications_reminders,
      notifications_opportunities: form.notifications_opportunities,
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

  const I = (extra = {}) => ({ width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', ...extra })
  const L = { fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }
  const S = { marginBottom: 18 }

  const sections = [
    { id: 'personal', label: '👤 Personal' },
    { id: 'academic', label: '🎓 Academic' },
    { id: 'notifications', label: '🔔 Notifications' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      {showUsernameSetup && (
        <UsernameSetup
          onComplete={() => { setShowUsernameSetup(false); showToast('✅ Username set!') }}
          onSkip={() => setShowUsernameSetup(false)}
        />
      )}

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '90px 16px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>👤 My Profile</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Manage your personal and academic information</p>
        </div>

        {/* Avatar + name card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900, color: '#fff', overflow: 'hidden', border: '3px solid rgba(37,99,235,0.4)' }}>
                {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (form.name || user?.email || '?')[0]?.toUpperCase()}
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
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>{form.name || 'Your Name'}</div>
              {profile?.username ? (
                <div style={{ fontSize: 14, color: '#60a5fa', marginBottom: 4, fontFamily: 'monospace' }}>@{profile.username}</div>
              ) : (
                <button onClick={() => setShowUsernameSetup(true)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', cursor: 'pointer', marginBottom: 4 }}>
                  👤 Set username
                </button>
              )}
              {form.field && <div style={{ fontSize: 13, color: '#94a3b8' }}>{form.field}{form.institution ? ` · ${form.institution}` : ''}</div>}
              {form.year_of_study && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{form.year_of_study}{form.qualification_type ? ` · ${form.qualification_type}` : ''}</div>}
              {form.bio && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, lineHeight: 1.5, maxWidth: 400 }}>{form.bio}</div>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginTop: 22 }}>
            {[
              { label: 'Files Saved', value: stats.library, icon: '📚', color: '#2563eb' },
              { label: 'Exams Practised', value: stats.practice, icon: '✍️', color: '#7c3aed' },
              { label: 'Language Streak', value: `${stats.streak}d`, icon: '🔥', color: '#f59e0b' },
              { label: 'Community Posts', value: stats.posts, icon: '🌍', color: '#10b981' },
              { label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : '—', icon: '🎓', color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', background: 'transparent', color: activeSection === s.id ? '#60a5fa' : '#64748b', fontWeight: activeSection === s.id ? 700 : 500, fontSize: 13, borderBottom: `2px solid ${activeSection === s.id ? '#2563eb' : 'transparent'}` }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Personal section */}
        {activeSection === 'personal' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={S}>
                <label style={L}>Full Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" style={I()} />
              </div>
              <div style={S}>
                <label style={L}>Country</label>
                <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="e.g. South Africa" style={I()} />
              </div>
              <div style={{ ...S, gridColumn: 'span 2' }}>
                <label style={L}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell people about yourself, your interests and goals..." rows={3}
                  style={{ ...I(), resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </div>

            {/* Username */}
            <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 4 }}>🔖 Username</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>How other students find and message you. Set once, cannot be changed.</div>
              {profile?.username ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', fontSize: 14, color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>@{profile.username}</div>
                  <button onClick={() => { navigator.clipboard.writeText(`@${profile.username}`); showToast('📋 Copied!') }} style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📋 Copy</button>
                </div>
              ) : (
                <button onClick={() => setShowUsernameSetup(true)} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  👤 Set Your Username
                </button>
              )}
            </div>
          </div>
        )}

        {/* Academic section */}
        {activeSection === 'academic' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.6 }}>
              This information helps EduLink prioritise the right exam papers and modules in your library.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={S}>
                <label style={L}>Field of Study</label>
                <select value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} style={{ ...I(), cursor: 'pointer' }}>
                  <option value="">Select field...</option>
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={S}>
                <label style={L}>Qualification Type</label>
                <select value={form.qualification_type} onChange={e => setForm(p => ({ ...p, qualification_type: e.target.value }))} style={{ ...I(), cursor: 'pointer' }}>
                  <option value="">Select qualification...</option>
                  {QUAL_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div style={S}>
                <label style={L}>Year of Study</label>
                <select value={form.year_of_study} onChange={e => setForm(p => ({ ...p, year_of_study: e.target.value }))} style={{ ...I(), cursor: 'pointer' }}>
                  <option value="">Select year...</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={S}>
                <label style={L}>Institution</label>
                <input value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder="Your university or college" style={I()} />
              </div>
            </div>
          </div>
        )}

        {/* Notifications section */}
        {activeSection === 'notifications' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            {[
              { key: 'notifications_email', label: '📧 Email notifications', desc: 'Get important updates and weekly digests by email' },
              { key: 'notifications_reminders', label: '⏰ Study reminders', desc: 'AI-powered reminders when you\'re falling behind on your schedule' },
              { key: 'notifications_opportunities', label: '💼 Opportunity alerts', desc: 'Internships, scholarships, and jobs that match your profile' },
            ].map(n => (
              <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{n.desc}</div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, [n.key]: !p[n.key] }))}
                  style={{ width: 46, height: 26, borderRadius: 13, background: form[n.key] ? '#2563eb' : 'var(--surface2)', border: `1px solid ${form[n.key] ? '#2563eb' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: form[n.key] ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: form[n.key] ? '#fff' : '#64748b', transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        <button onClick={saveProfile} disabled={saving} style={{ padding: '12px 32px', borderRadius: 11, background: saving ? 'var(--surface2)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: saving ? '#64748b' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
          {saving ? '⏳ Saving...' : '💾 Save Changes'}
        </button>

        {/* Quick links */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginTop: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 16 }}>⚡ Quick Access</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {[
              { href: '/library', label: '📚 My Library', desc: `${stats.library} files` },
              { href: '/exams', label: '📅 Exam Planner', desc: 'Countdowns + schedule' },
              { href: '/study-ai', label: '🤖 Study AI', desc: 'Flashcards & quizzes' },
              { href: '/community', label: '🌍 Community', desc: 'Posts & groups' },
              { href: '/messages', label: '✉️ Messages', desc: 'Direct messages' },
              { href: '/settings', label: '⚙️ Settings', desc: 'Account settings' },
            ].map(item => (
              <div key={item.href} onClick={() => router.push(item.href)} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}