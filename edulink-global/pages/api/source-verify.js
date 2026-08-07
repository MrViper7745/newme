// pages/api/source-verify.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { claim, source } = req.body
  if (!claim) return res.status(400).json({ error: 'claim required' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 400, messages: [{ role: 'user', content: `Evaluate this academic claim: "${claim}"${source ? ` Source: "${source}"` : ''}. Return JSON: {"credibility":"high|medium|low|unverifiable","explanation":"...","suggested_sources":["..."],"red_flags":["..."]}` }] })
    })
    const d = await r.json()
    const content = d.choices?.[0]?.message?.content || ''
    const clean = content.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    return res.status(200).json(JSON.parse(clean.slice(s, e + 1)))
  } catch (err) { return res.status(500).json({ error: err.message }) }
}