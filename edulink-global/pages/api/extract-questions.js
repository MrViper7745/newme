async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { content_text, title } = req.body
  if (!content_text) return res.status(400).json({ error: 'content_text required' })

  const prompt = `Extract the individual exam questions from this document text. Document: "${title}"

Document text:
"""
${content_text.slice(0, 10000)}
"""

Return JSON ONLY — an array of up to 8 distinct questions found in this document:
[
  {"number": "1", "question": "full question text as written"},
  {"number": "2", "question": "full question text as written"}
]

If this isn't an exam paper with distinct numbered questions, extract the main topics/problems as if they were questions instead. Keep question text under 200 words each.`

  try {
    const result = await callGroq(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('['); const e = clean.lastIndexOf(']')
    const questions = JSON.parse(clean.slice(s, e + 1))
    return res.status(200).json({ questions })
  } catch (e) {
    return res.status(500).json({ error: e.message, questions: [] })
  }
}