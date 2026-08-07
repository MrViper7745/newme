export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, from_language = 'English', to_language, preserve_equations = true } = req.body
  if (!text || !to_language) return res.status(400).json({ error: 'text and to_language required' })

  const SUPPORTED = ['English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana', 'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi']
  if (!SUPPORTED.includes(to_language)) return res.status(400).json({ error: `Unsupported language. Supported: ${SUPPORTED.join(', ')}` })

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const prompt = `Translate the following study material from ${from_language} to ${to_language}.

Rules:
- Preserve all mathematical equations, formulas, and symbols exactly as they are
- Preserve all numbers, units, and scientific notation
- Keep technical terms in their original form but provide the ${to_language} explanation in brackets
- Maintain the structure and formatting of the original text
- Make the translation natural and understandable for a university student

Text to translate:
${text.slice(0, 4000)}`

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
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