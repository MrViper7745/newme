export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { module_name, context, days_left } = req.body
  if (!module_name) return res.status(400).json({ error: 'module_name required' })

  const prompt = `A student has an exam in ${days_left || 1} day${days_left !== 1 ? 's' : ''} for: "${module_name}".

${context ? `Available study material:\n${context.slice(0, 5000)}\n\n` : ''}

Generate a comprehensive EMERGENCY STUDY PACK with:

1. CRITICAL DEFINITIONS — 8 key terms they must know
2. ESSENTIAL FORMULAS — 6 most likely to be tested
3. MOST LIKELY EXAM TOPICS — ranked by probability
4. 10 PRACTICE QUESTIONS — with model answers
5. LAST-MINUTE TIPS — 5 exam strategies for this subject
6. ${days_left || 1}-DAY STUDY PLAN — hour by hour

Be specific to ${module_name}. This is urgent.`

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 3000,
      }),
    })

    const reader = groqRes.body.getReader()
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