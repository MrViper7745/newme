// pages/api/essay-evaluate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { essay, prompt, subject } = req.body
  if (!essay) return res.status(400).json({ error: 'essay required' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1500, messages: [{ role: 'user', content: `Evaluate this ${subject || 'academic'} essay${prompt ? ` written in response to: "${prompt}"` : ''}. Essay: "${essay.slice(0, 3000)}". Return JSON: {"overall_score":75,"max_score":100,"criteria":{"argument":{"score":80,"feedback":"..."},"evidence":{"score":70,"feedback":"..."},"structure":{"score":75,"feedback":"..."},"language":{"score":80,"feedback":"..."}},"strengths":["..."],"improvements":["..."],"model_paragraph":"...","overall_feedback":"..."}` }] })
    })
    const d = await r.json()
    const content = d.choices?.[0]?.message?.content || ''
    const clean = content.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    return res.status(200).json(JSON.parse(clean.slice(s, e + 1)))
  } catch (err) { return res.status(500).json({ error: err.message }) }
}