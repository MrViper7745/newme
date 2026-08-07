// pages/api/plagiarism-check.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1000, messages: [{ role: 'user', content: `Analyse this student text for potential academic integrity issues. Look for: 1) Passages that sound unusually formal or different in style, 2) Common knowledge presented without citation, 3) Specific claims that need sources. Return JSON: {"risk_level":"low|medium|high","flagged_passages":[{"text":"...","reason":"...","suggestion":"..."}],"overall_feedback":"...","originality_tips":["..."]}. Text: "${text.slice(0, 3000)}"` }] })
    })
    const d = await r.json()
    const content = d.choices?.[0]?.message?.content || ''
    const clean = content.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    return res.status(200).json(JSON.parse(clean.slice(s, e + 1)))
  } catch (err) { return res.status(500).json({ error: err.message }) }
}