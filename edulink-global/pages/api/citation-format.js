// pages/api/citation-format.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { source, style = 'APA' } = req.body
  if (!source) return res.status(400).json({ error: 'source required' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 300, messages: [{ role: 'user', content: `Format this source as a ${style} citation. Source info: "${source}". Return ONLY the formatted citation, nothing else. If information is missing make reasonable assumptions and note them in brackets.` }] })
    })
    const d = await r.json()
    return res.status(200).json({ citation: d.choices?.[0]?.message?.content?.trim() || '', style })
  } catch (err) { return res.status(500).json({ error: err.message }) }
}