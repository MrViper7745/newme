// Uses Resend for transactional email (free tier: 3000/month)
// Sign up at resend.com and add RESEND_API_KEY to your .env.local

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { to, subject, type, data } = req.body
  if (!to || !subject || !type) return res.status(400).json({ error: 'Missing required fields' })

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent')
    return res.status(200).json({ skipped: true, reason: 'No email API key configured' })
  }

  const html = buildEmailHTML(type, data, subject)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'EduLink Global <noreply@yourdomain.com>', // replace with your verified domain
        to: [to],
        subject,
        html,
      }),
    })
    const result = await response.json()
    if (!response.ok) return res.status(400).json({ error: result.message })
    return res.status(200).json({ sent: true, id: result.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

function buildEmailHTML(type, data, subject) {
  const base = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2563eb,#7c3aed);padding:10px 20px;border-radius:12px">
        <span style="font-size:22px">🎓</span>
        <span style="font-weight:900;font-size:18px;color:#fff">EduLink Global</span>
      </div>
    </div>
    ${content}
    <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#374151">
      <p>EduLink Global · Your AI-powered academic companion</p>
      <p><a href="{{{ APP_URL }}}/settings" style="color:#60a5fa">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>`

  if (type === 'exam_reminder') {
    return base(`
      <div style="background:#1e1e30;border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:28px;margin-bottom:20px">
        <h1 style="font-size:22px;font-weight:800;color:#f1f5f9;margin:0 0 8px">⏰ Exam Reminder</h1>
        <p style="color:#94a3b8;margin:0 0 20px;font-size:14px;line-height:1.6">${data?.message || 'You have an upcoming exam.'}</p>
        ${data?.exams?.map(e => `
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:10px">
            <div style="font-weight:700;color:#f1f5f9;font-size:15px">${e.module_name}</div>
            <div style="color:#ef4444;font-size:13px;margin-top:4px">📅 ${e.exam_date} · ${e.days_left} days left</div>
          </div>
        `).join('') || ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/exams" style="display:inline-block;margin-top:16px;padding:11px 24px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">View Study Plan →</a>
      </div>`)
  }

  if (type === 'weekly_summary') {
    return base(`
      <div style="background:#1e1e30;border:1px solid rgba(37,99,235,0.3);border-radius:16px;padding:28px;margin-bottom:20px">
        <h1 style="font-size:22px;font-weight:800;color:#f1f5f9;margin:0 0 8px">📊 Your Weekly Summary</h1>
        <p style="color:#94a3b8;margin:0 0 20px;font-size:14px">Here's how your week went, ${data?.name || 'Student'}:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          ${[
            { l: 'Study Sessions', v: data?.sessions || 0, c: '#2563eb' },
            { l: 'Practice Exams', v: data?.practice || 0, c: '#7c3aed' },
            { l: 'EduBot Chats', v: data?.conversations || 0, c: '#10b981' },
            { l: 'Language Streak', v: `${data?.streak || 0}d`, c: '#f59e0b' },
          ].map(s => `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:22px;font-weight:900;color:${s.c}">${s.v}</div>
              <div style="font-size:11px;color:#64748b;margin-top:3px">${s.l}</div>
            </div>
          `).join('')}
        </div>
        ${data?.insights?.length ? `
          <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:14px;margin-bottom:16px">
            <div style="font-weight:700;color:#a78bfa;font-size:13px;margin-bottom:8px">🤖 AI Insights for you</div>
            ${data.insights.map(i => `<div style="font-size:12px;color:#94a3b8;margin-bottom:5px;padding-left:8px;border-left:2px solid rgba(124,58,237,0.3)">• ${i.title}</div>`).join('')}
          </div>` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/dashboard" style="display:inline-block;padding:11px 24px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Go to Dashboard →</a>
      </div>`)
  }

  if (type === 'new_message') {
    return base(`
      <div style="background:#1e1e30;border:1px solid rgba(37,99,235,0.3);border-radius:16px;padding:28px">
        <h1 style="font-size:20px;font-weight:800;color:#f1f5f9;margin:0 0 8px">✉️ New Message</h1>
        <p style="color:#94a3b8;margin:0 0 16px;font-size:14px">You have a new message from <strong style="color:#60a5fa">${data?.senderName || 'a student'}</strong>:</p>
        <div style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px;margin-bottom:20px;font-size:14px;color:#e2e8f0;line-height:1.6">
          "${data?.preview || '...'}"
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/messages" style="display:inline-block;padding:11px 24px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Reply →</a>
      </div>`)
  }

  return base(`<div style="background:#1e1e30;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px"><h1 style="color:#f1f5f9">${subject}</h1><p style="color:#94a3b8">${data?.message || ''}</p></div>`)
}