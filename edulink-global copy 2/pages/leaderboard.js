import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const BADGES = [
  { id: 'profile_complete', label: 'Profile Pro', icon: '👤', desc: 'Completed your full profile', points: 50, color: '#2563eb' },
  { id: 'first_save', label: 'Opportunity Seeker', icon: '💼', desc: 'Saved your first internship', points: 20, color: '#10b981' },
  { id: 'cv_uploaded', label: 'CV Ready', icon: '📄', desc: 'Uploaded your CV', points: 30, color: '#f59e0b' },
  { id: 'first_review', label: 'Community Voice', icon: '⭐', desc: 'Wrote your first company review', points: 40, color: '#8b5cf6' },
  { id: 'joined_group', label: 'Team Player', icon: '👥', desc: 'Joined a study group', points: 20, color: '#ef4444' },
  { id: 'interview_done', label: 'Interview Ace', icon: '🎙️', desc: 'Completed a mock interview', points: 60, color: '#06b6d4' },
  { id: 'cover_letter', label: 'Writer', icon: '📝', desc: 'Generated a cover letter', points: 25, color: '#f59e0b' },
  { id: 'rsvp_event', label: 'Event Goer', icon: '📅', desc: 'RSVP\'d to a career event', points: 15, color: '#10b981' },
  { id: 'applied_5', label: 'Go-Getter', icon: '🚀', desc: 'Tracked 5 applications', points: 50, color: '#2563eb' },
  { id: 'mentor_request', label: 'Mentee', icon: '🤝', desc: 'Requested a mentor', points: 30, color: '#8b5cf6' },
]

const LEVELS = [
  { name: 'Newcomer', min: 0, color: '#64748b', icon: '🌱' },
  { name: 'Explorer', min: 50, color: '#10b981', icon: '🗺️' },
  { name: 'Achiever', min: 150, color: '#2563eb', icon: '⭐' },
  { name: 'Champion', min: 300, color: '#8b5cf6', icon: '🏆' },
  { name: 'Legend', min: 500, color: '#f59e0b', icon: '👑' },
]

const getLevel = (points) => {
  return [...LEVELS].reverse().find(l => points >= l.min) || LEVELS[0]
}

export default function Leaderboard() {
  const { user, profile } = useUser()
  const [leaderboard, setLeaderboard] = useState([])
  const [myBadges, setMyBadges] = useState([])
  const [myPoints, setMyPoints] = useState(0)
  const [tab, setTab] = useState('leaderboard')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { fetchLeaderboard() }, [])
  useEffect(() => { if (user) { fetchMyBadges(); fetchMyPoints(); checkAndAwardBadges() } }, [user])

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('user_points').select('*').order('points', { ascending: false }).limit(20)
    setLeaderboard(data || [])
  }

  const fetchMyBadges = async () => {
    const { data } = await supabase.from('user_badges').select('*').eq('user_id', user.id)
    setMyBadges(data?.map(b => b.badge_id) || [])
  }

  const fetchMyPoints = async () => {
    const { data } = await supabase.from('user_points').select('points').eq('user_id', user.id).single()
    setMyPoints(data?.points || 0)
  }

  const checkAndAwardBadges = async () => {
    const { data: existingBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', user.id)
    const earned = existingBadges?.map(b => b.badge_id) || []

    const toAward = []

    if (!earned.includes('profile_complete') && profile?.bio && profile?.skills?.length > 0) {
      toAward.push('profile_complete')
    }
    const { data: savedInternships } = await supabase.from('saved_internships').select('id').eq('user_id', user.id).limit(1)
    if (!earned.includes('first_save') && savedInternships?.length > 0) toAward.push('first_save')

    const { data: cvData } = await supabase.from('profiles').select('cv_url').eq('id', user.id).single()
    if (!earned.includes('cv_uploaded') && cvData?.cv_url) toAward.push('cv_uploaded')

    const { data: reviews } = await supabase.from('reviews').select('id').eq('user_id', user.id).limit(1)
    if (!earned.includes('first_review') && reviews?.length > 0) toAward.push('first_review')

    const { data: groupMemberships } = await supabase.from('group_members').select('id').eq('user_id', user.id).limit(1)
    if (!earned.includes('joined_group') && groupMemberships?.length > 0) toAward.push('joined_group')

    const { data: interviews } = await supabase.from('mock_interviews').select('id').eq('user_id', user.id).eq('completed', true).limit(1)
    if (!earned.includes('interview_done') && interviews?.length > 0) toAward.push('interview_done')

    const { data: coverLetters } = await supabase.from('cover_letters').select('id').eq('user_id', user.id).limit(1)
    if (!earned.includes('cover_letter') && coverLetters?.length > 0) toAward.push('cover_letter')

    const { data: eventRsvps } = await supabase.from('event_rsvps').select('id').eq('user_id', user.id).limit(1)
    if (!earned.includes('rsvp_event') && eventRsvps?.length > 0) toAward.push('rsvp_event')

    const { data: apps } = await supabase.from('applications').select('id').eq('user_id', user.id)
    if (!earned.includes('applied_5') && apps?.length >= 5) toAward.push('applied_5')

    const { data: mentorRequests } = await supabase.from('mentor_requests').select('id').eq('student_id', user.id).limit(1)
    if (!earned.includes('mentor_request') && mentorRequests?.length > 0) toAward.push('mentor_request')

    if (toAward.length > 0) {
      const pointsToAdd = toAward.reduce((sum, id) => sum + (BADGES.find(b => b.id === id)?.points || 0), 0)

      await supabase.from('user_badges').insert(toAward.map(id => ({ user_id: user.id, badge_id: id })))

      const { data: existing } = await supabase.from('user_points').select('points').eq('user_id', user.id).single()
      if (existing) {
        const newPoints = (existing.points || 0) + pointsToAdd
        const newLevel = getLevel(newPoints).name
        await supabase.from('user_points').update({ points: newPoints, level: newLevel, updated_at: new Date().toISOString() }).eq('user_id', user.id)
      } else {
        const newLevel = getLevel(pointsToAdd).name
        await supabase.from('user_points').insert({ user_id: user.id, points: pointsToAdd, level: newLevel })
      }

      fetchMyBadges()
      fetchMyPoints()
      fetchLeaderboard()
      showToast(`🎉 You earned ${toAward.length} new badge${toAward.length > 1 ? 's' : ''}! +${pointsToAdd} points`)
    }
  }

  const level = getLevel(myPoints)
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1]
  const progress = nextLevel ? Math.round(((myPoints - level.min) / (nextLevel.min - level.min)) * 100) : 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🏆 Leaderboard & Badges</h1>
          <p style={{ color: '#64748b' }}>Earn points by using EduLink — climb the global student rankings</p>
        </div>

        {/* My stats */}
        {user && (
          <div style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(139,92,246,0.1))', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 16, padding: 22, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 36 }}>{level.icon}</div>
              <div>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20 }}>{profile?.name || 'You'}</div>
                <div style={{ fontSize: 14, color: level.color, fontWeight: 700 }}>{level.name} · {myPoints} points</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{myBadges.length}/{BADGES.length} badges earned</div>
                {nextLevel && <div style={{ fontSize: 11, color: '#64748b' }}>{nextLevel.min - myPoints} pts to {nextLevel.name}</div>}
              </div>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${level.color},${nextLevel?.color || level.color})`, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--surface)', borderRadius: 12, padding: 5, width: 'fit-content', border: '1px solid var(--border)' }}>
          {[{ id: 'leaderboard', label: '🏆 Leaderboard' }, { id: 'badges', label: '🎖️ My Badges' }, { id: 'all_badges', label: '📋 All Badges' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === t.id ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
              color: tab === t.id ? '#fff' : '#64748b',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <div>No leaderboard data yet. Be the first to earn points!</div>
              </div>
            ) : leaderboard.map((entry, i) => {
              const lvl = getLevel(entry.points)
              const isMe = entry.user_id === user?.id
              return (
                <div key={entry.user_id} style={{
                  background: isMe ? 'rgba(37,99,235,0.12)' : 'var(--surface)',
                  border: `1px solid ${isMe ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: i < 3 ? 20 : 14, flexShrink: 0, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#64748b' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: isMe ? '#60a5fa' : '#f1f5f9', fontSize: 14 }}>
                      {isMe ? `${profile?.name || 'You'} (You)` : `Student ${entry.user_id.slice(0, 6)}...`}
                    </div>
                    <div style={{ fontSize: 12, color: lvl.color, fontWeight: 600 }}>{lvl.icon} {lvl.name}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 16 }}>{entry.points} pts</div>
                </div>
              )
            })}
          </div>
        )}

        {/* My Badges */}
        {tab === 'badges' && (
          <div>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Sign in to see your badges</div>
            ) : myBadges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎖️</div>
                <div>No badges yet. Start using EduLink to earn them!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {BADGES.filter(b => myBadges.includes(b.id)).map(badge => (
                  <div key={badge.id} style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}40`, borderRadius: 14, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{badge.icon}</div>
                    <div style={{ fontWeight: 700, color: badge.color, fontSize: 14, marginBottom: 4 }}>{badge.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{badge.desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>+{badge.points} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All badges */}
        {tab === 'all_badges' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {BADGES.map(badge => {
              const earned = myBadges.includes(badge.id)
              return (
                <div key={badge.id} style={{
                  background: earned ? `${badge.color}15` : 'var(--surface)',
                  border: `1px solid ${earned ? badge.color + '40' : 'var(--border)'}`,
                  borderRadius: 14, padding: 18, textAlign: 'center',
                  opacity: earned ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8, filter: earned ? 'none' : 'grayscale(100%)' }}>{badge.icon}</div>
                  <div style={{ fontWeight: 700, color: earned ? badge.color : '#64748b', fontSize: 13, marginBottom: 4 }}>{badge.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{badge.desc}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: earned ? '#f59e0b' : '#374151' }}>+{badge.points} pts</div>
                  {earned && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: 600 }}>✅ Earned</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}