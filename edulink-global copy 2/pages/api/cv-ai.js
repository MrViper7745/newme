export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, data } = req.body

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const PROMPTS = {
    guide_step: `You are a friendly, encouraging CV coach helping someone who has never written a CV before. They are on step: "${data.step}".

Their info so far: ${JSON.stringify(data.info || {})}

Give them:
1. A warm, simple explanation of what this step means and WHY it matters to employers
2. 2-3 specific tips for this section
3. A concrete example tailored to their field (${data.field || 'general'}) and country (${data.country || 'global'})
4. One common mistake to avoid

Keep it conversational, encouraging, and simple. No jargon. Max 200 words.`,

    improve_text: `You are a professional CV writer. Improve this CV text to be more professional, impactful, and ATS-friendly.

Section: ${data.section}
Original text: ${data.text}
Field: ${data.field || 'general'}
Country: ${data.country || 'global'}
Experience level: ${data.level || 'student/entry-level'}

Return ONLY the improved text, no explanation. Make it:
- Start with strong action verbs
- Include specific, quantifiable achievements where possible
- Be concise and impactful
- Use keywords relevant to ${data.field || 'the industry'}`,

    generate_summary: `Write a professional CV personal statement/summary for:
Name: ${data.name}
Field: ${data.field}
Institution: ${data.institution}
Year: ${data.year}
Skills: ${(data.skills || []).join(', ')}
Country: ${data.country}
Career goal: ${data.goal || 'internship and career opportunities'}
Experience: ${data.experience || 'limited, mainly academic'}

Write 3-4 impactful sentences. Start with who they are, mention key skills, and end with what they bring to employers. Make it confident but authentic. Return only the summary text.`,

    ats_check: `You are an ATS (Applicant Tracking System) expert. Analyse this CV data and give actionable feedback.

CV Data: ${JSON.stringify(data.cv)}
Target role: ${data.targetRole || 'general internship'}
Target country: ${data.country || 'global'}

Return a JSON object like:
{
  "score": 72,
  "grade": "B",
  "strengths": ["strength 1", "strength 2"],
  "improvements": [
    { "section": "Summary", "issue": "Too vague", "fix": "Add specific skills and metrics" }
  ],
  "keywords_missing": ["keyword1", "keyword2"],
  "ready": false,
  "verdict": "Your CV needs a few tweaks before applying"
}`,

    cover_letter_improve: `You are an expert cover letter writer. The user has a draft cover letter. Improve it significantly.

Original: ${data.original}
Company: ${data.company}
Role: ${data.role}
Candidate name: ${data.name}
Field: ${data.field}
Country: ${data.country}

Make it:
- More compelling and personalized
- Show genuine enthusiasm for THIS company
- Highlight the most relevant skills
- Have a strong opening hook
- End with a confident call to action
- Sound human, not robotic

Return ONLY the improved cover letter text.`,

   cover_quick: data.prompt || `Write a complete, professional cover letter for:
Name: ${data.name || 'the candidate'}
Applying for: ${data.role} at ${data.company}
Field: ${data.field || 'general'}
Skills: ${(data.skills || []).join(', ')}
Education: ${data.education || 'university student'}
Bio: ${data.bio || ''}
${data.jobDescription ? `Job description: ${data.jobDescription}` : ''}
Tone: ${data.tone || 'professional'}
Sign-off: ${data.signOff || 'Yours sincerely,'}

Write 4 paragraphs. Return only the letter text.`,
 
job_recommendations: `You are a career advisor. Based on this student/professional's CV data, recommend the 6 best job positions they should apply for RIGHT NOW.

CV Data:
- Skills: ${(data.skills || []).join(', ')}
- Field: ${data.field || 'general'}
- Country: ${data.country || 'global'}
- Education: ${data.education || 'not specified'}
- Experience entries: ${data.experience || 0}
- Summary: ${data.summary || 'not provided'}

Return ONLY a JSON array:
[
  {
    "title": "Junior Software Engineer",
    "company_type": "Tech startups, banks, telecoms",
    "reason": "Your Python and React skills directly match this role",
    "match": 92,
    "salary": "$800–1200/mo",
    "how_to_find": "LinkedIn, Glassdoor, company websites"
  }
]

Give realistic, specific roles matched to their actual skills and experience level. Be honest about the match percentage.`,

}

  const prompt = PROMPTS[type]
  if (!prompt) return res.status(400).json({ error: 'Invalid type' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 1000,
        temperature: 0.6,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim()
        if (d === '[DONE]') { res.write(`data: [DONE]\n\n`); res.end(); return }
        try {
          const p = JSON.parse(d)
          const text = p.choices?.[0]?.delta?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch {}
      }
    }
    res.write(`data: [DONE]\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}