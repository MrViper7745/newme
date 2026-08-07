// pages/api/generate-memory-palace.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { topic, items_count = 6 } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1000, messages: [{ role: 'user', content: `Create a memory palace for "${topic}". Return JSON only: {"palace_name":"...","rooms":[{"name":"...","emoji":"...","item":{"label":"concept name","content":"the detail to remember","vivid_image":"a memorable mental image to help recall"}}]}. Include ${items_count} rooms.` }] })
    })
    const d = await r.json()
    const text = d.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    return res.status(200).json(JSON.parse(clean.slice(s, e + 1)))
  } catch (err) { return res.status(500).json({ error: err.message }) }
}