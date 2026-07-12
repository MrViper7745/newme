import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { useLocation } from '../lib/useLocation'

// Languages by region/country
const REGIONAL_LANGUAGES = {
  'South Africa': [
    { code: 'zu', name: 'Zulu', flag: '🇿🇦', speakers: '12M', why: 'Most widely spoken home language in SA', level_needed: 'Conversational' },
    { code: 'xh', name: 'Xhosa', flag: '🇿🇦', speakers: '8M', why: 'Widely spoken in Eastern Cape and Cape Town', level_needed: 'Conversational' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦', speakers: '7M', why: 'Widely spoken in Western Cape and professional settings', level_needed: 'Conversational' },
    { code: 'st', name: 'Sotho', flag: '🇿🇦', speakers: '5M', why: 'Common in Gauteng and Free State', level_needed: 'Basic' },
    { code: 'tn', name: 'Tswana', flag: '🇿🇦', speakers: '4M', why: 'Spoken across North West province', level_needed: 'Basic' },
  ],
  'Nigeria': [
    { code: 'yo', name: 'Yoruba', flag: '🇳🇬', speakers: '45M', why: 'Dominant language in Lagos and Southwest', level_needed: 'Conversational' },
    { code: 'ha', name: 'Hausa', flag: '🇳🇬', speakers: '50M', why: 'Most widely spoken language in Northern Nigeria', level_needed: 'Conversational' },
    { code: 'ig', name: 'Igbo', flag: '🇳🇬', speakers: '25M', why: 'Major language in Southeast Nigeria', level_needed: 'Conversational' },
    { code: 'pcm', name: 'Pidgin English', flag: '🇳🇬', speakers: '75M', why: 'Universal lingua franca across Nigeria', level_needed: 'Fluent' },
  ],
  'Kenya': [
    { code: 'sw', name: 'Swahili', flag: '🇰🇪', speakers: '100M+', why: 'National language, spoken across East Africa', level_needed: 'Fluent' },
    { code: 'ki', name: 'Kikuyu', flag: '🇰🇪', speakers: '7M', why: 'Most widely spoken indigenous language', level_needed: 'Basic' },
  ],
  'Germany': [
    { code: 'de', name: 'German', flag: '🇩🇪', speakers: '100M', why: 'Essential for work and daily life in Germany', level_needed: 'B2' },
  ],
  'France': [
    { code: 'fr', name: 'French', flag: '🇫🇷', speakers: '275M', why: 'Required for professional and social integration', level_needed: 'B1' },
  ],
  'default': [
    { code: 'es', name: 'Spanish', flag: '🇪🇸', speakers: '500M', why: '2nd most spoken language globally', level_needed: 'B1' },
    { code: 'fr', name: 'French', flag: '🇫🇷', speakers: '275M', why: 'Spoken in 29 African countries + Europe', level_needed: 'B1' },
    { code: 'de', name: 'German', flag: '🇩🇪', speakers: '100M', why: '#1 destination for African students in Europe', level_needed: 'B1' },
    { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳', speakers: '1B+', why: 'Most spoken language in the world', level_needed: 'HSK 2' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', speakers: '420M', why: 'Essential in Middle East/North Africa', level_needed: 'A2' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹', speakers: '260M', why: 'Major language in Africa (Angola, Mozambique)', level_needed: 'B1' },
    { code: 'sw', name: 'Swahili', flag: '🇹🇿', speakers: '100M', why: 'East African business lingua franca', level_needed: 'Conversational' },
  ]
}

const LESSON_TEMPLATES = {
  greetings: ['Hello / Good morning', 'How are you?', 'My name is...', 'Nice to meet you', 'Goodbye / See you later'],
  numbers: ['1-10', '11-20', '21-100', 'First/Second/Third', 'Phone numbers'],
  daily: ['I want...', 'Where is...?', 'How much does this cost?', 'I don\'t understand', 'Please / Thank you'],
  work: ['I am looking for a job', 'I am a student', 'I work in...', 'Can you help me?', 'My skills are...'],
  emergency: ['Help!', 'Call the police', 'I need a doctor', 'Where is the hospital?', 'I am lost'],
}

const streamRequest = async (body, onChunk, onDone, onError) => {
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { onDone(full); return }
        try { const p = JSON.parse(d); if (p.text) { full += p.text; onChunk(full) } } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e.message) }
}

export default function Language() {
  const { user, profile } = useUser()
  const { location, country, requestLocation, permission } = useLocation()
  const city = location?.city || location?.address?.city || ''
  const [selectedLang, setSelectedLang] = useState(null)
  const [progress, setProgress] = useState(null)
  const [tab, setTab] = useState('lessons')
  const [lesson, setLesson] = useState(null)
  const [lessonContent, setLessonContent] = useState('')
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [practiceInput, setPracticeInput] = useState('')
  const [practiceResult, setPracticeResult] = useState('')
  const [checkingInput, setCheckingInput] = useState(false)
  const [toast, setToast] = useState(null)

  // Daily check-in
  const [checkInActive, setCheckInActive] = useState(false)
  const [checkInPhrases, setCheckInPhrases] = useState([])
  const [checkInIndex, setCheckInIndex] = useState(0)
  const [checkInInput, setCheckInInput] = useState('')
  const [checkInResult, setCheckInResult] = useState(null)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInComplete, setCheckInComplete] = useState(false)
  const [checkInScore, setCheckInScore] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const recognitionRef = useRef(null)
  const notifPermission = useRef(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    setMicSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    requestNotificationPermission()
  }, [])

  // In language.js — update the location useEffect:
useEffect(() => {
  // Always check location when the language page loads
  // This handles travelers who may have moved
  const stored = localStorage.getItem('edulink_location')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // If stored location is older than 30 minutes, refresh it
      const age = Date.now() - (parsed.timestamp || 0)
      if (age > 30 * 60 * 1000) {
        requestLocation() // Re-detect — user may have traveled
      }
    } catch {
      requestLocation()
    }
  } else {
    requestLocation()
  }
}, [])

  useEffect(() => { if (user && selectedLang) fetchProgress() }, [user, selectedLang])

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      notifPermission.current = permission === 'granted'
    } else if (Notification.permission === 'granted') {
      notifPermission.current = true
    }
  }

  const scheduleCheckInReminder = () => {
    if (!notifPermission.current) return
    // Schedule a notification for the next day
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const delay = tomorrow.getTime() - Date.now()
    setTimeout(() => {
      new Notification('📚 EduLink Language Check-in', {
        body: `Time for your daily ${selectedLang?.name} check-in! Keep your streak going 🔥`,
        icon: '/favicon.ico',
      })
    }, Math.min(delay, 2147483647))
    showToast('✅ Daily reminder set for 9 AM tomorrow!')
  }

  const fetchProgress = async () => {
    const { data } = await supabase.from('language_progress').select('*').eq('user_id', user.id).eq('language', selectedLang.code).single()
    setProgress(data)
  }

  const saveProgress = async (updates) => {
    if (!user || !selectedLang) return
    const existing = progress
    if (existing) {
      await supabase.from('language_progress').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('language_progress').insert({ user_id: user.id, language: selectedLang.code, ...updates })
    }
    fetchProgress()
  }

  const getRegionalLanguages = () => {
    const c = country || profile?.country || ''
    return REGIONAL_LANGUAGES[c] || REGIONAL_LANGUAGES['default']
  }

  const loadLesson = async (category) => {
    setLoadingLesson(true); setLesson(category); setLessonContent(''); setTab('lessons')
    await streamRequest({
      messages: [{
        role: 'user',
        content: `Create an interactive ${selectedLang.name} language lesson for the category: "${category}".

Target student: ${profile?.country || 'African student'} learning ${selectedLang.name}
Their level: ${progress?.level || 0} (0=beginner, 10=advanced)

Format the lesson EXACTLY like this:

## 📚 ${category} in ${selectedLang.name}

### Key Phrases (10 phrases minimum)
| ${selectedLang.name} | Pronunciation Guide | English |
|---|---|---|
| [phrase] | [sounds like...] | [meaning] |

### Grammar Tip
[One simple grammar rule for this category, explained clearly]

### Example Conversation
[Short 4-6 line conversation using the phrases above]

### Cultural Note
[One interesting cultural context for using these phrases]

### Practice Sentence
Try saying this: "[A sentence using words from this lesson]"
Translates to: "[English translation]"

Make the pronunciation guide very helpful — write it as it sounds phonetically in English, e.g. for Zulu "Sawubona" write "Sah-woo-BOH-nah"`
      }]
    },
      c => setLessonContent(c),
      full => {
        setLessonContent(full)
        setLoadingLesson(false)
        saveProgress({ level: Math.min(10, (progress?.level || 0) + 0.2), xp: (progress?.xp || 0) + 10 })
      },
      () => setLoadingLesson(false)
    )
  }

  const checkPhrase = async (phrase) => {
    if (!practiceInput.trim()) { showToast('Type or speak the phrase first'); return }
    setCheckingInput(true); setPracticeResult('')
    await streamRequest({
      messages: [{
        role: 'user',
        content: `A student is learning ${selectedLang.name}. They tried to write/say this phrase from memory.

Target phrase: "${phrase}"
What they wrote/said: "${practiceInput}"

Give encouraging, specific feedback:
1. CORRECT ✅ / CLOSE 🟡 / NEEDS WORK ❌
2. If not exactly right, explain what was different (1 sentence)
3. A memory trick to remember it (1 sentence)
4. Encouragement (1 sentence)

Keep it under 4 sentences total. Be warm.`
      }]
    },
      c => setPracticeResult(c),
      () => setCheckingInput(false),
      () => setCheckingInput(false)
    )
  }

  const startSpeechRecognition = (onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { showToast('Speech recognition not supported in your browser'); return }

    const recognition = new SpeechRecognition()
    recognition.lang = selectedLang?.code === 'de' ? 'de-DE' : selectedLang?.code === 'fr' ? 'fr-FR' : selectedLang?.code === 'es' ? 'es-ES' : selectedLang?.code === 'zh' ? 'zh-CN' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
      setIsRecording(false)
    }
    recognition.onerror = () => { setIsRecording(false); showToast('⚠️ Could not hear you clearly — try again') }
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    setIsRecording(true)
  }

  const startDailyCheckIn = async () => {
    setCheckInActive(true); setCheckInIndex(0); setCheckInResult(null)
    setCheckInComplete(false); setCheckInScore(0); setCheckInPhrases([])

    let full = ''
    await streamRequest({
      messages: [{
        role: 'user',
        content: `Generate 5 ${selectedLang.name} phrases for a daily language check-in for a student at level ${progress?.level || 0}/10.

Return ONLY a JSON array:
[
  {"phrase": "${selectedLang.name} phrase here", "english": "English meaning", "category": "greetings"},
  ...
]

Mix easy (40%), medium (40%), hard (20%) based on their level. Include phrases from: greetings, numbers, daily life, work, questions.`
      }]
    },
      c => { full = c },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
          setCheckInPhrases(JSON.parse(clean.slice(s, e + 1)))
        } catch { showToast('❌ Could not load check-in phrases') }
      },
      e => showToast('❌ ' + e)
    )
  }

  const submitCheckInAnswer = async () => {
    if (!checkInInput.trim() || checkInLoading) return
    const phrase = checkInPhrases[checkInIndex]
    setCheckInLoading(true); setCheckInResult(null)

    let full = ''
    await streamRequest({
      messages: [{
        role: 'user',
        content: `Daily ${selectedLang.name} check-in.

The student needs to say/write in ${selectedLang.name}: "${phrase.english}"
The correct ${selectedLang.name} phrase is: "${phrase.phrase}"
What they said/wrote: "${checkInInput}"

Return JSON ONLY:
{
  "correct": true/false,
  "score": 0-100,
  "feedback": "short encouraging feedback (1 sentence)",
  "correction": "the correct phrase if they were wrong",
  "memory_tip": "a quick tip to remember it"
}`
      }]
    },
      c => { full = c },
      finalFull => {
        try {
          const clean = finalFull.replace(/```json|```/g, '').trim()
          const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
          const result = JSON.parse(clean.slice(s, e + 1))
          setCheckInResult(result)
          if (result.correct || result.score >= 70) setCheckInScore(prev => prev + 1)
        } catch { }
        setCheckInLoading(false)
      },
      () => setCheckInLoading(false)
    )
  }

  const nextCheckInQuestion = async () => {
    if (checkInIndex < checkInPhrases.length - 1) {
      if (!checkInResult || (!checkInResult.correct && checkInResult.score < 70)) {
        // Teach again if wrong
        showToast(`📚 Let's practise that one more time before moving on`)
        setCheckInInput('')
        setCheckInResult(null)
        return
      }
      setCheckInIndex(c => c + 1)
      setCheckInInput('')
      setCheckInResult(null)
    } else {
      // Complete
      setCheckInComplete(true)
      const streak = (progress?.streak || 0) + 1
      const xpEarned = checkInScore * 20
      await saveProgress({
        streak,
        xp: (progress?.xp || 0) + xpEarned,
        last_checkin: new Date().toISOString().slice(0, 10),
        level: Math.min(10, (progress?.level || 0) + 0.5),
      })
      scheduleCheckInReminder()
      showToast(`🎉 Check-in complete! +${xpEarned} XP · Streak: ${streak} days`)
    }
  }

  const level = progress?.level || 0
  const xp = progress?.xp || 0
  const streak = progress?.streak || 0
  const langs = getRegionalLanguages()

  // Replace the !selectedLang return block with this:

if (!selectedLang) return (
  <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
    <Navbar />
    <div style={{ paddingTop: 100, maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🌐 Language Learning</h1>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
          Learn languages from your current region or any region you choose. Daily check-ins, voice input, AI lessons, and progress tracking.
        </p>
      </div>

      {/* Location bar — always visible */}
      <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 14, background: permission === 'granted' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${permission === 'granted' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: permission === 'granted' ? '#10b981' : '#fbbf24', fontSize: 14, marginBottom: 3 }}>
            {permission === 'granted' ? `📍 ${city ? city + ', ' : ''}${country}` : '📍 Location not enabled'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {permission === 'granted'
              ? 'Showing languages for your current location. Choose a different region below if you want.'
              : 'Enable location to see languages from your area automatically.'}
          </div>
        </div>
        {permission !== 'granted' ? (
          <button onClick={requestLocation} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Enable Location</button>
        ) : (
          <button onClick={requestLocation} style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
        )}
      </div>

      {/* Region selector */}
      <RegionLanguageSelector
       currentCountry={country}
       currentCity={city}
       onSelectLanguage={setSelectedLang}
       permission={permission}
     />
    </div>
  </div>
)

  // MAIN LANGUAGE LEARNING UI
  const TABS_LANG = [
    { id: 'lessons', label: '📚 Lessons' },
    { id: 'checkin', label: '✅ Daily Check-in' },
    { id: 'progress', label: '📈 Progress' },
    { id: 'practice', label: '💬 Practice' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 960, margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button onClick={() => setSelectedLang(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>←</button>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>{selectedLang.flag} {selectedLang.name}</h1>
              <div style={{ fontSize: 13, color: '#64748b' }}>Level {Math.floor(level)}/10 · {xp} XP · {streak}🔥 day streak</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* XP bar */}
            <div style={{ width: 160 }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                <span>Level {Math.floor(level)}</span><span>{xp % 100}/100 XP</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(xp % 100)}%`, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {TABS_LANG.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '11px 18px', border: 'none', cursor: 'pointer', background: 'transparent', color: tab === t.id ? '#60a5fa' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: 13, borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>

        {/* LESSONS */}
        {tab === 'lessons' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>Choose a Lesson</div>
              {Object.keys(LESSON_TEMPLATES).map(cat => (
                <div key={cat} onClick={() => loadLesson(cat)} style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', background: lesson === cat ? 'rgba(37,99,235,0.15)' : 'var(--surface)', border: `1px solid ${lesson === cat ? '#2563eb' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                  <div style={{ fontWeight: 600, color: lesson === cat ? '#60a5fa' : '#f1f5f9', fontSize: 13, textTransform: 'capitalize' }}>{cat}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{LESSON_TEMPLATES[cat].slice(0, 2).join(', ')}...</div>
                </div>
              ))}
              <button onClick={() => loadLesson('Custom: ' + (profile?.field || 'general') + ' vocabulary')} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🤖 AI Pick for My Field
              </button>
            </div>

            <div>
              {loadingLesson ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
                  <div>Loading your {lesson} lesson in {selectedLang.name}...</div>
                </div>
              ) : lessonContent ? (
                <div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.9 }}
                      dangerouslySetInnerHTML={{
                        __html: lessonContent
                          .replace(/## (.*)/g, '<h2 style="color:#60a5fa;font-size:18px;font-weight:800;margin:0 0 16px">$1</h2>')
                          .replace(/### (.*)/g, '<h3 style="color:#a78bfa;font-size:15px;font-weight:700;margin:20px 0 10px">$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
                          .replace(/\|(.*?)\|/g, (match) => `<span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin:2px;border-radius:6px;font-size:13px">${match.slice(1,-1)}</span>`)
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>

                  {/* Practice this lesson */}
                  <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 12 }}>✍️ Practice a Phrase from this Lesson</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Type or speak a phrase from the lesson above in {selectedLang.name}:</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input value={practiceInput} onChange={e => setPracticeInput(e.target.value)} placeholder={`Type in ${selectedLang.name}...`} style={{ flex: 1, padding: '10px 13px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                      {micSupported && (
                        <button onClick={() => startSpeechRecognition(t => setPracticeInput(t))} style={{ padding: '10px 14px', borderRadius: 9, background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.12)', border: `1px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(37,99,235,0.3)'}`, color: isRecording ? '#ef4444' : '#60a5fa', cursor: 'pointer', fontSize: 16 }}>
                          {isRecording ? '🔴' : '🎤'}
                        </button>
                      )}
                    </div>
                    <button onClick={() => checkPhrase(practiceInput)} disabled={!practiceInput.trim() || checkingInput} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: checkingInput ? 0.7 : 1 }}>
                      {checkingInput ? '⏳ Checking...' : '✓ Check My Answer'}
                    </button>
                    {practiceResult && (
                      <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{practiceResult}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                  <div>Choose a lesson category on the left to start learning {selectedLang.name}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DAILY CHECK-IN */}
        {tab === 'checkin' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {!checkInActive ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 22, marginBottom: 8 }}>Daily {selectedLang.name} Check-in</h2>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 12, maxWidth: 420, margin: '0 auto 12px' }}>
                  5 phrases to say or type in {selectedLang.name}. Get them right to earn XP and keep your streak alive. Voice input supported!
                </p>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  {[{ l: 'Streak', v: `${streak}🔥`, c: '#f59e0b' }, { l: 'Level', v: Math.floor(level), c: '#2563eb' }, { l: 'Total XP', v: xp, c: '#10b981' }].map(s => (
                    <div key={s.l} style={{ padding: '12px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {progress?.last_checkin === new Date().toISOString().slice(0, 10) ? (
                  <div style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 14, color: '#10b981', fontWeight: 600 }}>
                    ✅ Already completed today's check-in! Come back tomorrow.
                  </div>
                ) : (
                  <button onClick={startDailyCheckIn} style={{ padding: '13px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                    ✅ Start Today's Check-in
                  </button>
                )}
                <div style={{ marginTop: 16 }}>
                  <button onClick={scheduleCheckInReminder} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', cursor: 'pointer' }}>
                    🔔 Set Daily Reminder (9 AM)
                  </button>
                </div>
              </div>
            ) : checkInComplete ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontWeight: 800, color: '#10b981', fontSize: 24, marginBottom: 8 }}>Check-in Complete!</h2>
                <div style={{ fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>{checkInScore}/{checkInPhrases.length} correct</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>+{checkInScore * 20} XP earned · Streak: {streak + 1}🔥 days</div>
                <button onClick={() => { setCheckInActive(false); setCheckInComplete(false) }} style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Back to Dashboard</button>
              </div>
            ) : checkInPhrases.length > 0 ? (
              <div>
                {/* Progress */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                  {checkInPhrases.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < checkInIndex ? '#10b981' : i === checkInIndex ? '#2563eb' : 'var(--border)' }} />
                  ))}
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Phrase {checkInIndex + 1} of {checkInPhrases.length}</div>
                  <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 20, marginBottom: 6 }}>
                    Say in {selectedLang.name}:
                  </div>
                  <div style={{ fontSize: 28, color: '#60a5fa', fontWeight: 700, marginBottom: 24, padding: '16px', background: 'rgba(37,99,235,0.08)', borderRadius: 12, textAlign: 'center' }}>
                    "{checkInPhrases[checkInIndex]?.english}"
                  </div>

                  {/* Input + voice */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input value={checkInInput} onChange={e => setCheckInInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !checkInLoading) submitCheckInAnswer() }} placeholder={`Type in ${selectedLang.name}...`} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                    {micSupported && (
                      <button onClick={() => startSpeechRecognition(t => setCheckInInput(t))} style={{ padding: '12px 16px', borderRadius: 10, background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(37,99,235,0.15)', border: `2px solid ${isRecording ? '#ef4444' : '#2563eb'}`, color: isRecording ? '#ef4444' : '#60a5fa', cursor: 'pointer', fontSize: 20, fontWeight: 800 }}>
                        {isRecording ? '🔴' : '🎤'}
                      </button>
                    )}
                  </div>

                  {micSupported && (
                    <div style={{ fontSize: 11, color: '#374151', marginBottom: 14 }}>
                      🎤 Click mic button and speak in {selectedLang.name}, or type your answer
                    </div>
                  )}

                  <button onClick={submitCheckInAnswer} disabled={!checkInInput.trim() || checkInLoading} style={{ width: '100%', padding: '12px', borderRadius: 10, background: checkInInput.trim() && !checkInLoading ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface)', color: checkInInput.trim() ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: checkInLoading ? 0.7 : 1 }}>
                    {checkInLoading ? '⏳ Checking...' : '✓ Check Answer'}
                  </button>
                </div>

                {checkInResult && (
                  <div style={{ background: checkInResult.correct || checkInResult.score >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${checkInResult.correct || checkInResult.score >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: checkInResult.correct || checkInResult.score >= 70 ? '#10b981' : '#ef4444', marginBottom: 8 }}>
                      {checkInResult.correct || checkInResult.score >= 70 ? '✅ Correct!' : '❌ Not quite'} — {checkInResult.score}/100
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: checkInResult.correction ? 8 : 0 }}>{checkInResult.feedback}</div>
                    {checkInResult.correction && <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 4 }}>✅ Correct: <strong>{checkInResult.correction}</strong></div>}
                    {checkInResult.memory_tip && <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>💡 {checkInResult.memory_tip}</div>}

                    {checkInResult.correct || checkInResult.score >= 70 ? (
                      <button onClick={nextCheckInQuestion} style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 10, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                        {checkInIndex < checkInPhrases.length - 1 ? 'Next Phrase →' : '🎉 Finish Check-in!'}
                      </button>
                    ) : (
                      <div>
                        <div style={{ marginTop: 12, fontSize: 13, color: '#f59e0b' }}>📚 Practise this phrase and try again:</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '8px 0' }}>{checkInPhrases[checkInIndex]?.phrase}</div>
                        <button onClick={() => { setCheckInInput(''); setCheckInResult(null) }} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                          Try Again 🔄
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <div>Loading today's phrases...</div>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS */}
        {tab === 'progress' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { l: 'Current Level', v: `${Math.floor(level)}/10`, c: '#2563eb' },
                { l: 'Total XP', v: xp, c: '#10b981' },
                { l: 'Day Streak', v: `${streak}🔥`, c: '#f59e0b' },
              ].map(s => (
                <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Level progress bar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>Level Progress</div>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < Math.floor(level) ? '#10b981' : i === Math.floor(level) ? '#2563eb' : 'var(--surface2)', border: `2px solid ${i <= Math.floor(level) ? (i < Math.floor(level) ? '#10b981' : '#2563eb') : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i < Math.floor(level) ? '✓' : i + 1}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: i < Math.floor(level) ? '100%' : i === Math.floor(level) ? `${(level % 1) * 100}%` : '0%', background: i < Math.floor(level) ? '#10b981' : '#2563eb', borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', width: 80 }}>
                    {['Beginner', 'Elementary', 'Pre-Basic', 'Basic', 'Pre-Int', 'Intermediate', 'Upper-Int', 'Advanced', 'Proficient', 'Fluent'][i]}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14, marginBottom: 12 }}>🏆 How to Earn More XP</div>
              {[
                { action: 'Complete a lesson', xp: '+10 XP' },
                { action: 'Daily check-in — each correct answer', xp: '+20 XP' },
                { action: 'Perfect check-in (all 5 correct)', xp: '+50 XP bonus' },
                { action: '7-day streak', xp: '+100 XP bonus' },
                { action: '30-day streak', xp: '+500 XP bonus' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{r.action}</span>
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{r.xp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRACTICE */}
        {tab === 'practice' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 20 }}>💬 Free Practice — Test Any Phrase</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Type or speak any phrase in {selectedLang.name} and AI will check it and help you improve:</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={practiceInput} onChange={e => setPracticeInput(e.target.value)} placeholder={`Practice any ${selectedLang.name} phrase...`} style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', outline: 'none' }} />
                {micSupported && (
                  <button onClick={() => startSpeechRecognition(t => setPracticeInput(t))} style={{ padding: '11px 16px', borderRadius: 10, background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(37,99,235,0.15)', border: `2px solid ${isRecording ? '#ef4444' : '#2563eb'}`, color: isRecording ? '#ef4444' : '#60a5fa', cursor: 'pointer', fontSize: 20 }}>
                    {isRecording ? '🔴' : '🎤'}
                  </button>
                )}
              </div>
              <button onClick={() => checkPhrase(practiceInput)} disabled={!practiceInput.trim() || checkingInput} style={{ padding: '10px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: checkingInput ? 0.7 : 1 }}>
                {checkingInput ? '⏳ Checking...' : '✓ Check & Get Feedback'}
              </button>
              {practiceResult && (
                <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{practiceResult}</div>
              )}
            </div>
          </div>
        )}

      </div>
      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}


// ── REGION LANGUAGE SELECTOR COMPONENT ──────────────────────────
const ALL_REGIONS = [
  {
    id: 'southern_africa',
    name: 'Southern Africa',
    flag: '🌍',
    countries: ['South Africa', 'Zimbabwe', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini'],
    languages: [
      { code: 'zu', name: 'Zulu', flag: '🇿🇦', speakers: '12M', why: 'Most spoken home language in SA', level_needed: 'Conversational' },
      { code: 'xh', name: 'Xhosa', flag: '🇿🇦', speakers: '8M', why: 'Widely spoken in Eastern Cape & Cape Town', level_needed: 'Conversational' },
      { code: 'af', name: 'Afrikaans', flag: '🇿🇦', speakers: '7M', why: 'Professional & commercial use across SA', level_needed: 'Conversational' },
      { code: 'st', name: 'Sotho', flag: '🇿🇦', speakers: '5M', why: 'Common in Gauteng & Free State', level_needed: 'Basic' },
      { code: 'tn', name: 'Tswana', flag: '🇿🇦', speakers: '4M', why: 'Spoken in North West & Botswana', level_needed: 'Basic' },
      { code: 'sn', name: 'Shona', flag: '🇿🇼', speakers: '10M', why: 'Main language of Zimbabwe', level_needed: 'Basic' },
    ],
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    flag: '🌍',
    countries: ['Nigeria', 'Ghana', 'Senegal', 'Côte d\'Ivoire', 'Mali'],
    languages: [
      { code: 'yo', name: 'Yoruba', flag: '🇳🇬', speakers: '45M', why: 'Dominant in Lagos and Southwest Nigeria', level_needed: 'Conversational' },
      { code: 'ha', name: 'Hausa', flag: '🇳🇬', speakers: '50M', why: 'Most spoken in Northern Nigeria & Niger', level_needed: 'Conversational' },
      { code: 'ig', name: 'Igbo', flag: '🇳🇬', speakers: '25M', why: 'Major language in Southeast Nigeria', level_needed: 'Basic' },
      { code: 'tw', name: 'Twi', flag: '🇬🇭', speakers: '9M', why: 'Most widely spoken language in Ghana', level_needed: 'Basic' },
    ],
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    flag: '🌍',
    countries: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia'],
    languages: [
      { code: 'sw', name: 'Swahili', flag: '🇰🇪', speakers: '100M+', why: 'East Africa\'s business lingua franca', level_needed: 'Fluent' },
      { code: 'am', name: 'Amharic', flag: '🇪🇹', speakers: '25M', why: 'Official language of Ethiopia', level_needed: 'Basic' },
      { code: 'lg', name: 'Luganda', flag: '🇺🇬', speakers: '6M', why: 'Widely spoken in Uganda', level_needed: 'Basic' },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    flag: '🌍',
    countries: ['Germany', 'France', 'Spain', 'Portugal', 'Netherlands'],
    languages: [
      { code: 'de', name: 'German', flag: '🇩🇪', speakers: '100M', why: '#1 destination for African students in Europe', level_needed: 'B2' },
      { code: 'fr', name: 'French', flag: '🇫🇷', speakers: '275M', why: 'Spoken in 29 African countries + Europe', level_needed: 'B1' },
      { code: 'es', name: 'Spanish', flag: '🇪🇸', speakers: '500M', why: '2nd most spoken language globally', level_needed: 'B1' },
      { code: 'pt', name: 'Portuguese', flag: '🇵🇹', speakers: '260M', why: 'Major language in Angola & Mozambique', level_needed: 'B1' },
      { code: 'nl', name: 'Dutch', flag: '🇳🇱', speakers: '24M', why: 'Useful in Netherlands & Belgium', level_needed: 'B1' },
    ],
  },
  {
    id: 'asia',
    name: 'Asia',
    flag: '🌏',
    countries: ['China', 'Japan', 'South Korea', 'India'],
    languages: [
      { code: 'zh', name: 'Mandarin', flag: '🇨🇳', speakers: '1B+', why: 'Most spoken language in the world', level_needed: 'HSK 2' },
      { code: 'ja', name: 'Japanese', flag: '🇯🇵', speakers: '125M', why: 'Growing tech & business opportunities', level_needed: 'N4' },
      { code: 'ko', name: 'Korean', flag: '🇰🇷', speakers: '77M', why: 'K-culture and growing economy', level_needed: 'TOPIK 2' },
      { code: 'hi', name: 'Hindi', flag: '🇮🇳', speakers: '600M', why: 'Essential in India & large diaspora', level_needed: 'A2' },
    ],
  },
  {
    id: 'middle_east',
    name: 'Middle East',
    flag: '🌍',
    countries: ['UAE', 'Saudi Arabia', 'Egypt', 'Morocco'],
    languages: [
      { code: 'ar', name: 'Arabic', flag: '🇸🇦', speakers: '420M', why: 'Essential in Middle East & North Africa', level_needed: 'A2' },
    ],
  },
  {
    id: 'global',
    name: 'Global / International',
    flag: '🌐',
    countries: [],
    languages: [
      { code: 'es', name: 'Spanish', flag: '🇪🇸', speakers: '500M', why: '2nd most spoken globally', level_needed: 'B1' },
      { code: 'fr', name: 'French', flag: '🇫🇷', speakers: '275M', why: 'Diplomatic & academic language', level_needed: 'B1' },
      { code: 'de', name: 'German', flag: '🇩🇪', speakers: '100M', why: 'Strong job market', level_needed: 'B1' },
      { code: 'zh', name: 'Mandarin', flag: '🇨🇳', speakers: '1B+', why: 'Largest native speaker base', level_needed: 'HSK 2' },
      { code: 'ar', name: 'Arabic', flag: '🇸🇦', speakers: '420M', why: 'UN official language', level_needed: 'A2' },
      { code: 'sw', name: 'Swahili', flag: '🇹🇿', speakers: '100M+', why: 'African Union official language', level_needed: 'Conversational' },
    ],
  },
]

// Get region for a country
function getRegionForCountry(countryName) {
  if (!countryName) return null
  return ALL_REGIONS.find(r => r.countries.some(c => countryName.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(countryName.toLowerCase())))
}

function RegionLanguageSelector({ currentCountry, currentCity, onSelectLanguage, permission }) {
  const [selectedRegion, setSelectedRegion] = useState(null)

  // Auto-detect region from location
  const detectedRegion = currentCountry ? getRegionForCountry(currentCountry) : null
  const displayRegion = selectedRegion || detectedRegion

  return (
    <div>
      {/* Region tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 14 }}>
          {detectedRegion && !selectedRegion
            ? `🎯 Languages for Your Region — ${detectedRegion.name}`
            : selectedRegion
            ? `🌍 ${selectedRegion.name}`
            : '🌍 Choose a Region'}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {detectedRegion && (
            <button
              onClick={() => setSelectedRegion(null)}
              style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !selectedRegion ? 'rgba(16,185,129,0.15)' : 'var(--surface)', color: !selectedRegion ? '#10b981' : '#64748b', border: `1px solid ${!selectedRegion ? 'rgba(16,185,129,0.4)' : 'var(--border)'}` }}
            >
              📍 My Location ({detectedRegion.name})
            </button>
          )}
          {ALL_REGIONS.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region)}
              style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: selectedRegion?.id === region.id ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: selectedRegion?.id === region.id ? '#60a5fa' : '#64748b', border: `1px solid ${selectedRegion?.id === region.id ? 'rgba(37,99,235,0.4)' : 'var(--border)'}` }}
            >
              {region.flag} {region.name}
            </button>
          ))}
        </div>
      </div>

      {/* Language cards for selected region */}
      {displayRegion ? (
        <div>
          {/* Location context banner if using auto-detected region */}
          {!selectedRegion && detectedRegion && (
            <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 12, color: '#10b981' }}>
              📍 Based on your location in {currentCity ? `${currentCity}, ` : ''}{currentCountry}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {displayRegion.languages.map(lang => (
              <div key={lang.code} onClick={() => onSelectLanguage(lang)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{lang.flag}</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 18 }}>{lang.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{lang.speakers} speakers</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>{lang.why}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', fontWeight: 700 }}>Target: {lang.level_needed}</span>
                  <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>Start →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>Select a region above to see languages</div>
          {permission !== 'granted' && <div style={{ fontSize: 13 }}>Or enable location to auto-detect your region</div>}
        </div>
      )}
    </div>
  )
}