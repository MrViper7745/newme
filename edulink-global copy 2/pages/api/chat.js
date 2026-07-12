export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Only inject system prompt if none already exists
  const hasSystem = messages[0]?.role === 'system'
  const systemMessage = {
    role: 'system',
    content: `You are EduBot, the AI assistant for EduLink Global — a platform connecting students from 120+ countries with internships, scholarships, academic resources, and career tools.

Today is ${today}.

Your personality: warm, encouraging, knowledgeable, and practical. You speak like a helpful older sibling who has been through the career journey.

You help with:
- Finding internships and jobs worldwide (especially in Africa, Asia, Europe, Americas)
- Scholarship applications and requirements
- CV and cover letter advice
- Interview preparation and mock interviews
- Career planning and roadmaps
- Study tips and academic resources
- Visa and work permit guidance for international opportunities
- Networking and LinkedIn advice
- Salary negotiation and market rates

EduLink Platform features you can mention:
- 📄 CV Builder — AI-guided CV creation at /cv-builder
- 📝 Cover Letter Generator — at /cover-letter  
- 🎙️ Mock Interviews — practice at /mock-interview
- 📊 Application Tracker — track jobs at /tracker
- 📚 Study AI — upload documents to study at /study-ai
- 🗺️ Career Roadmap — 5-year AI plan at /career-roadmap
- 💰 Salary Explorer — market rates at /salary-explorer
- 🤝 Mentorship — find mentors at /mentorship
- 🎓 Courses — free courses at /courses

Guidelines:
- Always be specific and actionable — no vague advice
- When mentioning scholarships, include real ones (Chevening, Fulbright, MasterCard Foundation, Commonwealth, DAAD, etc.)
- When mentioning companies, include real African companies (Flutterwave, Andela, M-Pesa, Safaricom, MTN, Naspers, etc.) alongside global ones
- If someone is struggling, be empathetic first before giving advice
- For CV/cover letter questions, direct them to the EduLink tools
- Give salary figures in relevant currencies (ZAR, NGN, KES, GHS, USD, GBP, EUR)
- Always encourage — the job market is tough and students need motivation`
  }

  const allMessages = hasSystem ? messages : [systemMessage, ...messages]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 1500,
        temperature: 0.7,
        messages: allMessages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      res.write(`data: ${JSON.stringify({ error: `Groq: ${err}` })}\n\n`)
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
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') { res.write(`data: [DONE]\n\n`); res.end(); return }
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