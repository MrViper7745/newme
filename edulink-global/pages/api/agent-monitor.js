import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 120,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  try {
    // First clear ALL existing non-dismissed insights for this user
    // so we never show duplicates — we regenerate fresh each time
    await supabase
      .from('agent_insights')
      .delete()
      .eq('user_id', user_id)
      .eq('dismissed', false)
      .lt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())

    // Check if we already ran in the last 6 hours
    const { data: recentRun } = await supabase
      .from('agent_runs')
      .select('run_at')
      .eq('user_id', user_id)
      .order('run_at', { ascending: false })
      .limit(1)
      .single()

    if (recentRun) {
      const hoursSince = (Date.now() - new Date(recentRun.run_at)) / (1000 * 60 * 60)
      if (hoursSince < 6) {
        // Load existing non-dismissed insights instead of regenerating
        const { data: existing } = await supabase
          .from('agent_insights')
          .select('*')
          .eq('user_id', user_id)
          .eq('dismissed', false)
          .order('priority', { ascending: true })
          .limit(5)
        return res.status(200).json({ insights_generated: 0, insights: existing || [], cached: true })
      }
    }

    const insights = await analyzeUser(user_id)
    return res.status(200).json({ insights_generated: insights.length, insights })
  } catch (e) {
    console.error('Agent monitor error:', e)
    return res.status(500).json({ error: e.message })
  }
}

async function analyzeUser(userId) {
  const now = new Date()
  const insights = []

  const [profileRes, libraryRes, langRes, studyRes, transRes, applicationsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('library_files').select('id, title, label, last_opened, saved_at').eq('user_id', userId).order('saved_at', { ascending: false }).limit(30),
    supabase.from('language_progress').select('*').eq('user_id', userId),
    supabase.from('study_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10).catch(() => ({ data: [] })),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(20).catch(() => ({ data: [] })),
    supabase.from('applications').select('*').eq('user_id', userId).order('deadline', { ascending: true }).limit(10).catch(() => ({ data: [] })),
  ])

  const profile = profileRes.data
  const libraryFiles = libraryRes.data || []
  const languages = langRes.data || []
  const studySessions = studyRes.data || []
  const transactions = transRes.data || []
  const applications = applicationsRes.data || []

  if (!profile) return []

  // RULE 1: Unopened exam papers (deduplicated — only one insight regardless of count)
  const unopenedExams = libraryFiles.filter(f =>
    f.label === 'Past Exam Paper' &&
    !f.last_opened &&
    (now - new Date(f.saved_at)) / (1000 * 60 * 60 * 24) > 2
  )
  if (unopenedExams.length > 0) {
    insights.push({
      user_id: userId,
      type: 'study_suggestion',
      title: `📚 ${unopenedExams.length} unopened exam paper${unopenedExams.length > 1 ? 's' : ''}`,
      message: `You saved ${unopenedExams.length} past exam paper${unopenedExams.length > 1 ? 's' : ''} but haven't opened ${unopenedExams.length > 1 ? 'them' : 'it'} yet. Open ${unopenedExams.length > 1 ? 'them' : 'it'} in your Library with the AI tutor to start practising.`,
      priority: 'medium',
      action_label: 'Open Library',
      action_url: '/library',
    })
  }

  // RULE 2: Language streak risk (one per language maximum)
  for (const lang of languages) {
    if (!lang.last_checkin) continue
    const daysSince = Math.floor((now - new Date(lang.last_checkin)) / (1000 * 60 * 60 * 24))
    if (daysSince === 1 && (lang.streak || 0) >= 3) {
      insights.push({
        user_id: userId,
        type: 'streak_risk',
        title: `🔥 Don't lose your ${lang.streak}-day streak!`,
        message: `You haven't done your ${lang.language} check-in today. Your ${lang.streak}-day streak will reset if you miss today.`,
        priority: 'high',
        action_label: 'Do Check-in',
        action_url: '/language',
      })
      break // Only one streak warning ever
    }
  }

  // RULE 3: Study inactivity (only if we have session data)
  if (studySessions.length > 0) {
    const lastStudy = new Date(studySessions[0].created_at || studySessions[0].session_date)
    const daysSince = Math.floor((now - lastStudy) / (1000 * 60 * 60 * 24))
    if (daysSince >= 5) {
      insights.push({
        user_id: userId,
        type: 'inactivity',
        title: `📖 ${daysSince} days since your last study session`,
        message: `You haven't studied in ${daysSince} days. Staying consistent helps retention — even a 15-minute session helps.`,
        priority: 'medium',
        action_label: 'Start Studying',
        action_url: '/study-ai',
      })
    }
  }

  // RULE 4: Upcoming deadlines (max 2 — most urgent only)
  const urgentApps = applications
    .filter(app => {
      if (!app.deadline || app.status === 'submitted') return false
      const daysUntil = Math.ceil((new Date(app.deadline) - now) / (1000 * 60 * 60 * 24))
      return daysUntil > 0 && daysUntil <= 7
    })
    .slice(0, 2)

  for (const app of urgentApps) {
    const daysUntil = Math.ceil((new Date(app.deadline) - now) / (1000 * 60 * 60 * 24))
    insights.push({
      user_id: userId,
      type: 'deadline_warning',
      title: `⏰ ${app.company || app.title} due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
      message: `Your application to ${app.company || app.title} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} and is still "${app.status}". Don't miss it!`,
      priority: daysUntil <= 2 ? 'high' : 'medium',
      action_label: 'View Application',
      action_url: '/tracker',
    })
  }

  // RULE 5: Budget warning (only once, only if meaningful data)
  if (transactions.length >= 5) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    if (expense > income * 1.2 && income > 0) {
      insights.push({
        user_id: userId,
        type: 'budget_warning',
        title: `💰 Spending exceeds income`,
        message: `Your recent expenses (R${expense.toFixed(0)}) are higher than your income (R${income.toFixed(0)}). Check the Income Hub for student money ideas.`,
        priority: 'medium',
        action_label: 'View Income Hub',
        action_url: '/income',
      })
    }
  }

  // RULE 6: Incomplete profile (only once)
  if (!profile.qualification_type && libraryFiles.length > 0) {
    insights.push({
      user_id: userId,
      type: 'profile_incomplete',
      title: `🎓 Complete your academic profile`,
      message: `You have ${libraryFiles.length} files saved but no academic profile set up. This helps EduLink prioritise the right papers for you.`,
      priority: 'medium',
      action_label: 'Set Up Profile',
      action_url: '/settings',
    })
  }

  // RULE 7: Achievement (only when genuinely earned)
  const topStreak = languages.reduce((max, l) => Math.max(max, l.streak || 0), 0)
  if (topStreak >= 7) {
    insights.push({
      user_id: userId,
      type: 'achievement',
      title: `🏆 ${topStreak}-day language streak!`,
      message: `Amazing — you've kept your streak going for ${topStreak} days. Consistency is the key to fluency. Keep it up!`,
      priority: 'low',
      action_label: 'View Progress',
      action_url: '/language',
    })
  }

  // Cap at 5 insights total — prioritise high then medium then low
  const sorted = insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
  }).slice(0, 5)

  // Save to DB
  if (sorted.length > 0) {
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('agent_insights').insert(
      sorted.map(i => ({ ...i, expires_at: expires }))
    )
  }

  // Log the run
  await supabase.from('agent_runs').insert({
    user_id: userId,
    insights_generated: sorted.length,
    summary: sorted.map(i => i.title).join(' · '),
  })

  return sorted
}