import { useState } from 'react'
import useHaptic from '../../hooks/useHaptic'

const REACTIONS = ['👍', '❤️', '🔥', '💡', '😂', '🎉', '👏', '🤔']

export default function ReactionPicker({ messageId, existingReactions = {}, userId, onReact, style }) {
  const [open, setOpen] = useState(false)
  const haptic = useHaptic()

  const counts = Object.entries(existingReactions).reduce((acc, [emoji, users]) => {
    if (Array.isArray(users) && users.length > 0) acc[emoji] = users
    return acc
  }, {})

  const myReactions = Object.entries(existingReactions)
    .filter(([, users]) => Array.isArray(users) && users.includes(userId))
    .map(([emoji]) => emoji)

  const react = (emoji) => {
    haptic.tap()
    setOpen(false)
    if (onReact) onReact(messageId, emoji)
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Existing reaction counts */}
      {Object.keys(counts).length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {Object.entries(counts).map(([emoji, users]) => (
            <button key={emoji} onClick={() => react(emoji)}
              style={{ padding: '2px 8px', borderRadius: 12, background: myReactions.includes(emoji) ? 'rgba(37,99,235,0.2)' : 'var(--surface2)', border: `1px solid ${myReactions.includes(emoji) ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{emoji}</span>
              <span style={{ fontSize: 10, color: myReactions.includes(emoji) ? '#60a5fa' : 'var(--text3)', fontWeight: 600 }}>{users.length}</span>
            </button>
          ))}
          <button onClick={() => setOpen(o => !o)}
            style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)' }}>
            +
          </button>
        </div>
      )}

      {/* Add reaction button */}
      {Object.keys(counts).length === 0 && (
        <button onClick={() => setOpen(o => !o)}
          style={{ padding: '3px 8px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)' }}>
          😊 +
        </button>
      )}

      {/* Picker popup */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px', display: 'flex', gap: 4, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', flexWrap: 'wrap', maxWidth: 200 }}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => react(emoji)}
                style={{ width: 36, height: 36, borderRadius: 9, background: myReactions.includes(emoji) ? 'rgba(37,99,235,0.15)' : 'transparent', border: `1px solid ${myReactions.includes(emoji) ? 'rgba(37,99,235,0.3)' : 'transparent'}`, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}