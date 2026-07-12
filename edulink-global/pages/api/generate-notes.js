import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { file_id, user_id } = req.body
  if (!file_id || !user_id) return res.status(400).json({ error: 'file_id and user_id required' })

  const { data: file, error } = await supabase
    .from('library_files')
    .select('*')
    .eq('id', file_id)
    .eq('user_id', user_id)
    .single()

  if (error || !file) return res.status(404).json({ error: 'File not found' })
  if (!file.content_text) return res.status(400).json({ error: 'This file has no extracted text yet. Open it in the Library first.' })

  const prompt = `Create comprehensive, exam-ready study notes from this document.

Document: "${file.title || file.name}"
Type: ${file.label || 'Academic document'}

Content:
"""
${file.content_text.slice(0, 10000)}
"""

Format exactly as:

# 📚 Study Notes: ${file.title || file.name}

## 📋 Overview
(2-3 sentences — what this covers and why it matters)

## 🔑 Key Definitions
**[Term]:** Clear exam-ready definition
(list ALL important terms found)

## 📐 Formulas & Laws
$$formula$$
- Meaning: ...
- When to use: ...
- Variables: ...
(list ALL formulas with proper notation)

## 📝 Core Concepts
### [Concept Name]
Clear explanation with examples

## 💡 Worked Examples
(step-by-step solutions based on document content)

## ⚠️ Common Mistakes
- Mistake and how to avoid it

## 🎯 Exam Tips
- Specific tip
- Specific tip

## 🔄 Quick Revision Summary
- Most important point 1
- Most important point 2
(5-8 bullet points — the things most likely to appear in an exam)

Use math notation: x^2 for squared, \\frac{a}{b} for fractions, $$ for display equations.`

  try {
    const notes = await callGroq(prompt)
    return res.status(200).json({ notes, title: file.title || file.name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}