import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useHaptic from '../../hooks/useHaptic'

const SLIDES = [
  { id: 'welcome',    color: '#2563eb' },
  { id: 'library',   color: '#7c3aed' },
  { id: 'study',     color: '#10b981' },
  { id: 'challenges', color: '#f59e0b' },
  { id: 'community', color: '#ec4899' },
  { id: 'final',     color: '#2563eb' },
]

export default function EduLinkWrapped({ userId, profile, open, onClose }) {
  const haptic = useHaptic()
  const [slide, setSlide] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && userId) { setSlide(0); load() }
  }, [open, userId])

  const load = async () => {
    setLoading(true)
    const year = new Date().getFullYear()
    const yearStart = `${year}-01-01`
    const [libRes, practRes, sessRes, chalRes, postRes, langRes, walletRes] = await Promise.all([
      supabase.from('library_files').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('saved_at', yearStart),
      supabase.from('practice_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true).gte('created_at', yearStart),
      supabase.from('study_sessions').select('duration_minutes').eq('user_id', userId).eq('completed', true).gte('session_date', yearStart),
      supabase.from('challenge_attempts').select('id,passed,percentage').eq('user_id', userId).eq('completed', true).gte('completed_at', yearStart),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', yearStart),
      supabase.from('language_progress').select('streak,language').eq('user_id', userId).order('streak', { ascending: false }).limit(1),
      supabase.from('student_wallet').select('total_earned,total_points_earned').eq('user_id', userId).single(),
    ])
    const challenges = chalRes.data || []
    const passed = challenges.filter(c => c.passed).length
    const avgScore = challenges.length ? Math.round(challenges.reduce((s, c) => s + (c.percentage || 0), 0) / challenges.length) : 0
    const totalMins = (sessRes.data || []).reduce((s, x) => s + (x.duration_minutes || 45), 0)
    setData({
      filesAdded: libRes.count || 0,
      practiceExams: practRes.count || 0,
      studyHours: Math.floor(totalMins / 60),
      studyMins: totalMins % 60,
      challengesAttempted: challenges.length,
      challengesPassed: passed,
      avgScore,
      postsShared: postRes.count || 0,
      streak: langRes.data?.[0]?.streak || 0,
      language: langRes.data?.[0]?.language,
      totalEarned: walletRes.data?.total_earned || 0,
      totalPoints: walletRes.data?.total_points_earned || 0,
    })
    setLoading(false)
  }

  const next = () => {
    haptic.tap()
    if (slide < SLIDES.length - 1) setSlide(s => s + 1)
    else onClose()
  }

  const share = async () => {
    haptic.celebration()
    const text = `🎓 My EduLink ${new Date().getFullYear()} Wrapped:\n\n📚 ${data?.filesAdded} files saved\n✍️ ${data?.practiceExams} practice exams\n⏱️ ${data?.studyHours}h ${data?.studyMins}m studied\n🏆 ${data?.challengesPassed}/${data?.challengesAttempted} challenges passed\n💰 R${data?.totalEarned?.toFixed(0)} earned\n⭐ ${data?.totalPoints?.toLocaleString()} points\n\n#EduLinkWrapped #StudentLife #SouthAfrica`
    try {
      if (navigator.share) await navigator.share({ title: 'My EduLink Wrapped', text })
      else await navigator.clipboard.writeText(text)
    } catch {}
  }

  if (!open) return null

  const current = SLIDES[slide]
  const name = profile?.name?.split(' ')[0] || 'Student'

  const slideContent = () => {
    if (loading) return <div style={{ textAlign: 'center', color: '#fff' }}><div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />Loading your year...</div>
    switch (current.id) {
      case 'welcome': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🎓</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 10 }}>{name}'s {new Date().getFullYear()} Wrapped</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>What a year of studying it has been. Here is everything you accomplished on EduLink.</div>
        </div>
      )
      case 'library': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>You saved</div>
          <div style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{data?.filesAdded}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 20 }}>study files</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>And completed {data?.practiceExams} practice exams to prepare for them.</div>
        </div>
      )
      case 'study': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>You spent</div>
          <div style={{ fontSize: 70, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{data?.studyHours}h</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 20 }}>studying this year</div>
          {data?.streak > 0 && <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>Your best streak was {data?.streak} days 🔥</div>}
        </div>
      )
      case 'challenges': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{data?.challengesPassed}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>challenges passed</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>out of {data?.challengesAttempted} attempted · avg {data?.avgScore}%</div>
          {data?.totalEarned > 0 && <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: 20 }}>💰 R{data?.totalEarned?.toFixed(2)} earned</div>}
        </div>
      )
      case 'community': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌍</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>You shared {data?.postsShared} posts with the community</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{data?.totalPoints?.toLocaleString()}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>total points earned</div>
        </div>
      )
      case 'final': return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🥂</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 10 }}>What a year, {name}!</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 28 }}>Every file, every challenge, every late-night study session — it all adds up. Keep going in {new Date().getFullYear() + 1}.</div>
          <button onClick={share} style={{ padding: '14px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            📤 Share My Wrapped
          </button>
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: `linear-gradient(135deg,${current.color},${current.color}99)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 32px 48px', transition: 'background 0.5s' }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)' }}>
        {SLIDES.map((_, i) => <div key={i} style={{ height: 3, width: i === slide ? 24 : 8, borderRadius: 2, background: i <= slide ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', transition: 'all 0.3s' }} />)}
      </div>

      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>×</button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {slideContent()}
      </div>

      <button onClick={next} style={{ width: '100%', maxWidth: 300, padding: '16px', borderRadius: 16, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
        {slide === SLIDES.length - 1 ? 'Close ✨' : 'Next →'}
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}