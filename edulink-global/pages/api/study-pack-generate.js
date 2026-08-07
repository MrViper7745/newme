export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { module_name, context, type = 'comprehensive' } = req.body
  if (!module_name) return res.status(400).json({ error: 'module_name required' })

  const prompts = {
    comprehensive: `Create a comprehensive study pack for "${module_name}". Include: 1) Key concepts summary, 2) Important formulas/definitions, 3) 10 practice questions with answers, 4) Common exam mistakes to avoid, 5) Study tips specific to this subject.`,
    flashcards: `Create 15 flashcards for "${module_name}". Return ONLY JSON array: [{"question":"...","answer":"...","difficulty":"easy|medium|hard"}]`,
    summary: `Summarise the key points of "${module_name}" in a clear, structured format a student can review in 10 minutes.`,
  }

  const prompt = prompts[type] || prompts.comprehensive
  const fullPrompt = context ? `${prompt}\n\nAvailable study material:\n${context.slice(0, 5000)}` : prompt

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 2000,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    })
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { res.write('data: [DONE]\n\n'); return res.end() }
        try {
          const p = JSON.parse(d)
          const text = p.choices?.[0]?.delta?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch {}
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  }
  res.end()
}