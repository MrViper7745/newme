async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { question, student_answer, document_context } = req.body

  const prompt = `You are marking a university exam answer.

Question: "${question}"
Student's answer: "${student_answer}"
${document_context ? `Document context (for reference, may include the mark scheme or related content):\n${document_context.slice(0, 3000)}` : ''}

Mark this answer like a university examiner. Return JSON ONLY:
{
  "score": 0-100,
  "correct_answer": "the full correct answer with working",
  "feedback": "specific feedback on what was right/wrong (2-3 sentences)",
  "marks_breakdown": "brief note on where marks were gained/lost"
}`

  try {
    const result = await callGroq(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    const parsed = JSON.parse(clean.slice(s, e + 1))
    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}