import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  const [
    { data: profile },
    { data: library },
    { data: practice },
    { data: weakTopics },
    { data: exams },
    { data: sessions },
    { data: languages },
    { data: conversations },
    { data: posts },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user_id).single(),
    supabase.from('library_files').select('title,label,last_opened,saved_at').eq('user_id', user_id).limit(30),
    supabase.from('practice_attempts').select('*').eq('user_id', user_id).eq('completed', true).order('created_at', { ascending: false }).limit(10),
    supabase.from('weak_topics').select('*').eq('user_id', user_id).eq('resolved', false).order('occurrence_count', { ascending: false }).limit(10),
    supabase.from('exam_entries').select('*').eq('user_id', user_id).order('exam_date', { ascending: true }).limit(10),
    supabase.from('study_sessions').select('*').eq('user_id', user_id).order('session_date', { ascending: false }).limit(20),
    supabase.from('language_progress').select('*').eq('user_id', user_id),
    supabase.from('bot_conversations').select('id').eq('user_id', user_id),
    supabase.from('community_posts').select('id,created_at').eq('user_id', user_id),
  ])

  const avgScore = practice?.length
    ? Math.round(practice.reduce((s, p) => s + (p.total_score / p.max_score) * 100, 0) / practice.length)
    : null

  const completedSessions = sessions?.filter(s => s.completed).length || 0
  const topStreak = languages?.reduce((max, l) => Math.max(max, l.streak || 0), 0) || 0
  const upcomingExams = exams?.filter(e => new Date(e.exam_date) >= new Date()) || []

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EduLink Progress Report — ${profile?.name || 'Student'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 40px; max-width: 820px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: white; padding: 36px; border-radius: 16px; margin-bottom: 32px; }
  .header h1 { font-size: 30px; font-weight: 900; margin-bottom: 8px; }
  .header p { font-size: 14px; opacity: 0.85; line-height: 1.6; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 28px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .stat .value { font-size: 34px; font-weight: 900; margin-bottom: 4px; }
  .stat .label { font-size: 12px; color: #64748b; }
  .blue { color: #1d4ed8; } .green { color: #15803d; } .purple { color: #7c3aed; }
  .orange { color: #d97706; } .red { color: #dc2626; } .teal { color: #0891b2; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 17px; font-weight: 700; color: #1e293b; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  .item { padding: 10px 16px; background: #f8fafc; border-radius: 9px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; border: 1px solid #e2e8f0; }
  .item .name { color: #1e293b; flex: 1; padding-right: 12px; line-height: 1.4; }
  .item .val { font-weight: 700; white-space: nowrap; }
  .weak-item { border-left: 3px solid #ef4444; }
  .exam-item { border-left: 3px solid #f59e0b; }
  .good-item { border-left: 3px solid #10b981; }
  .progress-bar-bg { background: #e2e8f0; border-radius: 4px; height: 6px; margin-top: 6px; }
  .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; line-height: 1.8; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-orange { background: #ffedd5; color: #c2410c; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>📊 EduLink Progress Report</h1>
  <p>
    <strong>${profile?.name || 'Student'}</strong><br>
    ${[profile?.field, profile?.qualification_type, profile?.year_of_study, profile?.institution].filter(Boolean).join(' · ')}<br>
    Generated on ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  </p>
</div>

<div class="grid3">
  <div class="stat"><div class="value blue">${library?.length || 0}</div><div class="label">Library Files</div></div>
  <div class="stat"><div class="value green">${practice?.length || 0}</div><div class="label">Practice Exams Completed</div></div>
  <div class="stat"><div class="value purple">${avgScore !== null ? avgScore + '%' : '—'}</div><div class="label">Avg Practice Score</div></div>
  <div class="stat"><div class="value orange">${completedSessions}</div><div class="label">Study Sessions Done</div></div>
  <div class="stat"><div class="value teal">${topStreak}d</div><div class="label">Best Language Streak</div></div>
  <div class="stat"><div class="value blue">${conversations?.length || 0}</div><div class="label">EduBot Conversations</div></div>
</div>

${practice?.length > 0 ? `
<div class="section">
  <h2>✍️ Practice Exam Results</h2>
  ${practice.map(p => {
    const pct = Math.round((p.total_score / p.max_score) * 100)
    return `
    <div class="item ${pct >= 70 ? 'good-item' : pct >= 50 ? 'exam-item' : 'weak-item'}">
      <div class="name">
        ${p.file_title || 'Practice Exam'}
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}"></div></div>
      </div>
      <div class="val" style="color:${pct >= 70 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626'}">${p.total_score}/${p.max_score} (${pct}%)</div>
    </div>`
  }).join('')}
</div>` : ''}

${weakTopics?.length > 0 ? `
<div class="section">
  <h2>⚠️ Topics Needing Attention</h2>
  ${weakTopics.map(t => `
    <div class="item weak-item">
      <div class="name">${t.topic}${t.module ? ` <span class="badge badge-blue">${t.module}</span>` : ''}</div>
      <div class="val red">Flagged ${t.occurrence_count}× — focus here</div>
    </div>
  `).join('')}
</div>` : ''}

${upcomingExams.length > 0 ? `
<div class="section">
  <h2>📅 Upcoming Exams</h2>
  ${upcomingExams.map(e => {
    const days = Math.ceil((new Date(e.exam_date) - new Date()) / (1000*60*60*24))
    const urgency = days <= 3 ? 'red' : days <= 7 ? 'orange' : 'blue'
    return `
    <div class="item exam-item">
      <div class="name">
        ${e.module_name}
        ${e.venue ? `<br><small style="color:#64748b">📍 ${e.venue}</small>` : ''}
      </div>
      <div>
        <div class="val" style="color:${urgency === 'red' ? '#dc2626' : urgency === 'orange' ? '#d97706' : '#1d4ed8'}">${new Date(e.exam_date+'T12:00:00').toLocaleDateString('en-ZA')}</div>
        <div style="font-size:11px;color:${urgency === 'red' ? '#dc2626' : '#64748b'};text-align:right">${days} day${days !== 1 ? 's' : ''} left</div>
      </div>
    </div>`
  }).join('')}
</div>` : ''}

${languages?.length > 0 ? `
<div class="section">
  <h2>🌐 Language Learning</h2>
  ${languages.map(l => `
    <div class="item good-item">
      <div class="name">${l.language}${l.language_code ? ` (${l.language_code.toUpperCase()})` : ''}</div>
      <div class="val green">🔥 ${l.streak || 0}-day streak · Level ${l.level || 1} · ${l.xp || 0} XP</div>
    </div>
  `).join('')}
</div>` : ''}

${library?.filter(f => f.last_opened).length > 0 ? `
<div class="section">
  <h2>📚 Recently Studied Files</h2>
  ${library.filter(f => f.last_opened).slice(0, 8).map(f => `
    <div class="item">
      <div class="name">${f.title || f.name || 'Untitled'}${f.label ? ` <span class="badge badge-blue">${f.label}</span>` : ''}</div>
      <div class="val" style="color:#64748b;font-size:11px">${new Date(f.last_opened).toLocaleDateString('en-ZA')}</div>
    </div>
  `).join('')}
</div>` : ''}

<div class="footer">
  <p><strong>Generated by EduLink Global</strong> — Your AI-powered academic and career companion</p>
  <p>To save as PDF: Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac) → Change destination to "Save as PDF"</p>
</div>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Content-Disposition', `attachment; filename="EduLink_Progress_Report_${new Date().toISOString().split('T')[0]}.html"`)
  res.send(html)
}