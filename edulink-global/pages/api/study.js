export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tool, content, subject, level, options, messages } = req.body
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const MATH_RULES = `
EQUATION AND MATH FORMATTING:
- Squared: x^2, Cubed: x^3
- Fractions: \\frac{num}{den}
- Square root: \\sqrt{x}
- Display math (own line): $$ equation $$
- Inline math: $ equation $
- \\times (×), \\div (÷), \\pm (±), \\leq (≤), \\geq (≥)
- Greek: \\alpha \\beta \\theta \\pi \\sigma \\omega \\Delta \\mu \\lambda
- Always show full step-by-step working with numbered steps
- Include units: e.g. 10 [N], 5 [m/s]
- Final answer on own line: **Answer: ...**
`

  const PROMPTS = {
    summarise: `You are an expert academic summariser. Summarise the following study material clearly and concisely for a university student.

${MATH_RULES}

Create a structured summary with:
## 📋 Key Points
(5-8 bullet points of the most important concepts)

## 🔑 Core Definitions
(Any key terms defined clearly)

## 💡 Important Formulas or Rules
(Mathematical formulas, laws, or rules — formatted correctly with $$ ... $$ for display math)

## 🧠 What to Remember
(2-3 sentences on the most exam-relevant takeaways)

Material to summarise:
"""
${content}
"""
Subject: ${subject || 'General'}`,

    flashcards: `Create 10 flashcard pairs from this study material. Format each as a question and answer.

${MATH_RULES}

Return ONLY a JSON array:
[
  {
    "q": "Question text — ask about a concept, formula, or fact",
    "a": "Complete answer — include formulas with proper notation where relevant"
  }
]

Use $...$ for inline math and $$...$$  for display equations in both questions and answers.

Material:
"""
${content}
"""
Subject: ${subject || 'General'}`,

    quiz: `Generate a 5-question multiple choice quiz from this material.

${MATH_RULES}

Return ONLY a JSON array:
[
  {
    "q": "Question text",
    "options": ["A) option", "B) option", "C) option", "D) option"],
    "answer": "A",
    "explanation": "Why this is correct — with full working if it involves math"
  }
]

Use proper math notation in questions and options.

Material:
"""
${content}
"""
Subject: ${subject || 'General'}`,

    examquestions: `Generate 5 exam-style questions from this material, like a real university question paper.

${MATH_RULES}

Format EXACTLY like a question paper:
## 📄 Practice Exam Questions
### Subject: ${subject || 'General'} | Marks: 50

**INSTRUCTIONS:** Answer ALL questions. Show full working for all calculations.

---

**Question 1** [10 marks]
(question here — can have sub-parts a, b, c)

**Question 2** [10 marks]
...etc

Then after all questions, add:
## ✅ Model Answers

**Question 1 — Model Answer:**
(full answer with working shown step by step)

...etc

Material:
"""
${content}
"""`,

    mindmap: `Create a detailed text-based mind map of this material.

Format as a hierarchical structure:

## 🗺️ Mind Map: ${subject || 'Topic'}

**🔵 Central Topic**
├── **Branch 1: [Main concept]**
│   ├── Sub-point 1
│   ├── Sub-point 2 — include formula if relevant: $formula$
│   └── Sub-point 3
├── **Branch 2: [Main concept]**
│   ├── Sub-point 1
│   └── Sub-point 2
├── **Branch 3: [Main concept]**
│   └── Sub-points...
└── **Branch 4: [Main concept]**
    └── Sub-points...

## 🔗 Key Connections
(How the branches relate to each other)

Material:
"""
${content}
"""`,

    timeline: `Create a clear timeline or sequence of steps/events from this material.

Format as:

## ⏱️ Timeline / Sequence

| Step | Event / Stage | Key Details |
|------|--------------|-------------|
| 1 | ... | ... |
| 2 | ... | ... |

Or if it's a process, use numbered flow:

**Step 1 →** Description
**Step 2 →** Description (formula if applicable: $formula$)
...

## 📌 Key Dates / Values
(Any important numbers, dates, or thresholds)

Material:
"""
${content}
"""`,

    glossary: `Create a comprehensive glossary from this study material.

${MATH_RULES}

Format as:

## 📖 Glossary of Key Terms

**[Term 1]**
Definition: Clear explanation in plain language
Formula (if applicable): $$formula$$
Example: ...

**[Term 2]**
Definition: ...

(Continue for all key terms found in the material)

## 🔢 Key Formulas Reference
(List all formulas found, formatted with $$ ... $$)

Material:
"""
${content}
"""`,

    chat: `You are an expert academic AI tutor. Help the student with their question about: ${subject || 'their subject'}.

${MATH_RULES}

Rules:
- Answer completely and accurately
- Show full step-by-step working for any calculations
- Format equations properly using the math notation above
- Give model answers for exam questions
- Be encouraging and clear`,
  }

  const prompt = PROMPTS[tool] || PROMPTS.chat
  const useMessages = tool === 'chat' && messages?.length
    ? [{ role: 'system', content: PROMPTS.chat }, ...messages]
    : [{ role: 'user', content: prompt }]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 4000,
        temperature: 0.3,
        messages: useMessages,
      }),
    })

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: `Groq error: ${response.status}` })}\n\n`)
      res.end()
      return
    }

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
        if (d === '[DONE]') { res.write('data: [DONE]\n\n'); res.end(); return }
        try {
          const p = JSON.parse(d)
          const text = p.choices?.[0]?.delta?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Study API error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}