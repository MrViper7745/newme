import { useEffect, useState } from 'react'
import useHaptic from '../../hooks/useHaptic'

const MILESTONES = {
  7:   { emoji: '🔥', title: '7-Day Streak!',   msg: 'One week of consistency — you are building a real habit.' },
  14:  { emoji: '⚡', title: '2 Weeks Strong!',  msg: 'Two weeks straight. Your brain is actively forming new neural pathways.' },
  30:  { emoji: '🏆', title: '30 Days!',         msg: 'A full month. You have studied more consistently than 89% of EduLink students.' },
  60:  { emoji: '🌟', title: '60 Days!',         msg: 'Two months of daily dedication. This is what top students look like.' },
  100: { emoji: '👑', title: '100 DAYS!',        msg: 'One hundred days. You are in the top 1% of EduLink students globally.' },
}

export default function StudyStreakCelebration({ streak }) {
  const haptic = useHaptic()
  const [show, setShow] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!streak || !MILESTONES[streak]) return
    const key = `streak_celebrated_${streak}`
    if (!localStorage.getItem(key)) {
      setData(MILESTONES[streak])
      setShow(true)
      localStorage.setItem(key, '1')
      setTimeout(() => haptic.celebration(), 200)
    }
  }, [streak])

  if (!show || !data) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '2px solid rgba(245,158,11,0.4)', borderRadius: 24, padding: '32px 24px', textAlign: 'center', maxWidth: 320, width: '100%', animation: 'popIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ fontSize: 72, marginBottom: 16, display: 'block', animation: 'float 2s ease-in-out infinite' }}>{data.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', marginBottom: 8 }}>{data.title}</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#f59e0b', marginBottom: 12 }}>{streak} 🔥</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24 }}>{data.msg}</div>
        <button onClick={() => setShow(false)}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
          Keep Going! 💪
        </button>
      </div>
      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  )
}