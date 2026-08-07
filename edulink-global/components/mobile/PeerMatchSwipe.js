import { useState, useEffect, useRef } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import useHaptic from '../../hooks/useHaptic'
import { supabase } from '../../lib/supabase'

export default function PeerMatchSwipe({ open, onClose, userId }) {
  const haptic = useHaptic()
  const [candidates, setCandidates] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dragX, setDragX] = useState(0)
  const [matched, setMatched] = useState(null)
  const startX = useRef(null)

  useEffect(() => {
    if (open && userId) load()
  }, [open, userId])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/peer-match?user_id=${userId}`)
      const d = await res.json()
      setCandidates(d.matches || [])
    } catch {}
    setLoading(false)
  }

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchMove = (e) => {
    if (startX.current === null) return
    setDragX(e.touches[0].clientX - startX.current)
  }
  const onTouchEnd = async () => {
    if (Math.abs(dragX) > 80) {
      const liked = dragX > 0
      if (liked) {
        haptic.correct()
        await connectWithPeer(candidates[idx])
        setMatched(candidates[idx])
      } else {
        haptic.tap()
        setIdx(i => i + 1)
      }
    }
    setDragX(0)
    startX.current = null
  }

  const connectWithPeer = async (peer) => {
    await supabase.from('user_contacts').upsert({ user_id: userId, contact_id: peer.id }, { onConflict: 'user_id,contact_id' })
    await supabase.from('direct_messages').insert({ sender_id: userId, receiver_id: peer.id, content: `👋 Hi! I found you on EduLink peer matching. We seem to be studying similar topics — want to study together?`, read: false })
  }

  const current = candidates[idx]
  const rotation = dragX * 0.06
  const liking = dragX > 40
  const passing = dragX < -40

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🤝 Find Study Partner" height="85vh">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' }}>

        {matched ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Study partner found!</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>{matched.name}</div>
            {matched.username && <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 16 }}>@{matched.username}</div>}
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              They have been added to your contacts and sent an introduction message.
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button onClick={() => { setMatched(null); setIdx(i => i + 1) }} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Keep Browsing</button>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Go to Messages</button>
            </div>
          </div>
        ) : loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Finding study partners...
            </div>
          </div>
        ) : !current || idx >= candidates.length ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>😊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No more suggestions</div>
            <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>We will find more study partners as more students join EduLink.</div>
            <button onClick={load} style={{ padding: '11px 24px', borderRadius: 11, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>🔄 Refresh</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 14 }}>
              Swipe right to connect · Swipe left to skip
            </div>

            {/* Card */}
            <div
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
              style={{ flex: 1, background: 'var(--surface)', border: `2px solid ${liking ? 'rgba(16,185,129,0.4)' : passing ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `translateX(${dragX}px) rotate(${rotation}deg)`, transition: dragX === 0 ? 'transform 0.3s, border-color 0.2s' : 'none', cursor: 'grab', userSelect: 'none', touchAction: 'none', position: 'relative' }}>

              {liking && <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 22, fontWeight: 900, color: '#10b981', border: '3px solid #10b981', borderRadius: 10, padding: '4px 10px', transform: 'rotate(-15deg)' }}>CONNECT ✓</div>}
              {passing && <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 22, fontWeight: 900, color: '#ef4444', border: '3px solid #ef4444', borderRadius: 10, padding: '4px 10px', transform: 'rotate(15deg)' }}>SKIP ✗</div>}

              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 18, overflow: 'hidden' }}>
                {current.avatar_url ? <img src={current.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (current.name || '?')[0].toUpperCase()}
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{current.name}</div>
              {current.username && <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 10 }}>@{current.username}</div>}
              {current.field && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{current.field}</div>}
              {current.institution && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>📍 {current.institution}</div>}
              {current.bio && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"{current.bio}"</div>}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => { haptic.tap(); setIdx(i => i + 1) }}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✗
              </button>
              <button onClick={async () => { haptic.correct(); await connectWithPeer(current); setMatched(current) }}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✓
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileBottomSheet>
  )
}