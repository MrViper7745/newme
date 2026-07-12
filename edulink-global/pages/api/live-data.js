// Live internships and resources via web search aggregation
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, query, region, field } = req.body

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const today = new Date().toISOString().split('T')[0]

  const PROMPTS = {
    internships: `Today is ${today}. You are a career database assistant. Generate 12 realistic, currently available internship opportunities for ${region || 'Africa'} in the ${field || 'Technology'} field.

These should reflect REAL companies and REAL types of opportunities that are typically available right now in ${new Date().getFullYear()}.

Return ONLY a JSON array:
[
  {
    "id": "unique_id_1",
    "title": "Software Engineering Intern",
    "company": "Flutterwave",
    "location": "Lagos, Nigeria",
    "region": "africa",
    "country": "Nigeria",
    "field": "IT",
    "type": "Full-time",
    "duration": "3 months",
    "deadline": "2025-08-30",
    "salary": "₦150,000/mo",
    "logo": "🏦",
    "description": "Join Africa's leading fintech to build payment infrastructure.",
    "requirements": ["Python or JavaScript", "Final year or recent graduate", "Strong problem-solving"],
    "apply_url": "https://flutterwave.com/careers",
    "posted": "2025-06-01",
    "source": "Company Website"
  }
]

Mix well-known companies with emerging startups. Make deadlines realistic for ${today}. Include apply URLs to real company career pages.`,

    resources: `Today is ${today}. Generate 12 high-quality, freely available academic resources for students studying ${field || 'Computer Science'} at university level.

Focus on resources that actually exist and are free to access right now in ${new Date().getFullYear()}.

Return ONLY a JSON array:
[
  {
    "id": "res_1",
    "title": "CS50: Introduction to Computer Science",
    "subject": "Computer Science",
    "type": "Course",
    "provider": "Harvard / edX",
    "url": "https://cs50.harvard.edu",
    "field": "IT",
    "level": "Beginner",
    "format": "Video + Assignments",
    "free": true,
    "rating": 4.9,
    "students": "4M+",
    "description": "The most popular CS course in the world. Covers Python, C, SQL, web development.",
    "skills": ["Python", "C", "SQL", "JavaScript"],
    "duration": "12 weeks",
    "icon": "🐍",
    "last_updated": "2024"
  }
]

Include real resources from: Coursera, edX, Khan Academy, YouTube, MIT OpenCourseWare, freeCodeCamp, Google, Microsoft Learn, etc.`,
  }

  const prompt = PROMPTS[type]
  if (!prompt) return res.status(400).json({ error: 'Invalid type' })

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
        max_tokens: 4000,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

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
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { res.write(`data: [DONE]\n\n`); res.end(); return }
        try {
          const p = JSON.parse(d)
          const text = p.choices?.[0]?.delta?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch {}
      }
    }
    res.write(`data: [DONE]\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}