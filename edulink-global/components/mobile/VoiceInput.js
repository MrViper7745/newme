import useVoiceInput from '../../hooks/useVoiceInput'
import useHaptic from '../../hooks/useHaptic'

export default function VoiceInput({ onResult, style }) {
  const haptic = useHaptic()
  const { listening, supported, start, stop } = useVoiceInput((text) => {
    haptic.success()
    if (onResult) onResult(text)
  })

  if (!supported) return null

  return (
    <button
      onTouchStart={() => { haptic.tap(); start() }}
      onTouchEnd={stop}
      onMouseDown={start}
      onMouseUp={stop}
      style={{ width: 42, height: 42, borderRadius: '50%', background: listening ? 'rgba(239,68,68,0.15)' : 'var(--surface2)', border: `2px solid ${listening ? '#ef4444' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', animation: listening ? 'pulse 1s ease-in-out infinite' : 'none', ...style }}>
      <span style={{ fontSize: 18 }}>{listening ? '🔴' : '🎤'}</span>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
    </button>
  )
}