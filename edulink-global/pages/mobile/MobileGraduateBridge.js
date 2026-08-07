import { useState, useEffect } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'

export default function MobileGraduateBridge() {
  const { user, profile } = useUser()
  const [alumni, setAlumni] = useState([])
  const [jobs, setJobs] = useState([])
  const [myAlumniStatus, setMyAlumniStatus] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const [joinForm, setJoinForm] = useState({ graduation_year: '', employer: '', role: '', advice: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data: profileData } = await supabase.from('profiles').select('is_alumni,graduation_year,employer,role').eq('id', user.id).single()
    setMyAlumniStatus(profileData?.is_alumni || false)

    const { data: alumniData } = await supabase.from('profiles')
      .select('id,name,username,avatar_url,field,institution,graduation_year,employer,role,bio')
      .eq('is_alumni', true).eq('profile_public', true).limit(20)
    setAlumni(alumniData || [])

    const { data: jobData } = await supabase.from('community_posts')
      .select('*').contains('tags', ['#Internships']).order('created_at', { ascending: false }).limit(10)
    setJobs(jobData || [])
    setLoading(false)
  }

  const joinAsAlumni = async () => {
    await supabase.from('profiles').update({ is_alumni: true, ...joinForm }).eq('id', user.id)
    setMyAlumniStatus(true); setShowJoinSheet(false)
    load()
  }

  return (
    <MobileLayout title="🎓 Graduate Bridge">
      <div style={{ padding: '12px 16px' }}>

        {/* Join as alumni */}
        {!myAlumniStatus && (
          <div style={{ padding: '18px', borderRadius: 16, background: 'linear-gradient(135deg,rgba(37,99,235,0.1),rgba(124,58,237,0.07))', border: '1px solid rgba(37,99,235,0.25)', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Are you a graduate?</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>Join the alumni network and mentor current students, share opportunities, and stay connected.</div>
            <button onClick={() => setShowJoinSheet(true)} style={{ padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Join as Alumni 🎓
            </button>
          </div>
        )}

        {/* Job opportunities */}
        {jobs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>💼 Opportunities Shared by Alumni</div>
            {jobs.map(post => (
              <div key={post.id} style={{ padding: '13px 16px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{post.display_name || 'Alumni'}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{post.content?.slice(0, 120)}{post.content?.length > 120 ? '...' : ''}</div>
              </div>
            ))}
          </div>
        )}

        {/* Alumni */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>🌟 Alumni Network ({alumni.length})</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>Loading alumni...</div>
          ) : alumni.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎓</div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>No alumni yet — be the first to join!</div>
            </div>
          ) : alumni.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.name || '?')[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.name}</div>
                {a.role && a.employer && <div style={{ fontSize: 12, color: '#60a5fa' }}>{a.role} at {a.employer}</div>}
                {a.graduation_year && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Class of {a.graduation_year} · {a.field}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomSheet open={showJoinSheet} onClose={() => setShowJoinSheet(false)} title="🎓 Join Alumni Network" height="75vh">
        <div style={{ padding: '16px' }}>
          {[
            { key: 'graduation_year', label: 'Graduation Year', placeholder: '2024', type: 'number' },
            { key: 'employer', label: 'Current Employer', placeholder: 'e.g. Eskom, Standard Bank', type: 'text' },
            { key: 'role', label: 'Current Role', placeholder: 'e.g. Graduate Engineer', type: 'text' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={joinForm[f.key]} onChange={e => setJoinForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Advice for Current Students</label>
            <textarea value={joinForm.advice} onChange={e => setJoinForm(p => ({ ...p, advice: e.target.value }))} placeholder="What do you wish you knew as a student?" rows={3}
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <button onClick={joinAsAlumni} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🎓 Join Alumni Network
          </button>
        </div>
      </MobileBottomSheet>
    </MobileLayout>
  )
}