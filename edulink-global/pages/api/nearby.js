export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, location, field, expandGlobal } = req.body
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const locationContext = location
    ? `The user is located in ${location.city || ''}, ${location.state || ''}, ${location.country || ''} (coordinates: ${location.latitude}, ${location.longitude}).`
    : 'No location provided — generate global opportunities.'

  const PROMPTS = {
    internships: `${locationContext}

${expandGlobal ? 'The user wants to see global opportunities in addition to local ones.' : 'Focus primarily on opportunities in or near their location. Include opportunities in the same country and neighbouring countries.'}

Generate 10 realistic internship opportunities relevant to this user's location for the ${field || 'Technology'} field. Include real companies that operate in this region.

Return ONLY a JSON array:
[
  {
    "id": "nearby_1",
    "title": "Software Engineering Intern",
    "company": "Company Name",
    "location": "City, Country",
    "distance": "In your city" or "2h away" or "Same country",
    "region": "africa",
    "field": "IT",
    "type": "Full-time",
    "duration": "3 months",
    "deadline": "2025-08-30",
    "salary": "Local currency amount",
    "logo": "🏦",
    "description": "Brief description",
    "requirements": ["req1", "req2"],
    "apply_url": "https://company.com/careers",
    "isNearby": true,
    "nearby_reason": "This company has offices in your city"
  }
]`,

    universities: `${locationContext}

Generate 8 universities near this user's location that offer strong programs. Include both local universities and well-known regional ones.

Return ONLY a JSON array:
[
  {
    "id": "uni_1",
    "name": "University Name",
    "location": "City, Country",
    "distance": "In your city",
    "ranking": "Top 5 in country",
    "programs": ["Computer Science", "Engineering"],
    "tuition": "Local currency/year",
    "scholarships_available": true,
    "apply_url": "https://university.edu/apply",
    "icon": "🎓",
    "isNearby": true
  }
]`,

    scholarships: `${locationContext}

Generate 8 scholarships available to students from this location. Include both local government scholarships and international scholarships open to students from this country/region.

Return ONLY a JSON array:
[
  {
    "id": "sch_1",
    "name": "Scholarship Name",
    "provider": "Organisation",
    "amount": "Amount or fully funded",
    "for_country": "Open to students from user's country",
    "deadline": "2025-09-30",
    "field": "All fields or specific",
    "level": "Undergraduate/Postgraduate",
    "apply_url": "https://scholarship.org/apply",
    "icon": "🎓",
    "isLocal": true,
    "local_reason": "This scholarship is specifically for students from your country"
  }
]`,

    events: `${locationContext}

Generate 8 career events, job fairs, workshops, or networking events happening near this user's location in the next 3 months. Include both in-person local events and online events.

Return ONLY a JSON array:
[
  {
    "id": "evt_1",
    "title": "Event Name",
    "organizer": "Company/University",
    "date": "2025-07-15",
    "time": "10:00 AM",
    "location": "Venue or Online",
    "type": "Job Fair" | "Workshop" | "Networking" | "Webinar",
    "isOnline": false,
    "distance": "In your city",
    "free": true,
    "register_url": "https://event.com",
    "icon": "📅"
  }
]`
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
        stream: true, max_tokens: 3000, temperature: 0.4,
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