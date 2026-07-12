export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const MATH_AND_FORMAT_RULES = `
EQUATION AND MATH FORMATTING — follow these rules exactly so your answers look like a proper question paper:
- Squared: write x^2 (renders as x²), cubed: x^3
- Fractions: write \\frac{numerator}{denominator}
- Square root: write \\sqrt{x}
- Display equations (on their own line): wrap in $$ ... $$
- Inline math: wrap in $ ... $
- Multiplication: \\times (×), Division: \\div (÷), Plus-minus: \\pm (±)
- Less/greater equal: \\leq (≤), \\geq (≥), Not equal: \\neq (≠)
- Greek letters: \\alpha (α), \\beta (β), \\theta (θ), \\pi (π), \\sigma (σ), \\omega (ω), \\Delta (Δ), \\mu (μ), \\lambda (λ)
- Integrals: \\int, Summation: \\sum, Infinity: \\infty
- Arrows: \\rightarrow (→), \\Rightarrow (⇒)

STEP-BY-STEP WORKING — always show full working:
- Label every step: "**Step 1:** ...", "**Step 2:** ..."
- Show substitution: write the formula first, then substitute values
- Include units in square brackets: e.g. F = ma = 5 × 2 = 10 [N]
- Put the final answer on its own line: "**Answer: ...**"

GENERAL FORMATTING:
- Use **bold** for key terms, answers, and important values
- Use ## for main section headings, ### for sub-headings
- Use numbered lists for steps, bullet points for options/lists
- Keep explanations clear — write as if explaining to a university student
- Never write equations in words when you can use symbols (write x^2, never "x squared")
`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Inject math rules into the system message if one exists, or prepend as system
  const hasSystem = messages[0]?.role === 'system'
  const finalMessages = hasSystem
    ? [{ role: 'system', content: messages[0].content + '\n\n' + MATH_AND_FORMAT_RULES }, ...messages.slice(1)]
    : [{ role: 'system', content: MATH_AND_FORMAT_RULES }, ...messages]

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
        messages: finalMessages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      res.write(`data: ${JSON.stringify({ error: `Groq API error: ${response.status}` })}\n\n`)
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
        if (d === '[DONE]') {
          res.write('data: [DONE]\n\n')
          res.end()
          return
        }
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
    console.error('Chat API error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}