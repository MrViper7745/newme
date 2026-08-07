import { useState, useEffect, useRef } from 'react'
import MobileBottomSheet from './MobileBottomSheet'
import useHaptic from '../../hooks/useHaptic'

const TOOLS = [
  { id: 'breathing', emoji: '🫁', label: '4-7-8 Breathing', desc: 'Calm your nervous system in 2 minutes' },
  { id: 'grounding', emoji: '🌿', label: '5-4-3-2-1 Grounding', desc: 'Bring yourself back to the present' },
  { id: 'reframe',   emoji: '🧠', label: 'Cognitive Reframing', desc: 'Challenge anxious thoughts' },
  { id: 'routine',   emoji: '📋', label: 'Pre-Exam Routine', desc: 'Your personal exam day checklist' },
]

function BreathingExercise() {
  const [phase, setPhase] = useState('inhale') // inhale | hold | exhale
  const [count, setCount] = useState(4)
  const [cycles, setCycles] = useState(0)
  const [running, setRunning] = useState(false)
  const haptic = useHaptic()

  useEffect(() => {
    if (!running) return
    const duration = phase === 'inhale' ? 4 : phase === 'hold' ? 7 : 8
    if (count <= 1) {
      haptic.tap()
      if (phase === 'inhale') { setPhase('hold'); setCount(7) }
      else if (phase === 'hold') { setPhase('exhale'); setCount(8) }
      else { setPhase('inhale'); setCount(4); setCycles(c => c + 1) }
      return
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [running, phase, count])

  const colors = { inhale: '#2563eb', hold: '#f59e0b', exhale: '#10b981' }
  const labels = { inhale: 'Breathe In', hold: 'Hold', exhale: 'Breathe Out' }
  const c = colors[phase]

  return (
    <div style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
        Inhale for 4 · Hold for 7 · Exhale for 8. Repeat 4 times. This activates your parasympathetic nervous system and reduces anxiety within minutes.
      </div>
      <div style={{ width: 160, height: 160, borderRadius: '50%', border: `4px solid ${c}`, background: `${c}12`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', transition: 'all 0.5s', transform: phase === 'inhale' ? 'scale(1.1)' : phase === 'hold' ? 'scale(1.05)' : 'scale(0.95)' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: c, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: c, marginTop: 4 }}>{labels[phase]}</div>
      </div>
      {cycles > 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Cycle {cycles} complete · {4 - cycles} remaining</div>}
      <button onClick={() => { setRunning(r => !r); if (!running) { setPhase('inhale'); setCount(4) } }}
        style={{ width: '100%', padding: '14px', borderRadius: 12, background: running ? 'rgba(239,68,68,0.1)' : `${c}20`, border: `1px solid ${running ? 'rgba(239,68,68,0.3)' : c + '40'}`, color: running ? '#ef4444' : c, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {running ? '⏸ Pause' : '▶ Start Breathing'}
      </button>
    </div>
  )
}

function GroundingExercise() {
  const [step, setStep] = useState(0)
  const haptic = useHaptic()
  const steps = [
    { count: 5, sense: 'SEE',   icon: '👁️', prompt: 'Name 5 things you can see right now', color: '#2563eb' },
    { count: 4, sense: 'TOUCH', icon: '🤚', prompt: 'Name 4 things you can physically feel', color: '#7c3aed' },
    { count: 3, sense: 'HEAR',  icon: '👂', prompt: 'Name 3 things you can hear', color: '#10b981' },
    { count: 2, sense: 'SMELL', icon: '👃', prompt: 'Name 2 things you can smell', color: '#f59e0b' },
    { count: 1, sense: 'TASTE', icon: '👅', prompt: 'Name 1 thing you can taste', color: '#ec4899' },
  ]
  const current = steps[step]
  if (step >= steps.length) return (
    <div style={{ textAlign: 'center', padding: '30px 16px' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Grounding complete</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>You are present. You are safe. You can handle this exam.</div>
      <button onClick={() => setStep(0)} style={{ padding: '12px 24px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Repeat</button>
    </div>
  )
  return (
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>{current.icon}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: current.color, marginBottom: 6 }}>{current.count}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: current.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{current.sense}</div>
      <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6, marginBottom: 28 }}>{current.prompt}</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {steps.map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < step ? '#10b981' : i === step ? current.color : 'var(--surface2)' }} />)}
      </div>
      <button onClick={() => { haptic.tap(); setStep(s => s + 1) }}
        style={{ width: '100%', padding: '14px', borderRadius: 12, background: `${current.color}20`, border: `1px solid ${current.color}40`, color: current.color, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        Done →
      </button>
    </div>
  )
}

export default function ExamAnxietyToolkit({ open, onClose }) {
  const [activeTool, setActiveTool] = useState(null)

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="🧘 Exam Anxiety Toolkit" height="85vh">
      <div style={{ padding: '16px' }}>
        {!activeTool ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
              Exam anxiety is normal and manageable. These evidence-based techniques calm your nervous system and help you perform at your best.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TOOLS.map(tool => (
                <div key={tool.id} onClick={() => setActiveTool(tool.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{tool.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{tool.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{tool.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setActiveTool(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 600, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>← Back</button>
            {activeTool === 'breathing' && <BreathingExercise />}
            {activeTool === 'grounding' && <GroundingExercise />}
            {activeTool === 'reframe' && (
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Challenge Your Anxious Thoughts</div>
                {[
                  { thought: 'I am going to fail', reframe: 'I have studied for this exam. Even if I struggle, one exam does not define my future.' },
                  { thought: 'I do not know enough', reframe: 'I know more than I think. My brain has absorbed the material even if it does not feel like it right now.' },
                  { thought: 'Everyone else is better prepared', reframe: 'I cannot know how others feel. Most students are just as nervous as I am.' },
                  { thought: 'I will blank out in the exam', reframe: 'If I go blank, I will breathe, skip the question, and come back. I have done this before.' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 5 }}>❌ Anxious thought:</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, fontStyle: 'italic' }}>"{item.thought}"</div>
                    <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 5 }}>✅ Reframe:</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>"{item.reframe}"</div>
                  </div>
                ))}
              </div>
            )}
            {activeTool === 'routine' && (
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📋 Exam Day Routine</div>
                {[
                  { time: 'Night before', items: ['Lay out everything you need', 'No new studying after 9pm', 'Sleep 7-8 hours — it consolidates memory'] },
                  { time: 'Morning of', items: ['Eat a proper breakfast with protein', 'Review only your summary notes — nothing new', 'Arrive 15 minutes early'] },
                  { time: 'Before you start', items: ['Do 3 rounds of 4-7-8 breathing', 'Read ALL instructions before starting', 'Start with questions you know — build confidence'] },
                  { time: 'During the exam', items: ['If you blank, write anything related — it unlocks memory', 'Check your time every 15 minutes', 'Skip hard questions and return to them'] },
                ].map((section, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{section.time}</div>
                    {section.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                        <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span><span>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileBottomSheet>
  )
}