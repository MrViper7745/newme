// pages/api/case-study-evaluate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { case_study, student_answer, rubric } = req.body
  if (!case_study || !student_answer) return res.status(400).json({ error: 'Missing fields' })
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1200, messages: [{ role: 'user', content: `Evaluate this case study response. Case: "${case_study.slice(0, 1000)}". Student answer: "${student_answer.slice(0, 2000)}". ${rubric ? `Rubric: ${rubric}` : ''}. Return JSON: {"score":85,"max_score":100,"grade":"B+","strengths":["..."],"improvements":["..."],"model_answer":"...","feedback":"..."}` }] })
    })
    const d = await r.json()
    const content = d.choices?.[0]?.message?.content || ''
    const clean = content.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    return res.status(200).json(JSON.parse(clean.slice(s, e + 1)))
  } catch (err) { return res.status(500).json({ error: err.message }) }
}