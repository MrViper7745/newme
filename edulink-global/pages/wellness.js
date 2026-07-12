import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const MOODS = ['😩','😟','😐','😊','🤩']
const MOOD_LABELS = ['Very Low','Low','Neutral','Good','Excellent']
const MOOD_COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4']

const RESOURCES = [
  { title: 'Breathing Exercise', desc: '4-7-8 breathing for instant calm', icon: '🫁', link: '#breathing', type: 'exercise' },
  { title: 'Talk to Someone', desc: 'Befrienders Kenya: 0800 723 253', icon: '📞', link: 'tel:0800723253', type: 'crisis' },
  { title: 'Crisis Text Line', desc: 'Text HOME to 741741 (US/UK)', icon: '💬', link: 'sms:741741', type: 'crisis' },
  { title: '5-Minute Meditation', desc: 'Quick reset when overwhelmed', icon: '🧘', link: 'https://www.youtube.com/results?search_query=5+minute+meditation+for+students', type: 'exercise' },
  { title: 'SADAG (South Africa)', desc: '0800 456 789 — free counselling', icon: '🇿🇦', link: 'tel:0800456789', type: 'crisis' },
  { title: 'Headspace Free', desc: 'Free for students via many unis', icon: '🎧', link: 'https://www.headspace.com/studentplan', type: 'app' },
]

const TIPS = [
  { mood: [1, 2], tips: ['Reach out to a friend or family member right now — connection helps', 'Go for a 10-minute walk outside — movement changes brain chemistry', 'Write down 3 things you are grateful for, however small', 'Remember: this feeling is temporary. You have felt better before and will again', 'Consider speaking to your university counsellor — it is free and confidential'] },
  { mood: [3], tips: ['Take a 5-minute break from screens — look at something green or distant', 'Have a glass of water and a snack — low energy often comes from dehydration', 'Do one small productive thing — momentum builds mood', 'Phone or message someone you enjoy talking to'] },
  { mood: [4, 5], tips: ['This is a great day to tackle something challenging — ride the energy!', 'Reach out to support a friend who might be struggling', 'Log what is working today so you can recreate it', 'Set one ambitious goal while you are in this state'] },
]

export default function Wellness() {
  const { user } = useUser()
  const [checkins, setCheckins] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ mood: 3, stress: 3, energy: 3, note: '' })
  const [toast, setToast] = useState(null)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState('inhale')
  const [breathCount, setBreathCount] = useState(4)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => { if (user) fetchCheckins() }, [user])

  useEffect(() => {
    if (!breathingActive) return
    const phases = [{ name: 'Inhale', count: 4 }, { name: 'Hold', count: 7 }, { name: 'Exhale', count: 8 }]
    let phaseIdx = 0, count = phases[0].count
    setBreathPhase(phases[0].name); setBreathCount(count)
    const interval = setInterval(() => {
      count--; setBreathCount(count)
      if (count <= 0) {
        phaseIdx = (phaseIdx + 1) % phases.length
        count = phases[phaseIdx].count
        setBreathPhase(phases[phaseIdx].name); setBreathCount(count)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [breathingActive])

  const fetchCheckins = async () => {
    const { data } = await supabase.from('wellness_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    setCheckins(data || [])
  }

  const saveCheckin = async () => {
    if (!user) { showToast('Sign in to save check-ins'); return }
    await supabase.from('wellness_checkins').insert({ user_id: user.id, ...form })
    setForm({ mood: 3, stress: 3, energy: 3, note: '' })
    setShowNew(false)
    fetchCheckins()
    showToast('✅ Check-in saved')
  }

  const avgMood = checkins.length ? Math.round(checkins.slice(0, 7).reduce((s, c) => s + c.mood, 0) / Math.min(checkins.length, 7) * 10) / 10 : null
  const relevantTips = TIPS.find(t => t.mood.includes(form.mood))?.tips || []

  const SliderField = ({ label, key, emoji, val, onChange }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{emoji} {label}</label>
        <span style={{ fontSize: 13, color: MOOD_COLORS[val - 1], fontWeight: 700 }}>{['Very Low','Low','Moderate','High','Very High'][val - 1]}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1,2,3,4,5].map(v => (
          <button key={v} onClick={() => onChange(v)} style={{ flex: 1, height: 36, borderRadius: 9, cursor: 'pointer', border: `2px solid ${val >= v ? MOOD_COLORS[val - 1] : 'var(--border)'}`, background: val >= v ? `${MOOD_COLORS[val - 1]}20` : 'var(--surface2)', transition: 'all 0.2s' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 860, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>🌱 Wellness & Mental Health</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Track your wellbeing, access breathing exercises, and find support resources. Your mental health matters as much as your career.</p>
        </div>

        {/* Crisis banner */}
        <div style={{ marginBottom: 24, padding: '12px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>
          🆘 If you are in crisis or having thoughts of self-harm, please contact a crisis helpline immediately. <strong>You are not alone.</strong> See the resources below.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          <div>
            {/* Check-in button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>Daily Check-in</div>
              <button onClick={() => setShowNew(!showNew)} style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ How are you today?</button>
            </div>

            {/* Check-in form */}
            {showNew && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                {/* Mood selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, display: 'block', marginBottom: 10 }}>😊 Overall Mood</label>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                    {MOODS.map((m, i) => (
                      <button key={i} onClick={() => setForm(p => ({ ...p, mood: i + 1 }))} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 28, cursor: 'pointer', border: `2px solid ${form.mood === i + 1 ? MOOD_COLORS[i] : 'var(--border)'}`, background: form.mood === i + 1 ? `${MOOD_COLORS[i]}15` : 'var(--surface2)', transform: form.mood === i + 1 ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }}>
                        {m}<div style={{ fontSize: 9, color: MOOD_COLORS[i], fontWeight: 600, marginTop: 4 }}>{MOOD_LABELS[i]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <SliderField label="Stress Level" emoji="😤" val={form.stress} onChange={v => setForm(p => ({ ...p, stress: v }))} />
                <SliderField label="Energy Level" emoji="⚡" val={form.energy} onChange={v => setForm(p => ({ ...p, energy: v }))} />

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>What's on your mind? (optional)</label>
                  <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={3} placeholder="Anything you want to note about today..." style={{ width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>

                {/* Personalised tips */}
                {relevantTips.length > 0 && (
                  <div style={{ marginBottom: 16, padding: '12px 16px', background: `${MOOD_COLORS[form.mood - 1]}10`, border: `1px solid ${MOOD_COLORS[form.mood - 1]}30`, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: MOOD_COLORS[form.mood - 1], marginBottom: 8 }}>💡 Tips for how you are feeling</div>
                    {relevantTips.slice(0, 3).map((tip, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0', lineHeight: 1.5 }}>→ {tip}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveCheckin} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Check-in 🌱</button>
                </div>
              </div>
            )}

            {/* Breathing exercise */}
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 8 }}>🫁 4-7-8 Breathing Exercise</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>Inhale for 4 seconds → Hold for 7 → Exhale for 8. Activates your parasympathetic nervous system and reduces anxiety in minutes.</p>
              {breathingActive ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#06b6d4', marginBottom: 8 }}>{breathCount}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{breathPhase}</div>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #06b6d4', margin: '0 auto 20px', animation: breathPhase === 'Inhale' ? 'pulse 4s ease-in-out' : 'none', background: 'rgba(6,182,212,0.1)' }} />
                  <button onClick={() => setBreathingActive(false)} style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Stop</button>
                </div>
              ) : (
                <button onClick={() => setBreathingActive(true)} style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>🫁 Start Breathing Exercise</button>
              )}
            </div>

            {/* History */}
            {checkins.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 16 }}>📈 Recent Check-ins</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {checkins.slice(0, 14).reverse().map((c, i) => (
                    <div key={i} title={`${MOOD_LABELS[c.mood - 1]} — ${new Date(c.created_at).toLocaleDateString()}`} style={{ flex: 1, height: 40, borderRadius: 6, background: `${MOOD_COLORS[c.mood - 1]}40`, border: `1px solid ${MOOD_COLORS[c.mood - 1]}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'default' }}>
                      {MOODS[c.mood - 1]}
                    </div>
                  ))}
                </div>
                {checkins.slice(0, 5).map(c => (
                  <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 20, marginRight: 8 }}>{MOODS[c.mood - 1]}</span>
                      <span style={{ fontSize: 13, color: MOOD_COLORS[c.mood - 1], fontWeight: 600 }}>{MOOD_LABELS[c.mood - 1]}</span>
                      {c.note && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>"{c.note.slice(0, 40)}{c.note.length > 40 ? '...' : ''}"</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#374151' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {avgMood !== null && (
              <div style={{ background: 'var(--surface)', border: `2px solid ${MOOD_COLORS[Math.round(avgMood) - 1]}40`, borderRadius: 14, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 6 }}>{MOODS[Math.round(avgMood) - 1]}</div>
                <div style={{ fontWeight: 800, color: MOOD_COLORS[Math.round(avgMood) - 1], fontSize: 16 }}>{MOOD_LABELS[Math.round(avgMood) - 1]}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>7-day average mood</div>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>🆘 Support Resources</div>
              {RESOURCES.map((r, i) => (
                <a key={i} href={r.link} target={r.link.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: r.type === 'crisis' ? '#ef4444' : '#60a5fa', fontSize: 13 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{r.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13, marginBottom: 10 }}>💚 Student Wellness Tips</div>
              {['Sleep 7-9 hours — it improves grades AND mood more than any study technique', 'Exercise for 20 minutes most days — it is as effective as antidepressants for mild depression', 'Limit social media to 30 min/day — comparison is the thief of joy', 'Talk about how you feel — shame thrives in silence', 'Ask for help early — counsellors, friends, family. You do not have to figure it out alone'].map((t, i) => (
                <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', lineHeight: 1.5 }}>→ {t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}`}</style>
    </div>
  )
}