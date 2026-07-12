const pdfParse = require('pdf-parse')
const formidable = require('formidable')
const fs = require('fs')

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message })

    const file = files.file?.[0] || files.file
    if (!file) return res.status(400).json({ error: 'No file provided' })

    try {
      const buffer = fs.readFileSync(file.filepath)
      const data = await pdfParse(buffer)
      const text = (data.text || '').trim()
      if (text.length < 10) return res.status(200).json({ text: null, pages: data.numpages, error: 'Scanned PDF — no text layer' })
      return res.status(200).json({ text: text.slice(0, 15000), pages: data.numpages })
    } catch (e) {
      return res.status(200).json({ text: null, error: e.message })
    }
  })
}