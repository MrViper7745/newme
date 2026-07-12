export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, userLocation } = req.body
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const systemPrompt = `You are a friendly, conversational AI address assistant for EduLink Global. Your job is to help users find and format their exact address through natural conversation.

${userLocation ? `The user's detected location is near: ${userLocation.city}, ${userLocation.country} (${userLocation.latitude}, ${userLocation.longitude})` : ''}

Your conversation flow:
1. Greet warmly and ask them to describe their location in any way they know — landmark, area name, street, nearby shop, anything
2. Ask follow-up questions to gather: street/road name, area/neighbourhood, city/town, postal code (if they know it), country
3. As they give info, try to piece together the address. Ask for any missing key details
4. Once you have enough, say "Let me search the map for that address" and output a JSON block formatted EXACTLY like this on its own line:
   SEARCH_ADDRESS:{"query":"full address to search","city":"city","country":"country","hints":"all details the user gave"}
5. After outputting the search, confirm what you found and ask if it looks correct

Rules:
- Be warm, patient, and encouraging — many users don't know their full postal address
- Accept any language clues (landmarks, nearby shops, neighborhood names)
- Ask one question at a time, never overwhelm them
- If they seem stuck, give examples: "You can say something like 'near Shoprite in Lagos Island' or 'on Main Road in Sandton'"
- Always confirm before finalizing
- For African addresses especially, be flexible — landmarks and areas are more common than street numbers`

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
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
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