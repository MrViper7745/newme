export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are EduBot, a helpful AI assistant for EduLink Global, a student platform connecting students worldwide with internships, scholarships, and academic resources. Be helpful, warm, and practical.'
          },
          ...messages
        ],
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq error:', errText)
      res.write(`data: ${JSON.stringify({ error: `Groq API error: ${errText}` })}\n\n`)
      res.end()
      return
    }

    // Read raw stream line by line
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Add new chunk to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process all complete lines in buffer
      const lines = buffer.split('\n')

      // Keep the last incomplete line in buffer
      buffer = lines.pop()

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()

        if (data === '[DONE]') {
          res.write(`data: [DONE]\n\n`)
          res.end()
          return
        }

        try {
          const parsed = JSON.parse(data)
          const text = parsed.choices?.[0]?.delta?.content
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`)
          }
        } catch (e) {
          // skip bad lines
        }
      }
    }

    res.write(`data: [DONE]\n\n`)
    res.end()

  } catch (error) {
    console.error('Handler error:', error)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}