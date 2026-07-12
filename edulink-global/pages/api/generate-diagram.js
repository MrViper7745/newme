export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { topic, context } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })

  const prompt = `Create a simple, clear SVG diagram explaining: "${topic}"

${context ? `Context: ${context.slice(0, 1500)}` : ''}

Requirements:
- Return ONLY raw SVG code, starting with <svg and ending with </svg>
- viewBox="0 0 700 450"
- Use a dark background rect fill="#1a1a2e" covering the full viewBox first
- Use light text colors (#e2e8f0 for labels, #60a5fa for highlights, #10b981 for correct/positive, #ef4444 for important warnings)
- Keep it clean and educational — boxes, arrows, labels, simple shapes
- Use <text> elements with font-family="Arial, sans-serif" for ALL labels, font-size 12-16px
- If it's a process/flow, use boxes connected by arrows (use <line> or <path> with marker-end for arrowheads, define a <defs><marker> for arrowheads)
- If it's a circuit, science diagram, or structure, draw simplified shapes that represent it clearly with labels
- If it's a graph/chart concept, draw axes with labels and a simple curve/bars
- No external images, no <image> tags, pure vector shapes and text only
- Title at the top in larger bold text (18-20px)
- Do NOT include any explanation text outside the SVG — ONLY the SVG code itself`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    })

    const data = await groqRes.json()
    let svg = data.choices?.[0]?.message?.content || ''

    // Clean up — extract just the SVG tag in case AI added explanation text
    svg = svg.replace(/```svg|```xml|```html|```/g, '').trim()
    const start = svg.indexOf('<svg')
    const end = svg.lastIndexOf('</svg>')
    if (start === -1 || end === -1) {
      return res.status(200).json({ svg: null, error: 'Could not generate a valid diagram' })
    }
    svg = svg.slice(start, end + 6)

    return res.status(200).json({ svg })
  } catch (e) {
    console.error('Diagram generation failed:', e)
    return res.status(500).json({ svg: null, error: e.message })
  }
}