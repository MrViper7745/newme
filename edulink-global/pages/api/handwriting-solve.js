// pages/api/handwriting-solve.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { image_base64, media_type = 'image/png' } = req.body
  if (!image_base64) return res.status(400).json({ error: 'image_base64 required' })
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${media_type};base64,${image_base64}` } },
          { type: 'text', text: 'This is handwritten work. 1) Identify what is written, 2) If it is a math problem solve it with full step-by-step working, 3) Show the final answer clearly boxed. If not math, explain what you see.' }
        ]}],
        stream: true, max_tokens: 1500,
      })
    })
    const reader = groqRes.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue
        const d = t.slice(5).trim(); if (d === '[DONE]') { res.write('data: [DONE]\n\n'); return res.end() }
        try { const p = JSON.parse(d); const text = p.choices?.[0]?.delta?.content; if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`) } catch {}
      }
    }
  } catch (err) { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`) }
  res.end()
}