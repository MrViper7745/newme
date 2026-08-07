import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { group_id, user_id } = req.body
  if (!group_id || !user_id) return res.status(400).json({ error: 'group_id and user_id required' })

  // Get last 60 messages from the group
  const { data: messages } = await supabase.from('group_messages').select('content, display_name, message_type')
    .eq('group_id', group_id).neq('message_type', 'system').order('created_at', { ascending: false }).limit(60)

  if (!messages?.length) return res.status(400).json({ error: 'No messages found in this group' })

  const { data: group } = await supabase.from('group_chats').select('name, subject').eq('id', group_id).single()

  const conversation = messages.reverse().map(m => `${m.display_name}: ${m.content}`).join('\n')

  const prompt = `You are an AI study assistant. Analyse this group study chat and extract key concepts into flashcards.

Group: "${group?.name}" — Subject: "${group?.subject || 'General'}"

Chat history:
"""
${conversation.slice(0, 6000)}
"""

Extract 8-12 key concepts, definitions, formulas, or facts that were discussed. 
Return JSON ONLY:
{
  "topic": "Main topic of discussion",
  "flashcards": [
    {
      "question": "Clear, specific question",
      "answer": "Concise, accurate answer. Use proper notation for math.",
      "difficulty": "easy|medium|hard",
      "category": "definition|formula|concept|fact"
    }
  ]
}`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 }),
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