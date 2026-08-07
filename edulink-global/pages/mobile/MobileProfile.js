import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { useUser } from '../../lib/useUser'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

const FIELDS = ['Engineering', 'Computer Science', 'Business Administration', 'Law', 'Medicine', 'Accounting', 'Architecture', 'Education', 'Psychology', 'Social Work', 'Nursing', 'Agriculture', 'Environmental Science', 'Mathematics', 'Physics', 'Chemistry', 'Economics']
const QUALS = ['National Diploma', 'Advanced Diploma', 'BTech', 'BEng', 'BSc', 'BCom', 'BA', 'LLB', 'Honours', 'Masters', 'PhD']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Honours', 'Masters', 'PhD']

export default function MobileProfile() {
  const { user, profile } = useUser()
  const haptic = useHaptic()
  const [activeSheet, setActiveSheet] = useState(null)
  const [form, setForm] = useState({ name: '', bio: '', field: '', qualification: '', year_of_study: '', institution: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({ library: 0, practice: 0, streak: 0, posts: 0 })
  const [avatarUploading, setAvatarUploading] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', bio: profile.bio || '', field: profile.field || '', qualification: profile.qualification || '', year_of_study: profile.year_of_study || '', institution: profile.institution || '' })
    if (user) loadStats()
  }, [profile, user])

  const loadStats = async () => {
    const [libRes, practRes, langRes, postRes] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('practice_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      supabase.from('language_progress').select('streak').eq('user_id', user.id).order('streak', { ascending: false }).limit(1),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({ library: libRes.count || 0, practice: practRes.count || 0, streak: langRes.data?.[0]?.streak || 0, posts: postRes.count || 0 })
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
    setSaving(false)
    if (error) showToast('❌ ' + error.message)
    else { haptic.success(); showToast('✅ Profile saved!'); setActiveSheet(null) }
  }

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      haptic.success()
      showToast('✅ Avatar updated!')
    } catch (err) { showToast('❌ ' + err.message) }
    setAvatarUploading(false)
    e.target.value = ''
  }

  const PROFILE_SECTIONS = [
    { id: 'personal', label: '👤 Personal Info', fields: ['name', 'bio'] },
    { id: 'academic', label: '🎓 Academic Info', fields: ['field', 'qualification', 'year_of_study', 'institution'] },
  ]

  const FIELD_CONFIG = {
    name:          { label: 'Full Name', placeholder: 'Your full name', type: 'text' },
    bio:           { label: 'Bio', placeholder: 'Tell other students about yourself', type: 'textarea' },
    field:         { label: 'Field of Study', type: 'select', options: FIELDS },
    qualification: { label: 'Qualification', type: 'select', options: QUALS },
    year_of_study: { label: 'Year of Study', type: 'select', options: YEARS },
    institution:   { label: 'Institution', placeholder: 'University name', type: 'text' },
  }

  return (
    <MobileLayout title="👤 Profile">
      <div style={{ padding: '12px 16px' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', overflow: 'hidden', border: '3px solid rgba(37,99,235,0.4)' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.name || user?.email || '?')[0]?.toUpperCase()}
            </div>
            {avatarUploading
              ? <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⏳</div>
              : <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: '2px solid var(--bg)' }}>📷</div>
            }
            <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
          </label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{profile?.name || 'Student'}</div>
            {profile?.username && <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 2 }}>@{profile.username}</div>}
            {profile?.field && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{profile.field}{profile.institution ? ` · ${profile.institution}` : ''}</div>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 22 }}>
          {[
            { label: 'Files',    value: stats.library,  color: '#2563eb' },
            { label: 'Practice', value: stats.practice, color: '#7c3aed' },
            { label: 'Streak',   value: `${stats.streak}d`, color: '#f59e0b' },
            { label: 'Posts',    value: stats.posts,    color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit sections */}
        {PROFILE_SECTIONS.map(section => (
          <div key={section.id} onClick={() => setActiveSheet(section.id)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', marginBottom: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
            onTouchEnd={e => e.currentTarget.style.background = 'var(--surface)'}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{section.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {section.id === 'personal' ? (form.name || 'Not set') : (form.field || 'Not set')}
              </div>
            </div>
            <span style={{ color: 'var(--text3)', fontSize: 18 }}>›</span>
          </div>
        ))}

        {/* Quick links */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Quick Access</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { href: '/settings', icon: '⚙️', label: 'Settings' },
              { href: '/analytics', icon: '📈', label: 'Analytics' },
              { href: '/challenges', icon: '🏆', label: 'My Wallet' },
              { href: '/cv-builder', icon: '📄', label: 'CV Builder' },
            ].map(link => (
              <div key={link.href} onClick={() => require('next/router').default.push(link.href)}
                style={{ padding: '14px 12px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{link.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{link.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit sheets */}
      {PROFILE_SECTIONS.map(section => (
        <MobileBottomSheet key={section.id} open={activeSheet === section.id} onClose={() => setActiveSheet(null)} title={section.label} height="75vh">
          <div style={{ padding: '16px' }}>
            {section.fields.map(key => {
              const config = FIELD_CONFIG[key]
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{config.label}</label>
                  {config.type === 'textarea' ? (
                    <textarea value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={config.placeholder} rows={4}
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  ) : config.type === 'select' ? (
                    <select value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}>
                      <option value="">Select...</option>
                      {config.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={config.placeholder}
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
                  )}
                </div>
              )
            })}
            <button onClick={save} disabled={saving}
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </MobileBottomSheet>
      ))}

      {toast && <div className="toast">{toast}</div>}
    </MobileLayout>
  )
}