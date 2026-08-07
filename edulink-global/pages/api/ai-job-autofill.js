export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { job_description, cv_data } = req.body
  if (!job_description) return res.status(400).json({ error: 'job_description required' })

  const prompt = `You are a career coach helping a student tailor their CV to a specific job.

JOB DESCRIPTION:
"""
${job_description.slice(0, 3000)}
"""

STUDENT'S CV DATA:
"""
${JSON.stringify(cv_data || {}, null, 2).slice(0, 2000)}
"""

Analyse the job description and the student's CV. Return JSON ONLY:
{
  "job_title": "The role title",
  "company": "Company name if mentioned",
  "key_requirements": ["requirement 1", "requirement 2", "requirement 3", "requirement 4", "requirement 5"],
  "matched_skills": ["student skill that matches", "another match"],
  "missing_skills": ["skill gap 1", "skill gap 2"],
  "tailored_summary": "A 3-sentence professional summary tailored specifically to this role, written in first person, incorporating the student's background and this job's requirements",
  "keywords_to_add": ["keyword", "keyword"],
  "cover_letter_hook": "A compelling opening sentence for a cover letter for this specific role",
  "suggestions": ["Specific suggestion to strengthen this application", "Another suggestion"]
}`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1000 }),
    })
    const data = await groqRes.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}')
    const result = JSON.parse(clean.slice(s, e + 1))
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}