import { useState, useCallback } from 'react'

// Tracks student performance and returns recommended difficulty
export function useAdaptiveDifficulty(subject) {
  const [history, setHistory] = useState([]) // [{correct, difficulty, timestamp}]
  const [currentDifficulty, setCurrentDifficulty] = useState('medium')

  const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

  const recordAnswer = useCallback((correct) => {
    const entry = { correct, difficulty: currentDifficulty, timestamp: Date.now() }
    setHistory(prev => {
      const next = [...prev, entry].slice(-10) // keep last 10
      const recent = next.slice(-5)
      const recentCorrect = recent.filter(e => e.correct).length
      const pct = recentCorrect / recent.length

      let newDifficulty = currentDifficulty
      if (recent.length >= 3) {
        const idx = DIFFICULTIES.indexOf(currentDifficulty)
        if (pct >= 0.8 && idx < DIFFICULTIES.length - 1) newDifficulty = DIFFICULTIES[idx + 1]
        else if (pct <= 0.4 && idx > 0) newDifficulty = DIFFICULTIES[idx - 1]
      }
      setCurrentDifficulty(newDifficulty)
      return next
    })
  }, [currentDifficulty])

  const accuracy = history.length ? Math.round(history.filter(h => h.correct).length / history.length * 100) : null
  const trend = history.length >= 4
    ? history.slice(-4).filter(h => h.correct).length > history.slice(0, 4).filter(h => h.correct).length ? 'improving' : 'declining'
    : null

  return { currentDifficulty, recordAnswer, accuracy, trend, history }
}

export default function AdaptiveDifficultyDisplay({ difficulty, accuracy, trend }) {
  const DIFF = { easy: { color: '#10b981', label: 'Easy' }, medium: { color: '#f59e0b', label: 'Medium' }, hard: { color: '#ef4444', label: 'Hard' }, expert: { color: '#7c3aed', label: 'Expert' } }
  const d = DIFF[difficulty] || DIFF.medium

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, background: `${d.color}10`, border: `1px solid ${d.color}25` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.label}</div>
      {accuracy !== null && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Accuracy: {accuracy}%</div>}
      {trend && <div style={{ fontSize: 11, color: trend === 'improving' ? '#10b981' : '#f59e0b' }}>{trend === 'improving' ? '📈 Improving' : '📉 Review needed'}</div>}
    </div>
  )
}