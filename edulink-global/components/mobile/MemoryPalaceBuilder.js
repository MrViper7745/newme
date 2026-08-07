import { useState } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import useHaptic from '../../hooks/useHaptic'

const ROOMS = [
  { id: 'entrance', name: 'Entrance Hall', emoji: '🚪', spots: 4 },
  { id: 'library',  name: 'Library',       emoji: '📚', spots: 6 },
  { id: 'kitchen',  name: 'Kitchen',        emoji: '🍳', spots: 5 },
  { id: 'bedroom',  name: 'Bedroom',        emoji: '🛏️', spots: 4 },
  { id: 'garden',   name: 'Garden',         emoji: '🌿', spots: 6 },
]

export default function MemoryPalaceBuilder({ open, onClose }) {
  const haptic = useHaptic()
  const [activeRoom, setActiveRoom] = useState(null)
  const [palace, setPalace] = useState({}) // { roomId: { spotIdx: { label, content } } }
  const [editing, setEditing] = useState(null) // { roomId, spotIdx }
  const [editLabel, setEditLabel] = useState('')
  const [editContent, setEditContent] = useState('')
  const [walkMode, setWalkMode] = useState(false)
  const [walkRoom, setWalkRoom] = useState(0)
  const [walkSpot, setWalkSpot] = useState(0)
  const [showContent, setShowContent] = useState(false)

  const setSpot = () => {
    if (!editing || !editLabel.trim()) return
    setPalace(prev => ({
      ...prev,
      [editing.roomId]: {
        ...(prev[editing.roomId] || {}),
        [editing.spotIdx]: { label: editLabel, content: editContent },
      }
    }))
    setEditing(null); setEditLabel(''); setEditContent('')
    haptic.success()
  }

  const totalItems = Object.values(palace).reduce((s, room) => s + Object.keys(room).length, 0)

  const currentWalkRoom = ROOMS[walkRoom]
  const currentRoomItems = palace[currentWalkRoom?.id] || {}
  const currentSpotData = currentRoomItems[walkSpot]

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🏛️ Memory Palace" height="90vh">
      <div style={{ padding: '16px' }}>

        {!walkMode ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
              Place concepts in rooms of a mental palace. Later, mentally walk through the palace to retrieve them. This technique is used by memory champions for large amounts of information.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{totalItems} items placed</div>
              {totalItems > 0 && (
                <button onClick={() => setWalkMode(true)} style={{ padding: '7px 14px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  🚶 Walk the Palace
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROOMS.map(room => {
                const items = palace[room.id] || {}
                const count = Object.keys(items).length
                const isActive = activeRoom === room.id
                return (
                  <div key={room.id}>
                    <div onClick={() => setActiveRoom(isActive ? null : room.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: isActive ? 'rgba(37,99,235,0.1)' : 'var(--surface)', border: `1px solid ${isActive ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{room.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{room.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{count}/{room.spots} spots used</div>
                      </div>
                      <span style={{ color: 'var(--text3)', fontSize: 14 }}>{isActive ? '∧' : '∨'}</span>
                    </div>

                    {isActive && (
                      <div style={{ padding: '12px 16px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)', borderTop: 'none', borderRadius: '0 0 12px 12px', marginTop: -4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                          {Array.from({ length: room.spots }, (_, i) => {
                            const item = items[i]
                            return (
                              <div key={i} onClick={() => { setEditing({ roomId: room.id, spotIdx: i }); setEditLabel(item?.label || ''); setEditContent(item?.content || '') }}
                                style={{ padding: '10px 8px', borderRadius: 10, background: item ? 'rgba(124,58,237,0.12)' : 'var(--surface2)', border: `1px solid ${item ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, textAlign: 'center', cursor: 'pointer', minHeight: 60 }}>
                                {item ? (
                                  <>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, lineHeight: 1.3 }}>{item.content?.slice(0, 30)}{item.content?.length > 30 ? '...' : ''}</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: 20, color: 'var(--text3)' }}>+</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Edit spot modal */}
            {editing && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 340 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, marginBottom: 16 }}>📌 Place Item</div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Label (what to remember)</label>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="e.g. Integration by Parts"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} autoFocus />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Content (the detail)</label>
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="∫u dv = uv - ∫v du — used when product of functions" rows={3}
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setEditing(null); setEditLabel(''); setEditContent('') }} style={{ flex: 1, padding: '12px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={setSpot} disabled={!editLabel.trim()} style={{ flex: 2, padding: '12px', borderRadius: 11, background: editLabel.trim() ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface2)', color: editLabel.trim() ? '#fff' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Place Item 📌</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setWalkMode(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>← Edit</button>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
                {currentWalkRoom?.emoji} {currentWalkRoom?.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {ROOMS.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < walkRoom ? '#10b981' : i === walkRoom ? '#7c3aed' : 'var(--surface2)' }} />)}
            </div>

            {Object.keys(palace[currentWalkRoom?.id] || {}).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>No items in this room</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {Object.entries(palace[currentWalkRoom?.id] || {}).map(([idx, item]) => (
                  <div key={idx} onClick={() => { haptic.tap(); setWalkSpot(parseInt(idx)); setShowContent(s => !s) }}
                    style={{ padding: '14px 16px', borderRadius: 13, background: walkSpot === parseInt(idx) ? 'rgba(124,58,237,0.12)' : 'var(--surface)', border: `1px solid ${walkSpot === parseInt(idx) ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginBottom: showContent && walkSpot === parseInt(idx) ? 8 : 0 }}>{item.label}</div>
                    {showContent && walkSpot === parseInt(idx) && item.content && (
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, animation: 'fadeIn 0.2s ease' }}>{item.content}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { haptic.tap(); setWalkRoom(r => Math.max(r - 1, 0)); setShowContent(false) }} disabled={walkRoom === 0}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: walkRoom === 0 ? 0.4 : 1 }}>← Prev Room</button>
              <button onClick={() => { haptic.tap(); setWalkRoom(r => Math.min(r + 1, ROOMS.length - 1)); setShowContent(false) }} disabled={walkRoom === ROOMS.length - 1}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: walkRoom === ROOMS.length - 1 ? 0.4 : 1 }}>Next Room →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </MobileBottomSheet>
  )
}