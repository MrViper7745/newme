export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, content, topic } = req.body
  if (!content) return res.status(400).json({ error: 'No content provided' })
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  // ── FIX: Truncate content to stay within token limits ──
  // Groq llama-3.3-70b limit is 12,000 TPM on free tier
  // ~4 chars per token, so 8000 tokens = ~32,000 chars — but be safe with 6000 tokens = ~24,000 chars
  const MAX_CHARS = 12000  // safe limit leaving room for prompt + response
  const truncated = content.length > MAX_CHARS
    ? content.slice(0, MAX_CHARS) + '\n\n[Document truncated to fit AI limits — first section processed]'
    : content

  const PROMPTS = {
    summary: `Summarise this document clearly and concisely. Use:
- A 2-3 sentence overview at the top
- Key points as bullet points grouped by topic
- Highlight the most important concepts in **bold**
- End with a "Key Takeaways" section

Document:
${truncated}`,

    flashcards: `Create 15 flashcards from this document for studying.

Return ONLY valid JSON array, no other text:
[
  {"front": "Question or concept here?", "back": "Clear answer here"},
  ...
]

Document:
${truncated}`,

    quiz: `Create a 10-question multiple choice quiz from this document.

Return ONLY valid JSON array, no other text:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Why this answer is correct"
  }
]

Document:
${truncated}`,

    exam: `Create a university-style exam with 5 questions from this document.

Include a mix of:
- Short answer questions (2-3 marks)
- Long answer questions (10-15 marks)
- Case study or application questions

Format clearly with question numbers, marks allocation, and expected answer length guidance.

Document:
${truncated}`,

    mindmap: `Create a detailed mind map outline from this document.

Format as a structured hierarchy using indentation:
CENTRAL TOPIC
  MAIN BRANCH 1
    Sub-topic 1.1
      Detail 1.1.1
      Detail 1.1.2
    Sub-topic 1.2
  MAIN BRANCH 2
    Sub-topic 2.1
    Sub-topic 2.2
  MAIN BRANCH 3
    ...

Document:
${truncated}`,

    timeline: `Extract all events, dates, processes, or sequences from this document and arrange them as a timeline.

Format each item as:
[DATE/PERIOD/STEP] — [EVENT/DESCRIPTION]

If no dates exist, create a logical sequence of concepts or steps.

Document:
${truncated}`,

    glossary: `Extract all key terms, concepts, and technical vocabulary from this document.

Format as:
**Term**: Definition in simple, clear language (1-2 sentences max)

Group related terms together under headings if possible.

Document:
${truncated}`,
  }

  const prompt = PROMPTS[type]
  if (!prompt) return res.status(400).json({ error: `Unknown type: ${type}` })

  // Streaming response setup
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Adjust max_tokens based on type
  const MAX_TOKENS = {
    summary: 1500,
    flashcards: 2000,
    quiz: 2000,
    exam: 1800,
    mindmap: 1500,
    timeline: 1200,
    glossary: 1800,
  }

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
        max_tokens: MAX_TOKENS[type] || 1500,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You are an expert academic assistant helping students study effectively. Be thorough, accurate, and educational.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMsg = `Groq API error: ${response.status}`
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson.error?.message || errMsg
      } catch {}
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
      res.end()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
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
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch {}
      }
    }

    res.write(`data: [DONE]\n\n`)
    res.end()

  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}