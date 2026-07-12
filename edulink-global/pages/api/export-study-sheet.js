import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2500,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id, file_id } = req.body
  if (!user_id || !file_id) return res.status(400).json({ error: 'user_id and file_id required' })

  const { data: session } = await supabase
    .from('library_sessions')
    .select('*')
    .eq('user_id', user_id)
    .eq('file_id', file_id)
    .single()

  if (!session?.messages?.length) return res.status(404).json({ error: 'No session found' })

  const transcript = session.messages.map(m => `${m.role === 'user' ? 'STUDENT ASKED' : 'TUTOR EXPLAINED'}: ${m.content}`).join('\n\n')

  const prompt = `Turn this tutoring conversation into a clean revision study sheet in Markdown.

Document: "${session.file_title}"

Conversation:
${transcript.slice(0, 8000)}

Format as:
# Study Sheet: ${session.file_title}

## Key Concepts Covered
(bullet list)

## Worked Examples
(any full solutions discussed, with working shown)

## Quick Reference
(formulas, definitions, key facts as a bullet list)

Keep it concise and exam-focused. Only include genuinely useful study content — skip greetings and small talk.`

  try {
    const sheet = await callGroq(prompt)
    return res.status(200).json({ markdown: sheet, title: session.file_title })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}