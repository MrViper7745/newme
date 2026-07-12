async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 60,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { message, module } = req.body

  const prompt = `A student said this in a study session: "${message}"
${module ? `Module: ${module}` : ''}

In 3-6 words, name the SPECIFIC academic topic or concept they're struggling with (not the module name, the actual concept). Examples: "Newton's second law", "Recursion in linked lists", "Laplace transforms", "Bending moment diagrams".

Reply with ONLY the topic name, nothing else.`

  try {
    const topic = await callGroq(prompt)
    return res.status(200).json({ topic: topic.replace(/["'.]/g, '') })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}