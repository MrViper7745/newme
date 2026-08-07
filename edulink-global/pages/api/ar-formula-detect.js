// pages/api/ar-formula-detect.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { image_base64, media_type = 'image/jpeg' } = req.body
  if (!image_base64) return res.status(400).json({ error: 'image_base64 required' })
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${media_type};base64,${image_base64}` } },
          { type: 'text', text: 'Identify all mathematical formulas, equations, and scientific notation in this image. For each: 1) State the formula name, 2) Explain variables, 3) Give a worked example. Be concise.' }
        ]}],
        max_tokens: 1000,
      })
    })
    const data = await groqRes.json()
    return res.status(200).json({ result: data.choices?.[0]?.message?.content || '' })
  } catch (err) { return res.status(500).json({ error: err.message }) }
}