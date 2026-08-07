import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 150 }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  try {
    // Check if we ran in last 6h
    const { data: recentRun } = await supabase
      .from('agent_runs').select('run_at').eq('user_id', user_id)
      .order('run_at', { ascending: false }).limit(1).single()

    if (recentRun) {
      const hoursSince = (Date.now() - new Date(recentRun.run_at)) / (1000 * 60 * 60)
      if (hoursSince < 6) {
        const { data: existing } = await supabase.from('agent_insights').select('*')
          .eq('user_id', user_id).eq('dismissed', false)
          .order('priority', { ascending: true }).limit(5)
        return res.status(200).json({ insights_generated: 0, insights: existing || [], cached: true })
      }
    }

    // Clear stale non-dismissed insights older than 23h
    await supabase.from('agent_insights').delete()
      .eq('user_id', user_id).eq('dismissed', false)
      .lt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())

    const insights = await analyzeUserBehavior(user_id)
    return res.status(200).json({ insights_generated: insights.length, insights })
  } catch (e) {
    console.error('Agent error:', e)
    return res.status(500).json({ error: e.message })
  }
}

async function analyzeUserBehavior(userId) {
  const now = new Date()
  const insights = []

  // ── LOAD ALL USER DATA ACROSS THE ENTIRE APP ──────────────
  const [
    profileRes,
    libraryFilesRes,
    librarySessionsRes,
    weakTopicsRes,
    practiceRes,
    examEntriesRes,
    studySessionsRes,
    botConversationsRes,
    communityPostsRes,
    directMessagesRes,
    langProgressRes,
    transactionsRes,
    applicationsRes,
    agentRunsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('library_files').select('id,title,label,last_opened,saved_at,content_text,priority').eq('user_id', userId).order('saved_at', { ascending: false }).limit(50),
    supabase.from('library_sessions').select('file_id,file_title,messages,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20),
    supabase.from('weak_topics').select('*').eq('user_id', userId).eq('resolved', false).order('occurrence_count', { ascending: false }).limit(10),
    supabase.from('practice_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('exam_entries').select('*').eq('user_id', userId).order('exam_date', { ascending: true }).limit(10),
    supabase.from('study_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }).limit(20),
    supabase.from('bot_conversations').select('id,title,updated_at,preview').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    supabase.from('community_posts').select('id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('direct_messages').select('id,created_at').eq('sender_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('language_progress').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(20),
    supabase.from('applications').select('*').eq('user_id', userId).order('deadline', { ascending: true }).limit(10),
    supabase.from('agent_runs').select('run_at').eq('user_id', userId).order('run_at', { ascending: false }).limit(5),
  ])

  const profile = profileRes.data
  const library = libraryFilesRes.data || []
  const sessions = librarySessionsRes.data || []
  const weakTopics = weakTopicsRes.data || []
  const practice = practiceRes.data || []
  const exams = examEntriesRes.data || []
  const studySessions = studySessionsRes.data || []
  const botConvos = botConversationsRes.data || []
  const posts = communityPostsRes.data || []
  const messages = directMessagesRes.data || []
  const languages = langProgressRes.data || []
  const transactions = transactionsRes.data || []
  const applications = applicationsRes.data || []

  if (!profile) return []

  // ── BEHAVIOUR ANALYSIS ────────────────────────────────────

  // 1. Unopened high-priority files (saves but never opens)
  const unopenedHigh = library.filter(f => f.priority === 'high' && !f.last_opened && (now - new Date(f.saved_at)) / (1000 * 60 * 60 * 24) > 1)
  if (unopenedHigh.length > 0) {
    insights.push({
      user_id: userId, type: 'study_suggestion', priority: 'high',
      title: `📚 ${unopenedHigh.length} high-priority file${unopenedHigh.length > 1 ? 's' : ''} waiting`,
      message: `You saved ${unopenedHigh.length} high-priority file${unopenedHigh.length > 1 ? 's' : ''} but haven't opened ${unopenedHigh.length > 1 ? 'them' : 'it'} yet. ${unopenedHigh[0]?.title || 'Your file'} is waiting in the Library.`,
      action_label: 'Open Library', action_url: '/library',
    })
  }

  // 2. Unopened exam papers
  const unopenedExams = library.filter(f => f.label === 'Past Exam Paper' && !f.last_opened && (now - new Date(f.saved_at)) / (1000 * 60 * 60 * 24) > 2)
  if (unopenedExams.length > 0 && unopenedHigh.length === 0) {
    insights.push({
      user_id: userId, type: 'study_suggestion', priority: 'medium',
      title: `📄 ${unopenedExams.length} unopened exam paper${unopenedExams.length > 1 ? 's' : ''}`,
      message: `You saved ${unopenedExams.length} past exam paper${unopenedExams.length > 1 ? 's' : ''} but haven't opened ${unopenedExams.length > 1 ? 'them' : 'it'} yet. Open ${unopenedExams.length > 1 ? 'them' : 'it'} in the Library with the AI tutor to start practising.`,
      action_label: 'Open Library', action_url: '/library',
    })
  }

  // 3. Weak topics that keep recurring
  const recurringWeakTopics = weakTopics.filter(t => t.occurrence_count >= 2)
  if (recurringWeakTopics.length > 0) {
    insights.push({
      user_id: userId, type: 'weak_topic', priority: 'high',
      title: `⚠️ You keep struggling with: ${recurringWeakTopics[0].topic}`,
      message: `You've been confused about "${recurringWeakTopics[0].topic}" ${recurringWeakTopics[0].occurrence_count} times${recurringWeakTopics.length > 1 ? ` and ${recurringWeakTopics.length - 1} other topic${recurringWeakTopics.length > 2 ? 's' : ''}` : ''}. Try the Study AI tools or ask EduBot for a detailed explanation.`,
      action_label: 'Open Study AI', action_url: '/study-ai',
    })
  }

  // 4. Study inactivity — hasn't used Study AI or Library in a while
  const lastLibraryActivity = sessions[0]?.updated_at
  const lastBotActivity = botConvos[0]?.updated_at
  const lastStudyActivity = studySessions[0]?.session_date
  const mostRecentStudy = [lastLibraryActivity, lastBotActivity, lastStudyActivity]
    .filter(Boolean).map(d => new Date(d)).sort((a, b) => b - a)[0]

  if (mostRecentStudy) {
    const daysSinceStudy = Math.floor((now - mostRecentStudy) / (1000 * 60 * 60 * 24))
    if (daysSinceStudy >= 4) {
      insights.push({
        user_id: userId, type: 'inactivity', priority: daysSinceStudy >= 10 ? 'high' : 'medium',
        title: `📖 ${daysSinceStudy} days since your last study session`,
        message: `You haven't studied in ${daysSinceStudy} days. ${daysSinceStudy >= 10 ? 'This could seriously affect your retention.' : 'Even a 15-minute session helps with retention.'} You have ${library.length} files waiting in your library.`,
        action_label: 'Start Studying', action_url: '/study-ai',
      })
    }
  }

  // 5. Exam coming up — no study plan
  const urgentExams = exams.filter(e => {
    const days = Math.ceil((new Date(e.exam_date) - now) / (1000 * 60 * 60 * 24))
    return days > 0 && days <= 14
  })
  for (const exam of urgentExams.slice(0, 1)) {
    const days = Math.ceil((new Date(exam.exam_date) - now) / (1000 * 60 * 60 * 24))
    const hasPlan = studySessions.some(s => s.exam_id === exam.id)
    if (!hasPlan) {
      insights.push({
        user_id: userId, type: 'exam_warning', priority: days <= 5 ? 'high' : 'medium',
        title: `⏰ ${exam.module_name} in ${days} day${days !== 1 ? 's' : ''} — no study plan!`,
        message: `Your ${exam.module_name} exam is in ${days} day${days !== 1 ? 's' : ''} but you have no study plan set up. Generate one now from the Exams page.`,
        action_label: 'Set Up Study Plan', action_url: '/exams',
      })
    } else {
      const completedSessions = studySessions.filter(s => s.exam_id === exam.id && s.completed).length
      const totalSessions = studySessions.filter(s => s.exam_id === exam.id).length
      if (totalSessions > 0 && completedSessions < totalSessions * 0.3 && days <= 7) {
        insights.push({
          user_id: userId, type: 'exam_warning', priority: 'high',
          title: `⚠️ Behind on ${exam.module_name} study plan`,
          message: `You've only completed ${completedSessions}/${totalSessions} planned sessions for ${exam.module_name} with ${days} days left. You need to catch up.`,
          action_label: 'View Schedule', action_url: '/exams',
        })
      }
    }
  }

  // 6. Application deadlines
  const urgentApps = applications.filter(app => {
    if (!app.deadline || app.status === 'submitted') return false
    const days = Math.ceil((new Date(app.deadline) - now) / (1000 * 60 * 60 * 24))
    return days > 0 && days <= 7
  }).slice(0, 1)

  for (const app of urgentApps) {
    const days = Math.ceil((new Date(app.deadline) - now) / (1000 * 60 * 60 * 24))
    insights.push({
      user_id: userId, type: 'deadline_warning', priority: days <= 2 ? 'high' : 'medium',
      title: `⏰ ${app.company || app.title} deadline in ${days} day${days !== 1 ? 's' : ''}`,
      message: `Your application to ${app.company || app.title} is due in ${days} day${days !== 1 ? 's' : ''} and is still "${app.status}". Don't miss it!`,
      action_label: 'View Application', action_url: '/tracker',
    })
  }

  // 7. Language streak risk
  for (const lang of languages) {
    if (!lang.last_checkin || !lang.streak) continue
    const daysSince = Math.floor((now - new Date(lang.last_checkin)) / (1000 * 60 * 60 * 24))
    if (daysSince === 1 && lang.streak >= 3) {
      insights.push({
        user_id: userId, type: 'streak_risk', priority: 'high',
        title: `🔥 Don't lose your ${lang.streak}-day ${lang.language} streak!`,
        message: `You haven't done your ${lang.language} check-in today. Your ${lang.streak}-day streak resets at midnight — do it now!`,
        action_label: 'Do Check-in', action_url: '/language',
      })
      break
    }
  }

  // 8. Practice low scores
  const recentPractice = practice.filter(p => p.completed && p.total_score !== null && p.max_score)
  if (recentPractice.length > 0) {
    const avgScore = recentPractice.reduce((sum, p) => sum + (p.total_score / p.max_score), 0) / recentPractice.length
    if (avgScore < 0.5 && recentPractice.length >= 2) {
      insights.push({
        user_id: userId, type: 'performance', priority: 'medium',
        title: `📉 Practice scores averaging ${Math.round(avgScore * 100)}%`,
        message: `Your last ${recentPractice.length} practice exam${recentPractice.length > 1 ? 's' : ''} averaged ${Math.round(avgScore * 100)}%. Ask EduBot to explain the topics you're missing most.`,
        action_label: 'Ask EduBot', action_url: '/assistant',
      })
    }
  }

  // 9. Budget warning
  if (transactions.length >= 5) {
    const thisMonth = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth())
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    if (expense > income * 1.2 && income > 0) {
      insights.push({
        user_id: userId, type: 'budget_warning', priority: 'medium',
        title: `💰 Spending exceeds income this month`,
        message: `Your expenses (R${Math.round(expense)}) are higher than income (R${Math.round(income)}) this month. Check the Income Hub for student money ideas.`,
        action_label: 'View Income Hub', action_url: '/income',
      })
    }
  }

  // 10. Incomplete profile (only when they have content but no profile)
  if (!profile.field && !profile.qualification_type && library.length >= 3) {
    insights.push({
      user_id: userId, type: 'profile_incomplete', priority: 'low',
      title: `🎓 Complete your academic profile`,
      message: `You have ${library.length} files in your library but no academic profile. Setting it up helps EduLink prioritise the right papers and resources for you.`,
      action_label: 'Complete Profile', action_url: '/profile',
    })
  }

  // 11. Library files with content but never had a session
  const filesWithContentNoSession = library.filter(f => f.content_text && f.last_opened && !sessions.some(s => s.file_id === f.id))
  if (filesWithContentNoSession.length > 0) {
    insights.push({
      user_id: userId, type: 'study_suggestion', priority: 'low',
      title: `💡 You opened files but haven't studied them yet`,
      message: `"${filesWithContentNoSession[0].title}" is loaded and ready — open it and ask the AI to explain, quiz you, or generate revision notes.`,
      action_label: 'Continue in Library', action_url: '/library',
    })
  }

  // 12. Achievement — milestones
  if (practice.filter(p => p.completed).length === 10) {
    insights.push({
      user_id: userId, type: 'achievement', priority: 'low',
      title: `🏆 10 practice exams completed!`,
      message: `You've completed 10 practice exams — that's real commitment to your studies. Keep it up!`,
      action_label: 'Keep Going', action_url: '/library',
    })
  }
  const topStreak = languages.reduce((max, l) => Math.max(max, l.streak || 0), 0)
  if (topStreak === 7 || topStreak === 30) {
    insights.push({
      user_id: userId, type: 'achievement', priority: 'low',
      title: `🔥 ${topStreak}-day language streak!`,
      message: `${topStreak === 7 ? 'One full week' : 'One full month'} of daily language practice. That level of consistency is rare — keep going!`,
      action_label: 'View Progress', action_url: '/language',
    })
  }

  // ── SORT + CAP AT 5, DEDUPLICATE BY TYPE ──────────────────
  const seen = new Set()
  const deduped = insights.filter(i => {
    if (seen.has(i.type)) return false
    seen.add(i.type)
    return true
  })

  const sorted = deduped.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
  }).slice(0, 5)

  if (sorted.length > 0) {
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('agent_insights').insert(sorted.map(i => ({ ...i, expires_at: expires })))
  }

  await supabase.from('agent_runs').insert({
    user_id: userId,
    insights_generated: sorted.length,
    summary: sorted.map(i => i.title).join(' · '),
  })

  return sorted
}