// pages/api/weekly-coaching.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { user_message, context } = req.body
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
  const systemPrompt = `You are EduBot acting as a weekly academic coach for a South African university student. Context about their week: ${JSON.stringify(context || {})}. You are having a structured 10-minute coaching session. Ask thoughtful follow-up questions. Celebrate wins. Acknowledge struggles with empathy. Help them build next week's plan collaboratively. Be warm, specific, and actionable.`
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', stream: true, max_tokens: 500, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: user_message || 'Start my weekly coaching session.' }] })
    })
    const reader = r.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim(); if (d === '[DONE]') { res.write('data: [DONE]\n\n'); return res.end() }
        try { const p = JSON.parse(d); const text = p.choices?.[0]?.delta?.content; if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`) } catch {}
      }
    }
  } catch (err) { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`) }
  res.end()
}