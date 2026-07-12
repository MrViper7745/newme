const pdfParse = require('pdf-parse')
const Tesseract = require('tesseract.js')

async function ocrPdfBuffer(buffer) {
  const { pdf } = await import('pdf-to-img')
  const pages = []
  const document = await pdf(buffer, { scale: 2 })
  let pageCount = 0
  for await (const pageImage of document) {
    pageCount++
    if (pageCount > 6) break
    const result = await Tesseract.recognize(pageImage, 'eng', { logger: () => {} })
    pages.push(result.data.text)
  }
  return { text: pages.join('\n\n').trim(), pages: pageCount }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  try {
    const fileRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EduLinkBot/1.0)' },
    })

    console.log('Extract attempt for URL:', url)
    console.log('Response status:', fileRes.status)
    console.log('Content-Type:', fileRes.headers.get('content-type'))

    if (!fileRes.ok) {
      return res.status(200).json({ text: null, error: `Could not fetch file (status ${fileRes.status})` })
    }

    const contentType = fileRes.headers.get('content-type') || ''
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ── HTML page instead of PDF — try to find the real PDF link ──
    if (contentType.includes('text/html')) {
      const html = buffer.toString('utf-8')
      console.log('Got HTML page instead of PDF. First 300 chars:', html.slice(0, 300))

      const pdfLinkMatch =
        html.match(/href=["']([^"']+\.pdf[^"']*)["']/i) ||
        html.match(/href=["']([^"']*\/(?:viewdoc|download|getfile|content_id)[^"']*)["']/i)

      if (pdfLinkMatch) {
        let realUrl = pdfLinkMatch[1]
        if (realUrl.startsWith('/')) {
          const base = new URL(url)
          realUrl = `${base.protocol}//${base.host}${realUrl}`
        }
        console.log('Found embedded PDF link, retrying with:', realUrl)
        const realRes = await fetch(realUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EduLinkBot/1.0)' },
        })
        if (realRes.ok) {
          const realBuffer = Buffer.from(await realRes.arrayBuffer())
          return await tryExtractText(realBuffer, res)
        }
      }

      return res.status(200).json({
        text: null,
        error: 'This link points to a webpage (library catalog page), not a direct PDF file.',
      })
    }

    if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      return await tryExtractText(buffer, res)
    }

    return res.status(200).json({ text: null, error: `Unrecognized file type (${contentType || 'unknown'})` })
  } catch (e) {
    console.error('PDF extraction failed:', e)
    return res.status(200).json({ text: null, error: e.message })
  }
}

async function tryExtractText(buffer, res) {
  // ── ATTEMPT 1: Normal text-layer extraction with page tracking ──
  try {
    const pageTexts = []
    const data = await pdfParse(buffer, {
      pagerender: async (pageData) => {
        try {
          const textContent = await pageData.getTextContent()
          const text = textContent.items.map(item => item.str).join(' ')
          pageTexts.push(text)
          return text
        } catch {
          return ''
        }
      },
    })

    const text = (data.text || '').trim()
    if (text.length >= 50) {
      console.log('✅ Extracted via text layer:', text.length, 'chars,', pageTexts.length, 'pages tracked')
      return res.status(200).json({
        text: text.slice(0, 15000),
        pages: data.numpages,
        method: 'text',
        content_pages: pageTexts.map((t, i) => ({ page: i + 1, text: t.slice(0, 2000) })),
      })
    }
    console.log('Text layer too short (', text.length, 'chars) — falling back to OCR')
  } catch (parseErr) {
    console.log('Text parse failed, falling back to OCR:', parseErr.message)
  }

  // ── ATTEMPT 2: OCR fallback for scanned PDFs ──────────────────
  try {
    console.log('🔍 Starting OCR — this may take 10-30 seconds...')
    const ocrResult = await ocrPdfBuffer(buffer)
    if (ocrResult.text.length >= 50) {
      console.log('✅ Extracted via OCR:', ocrResult.text.length, 'chars across', ocrResult.pages, 'pages')
      return res.status(200).json({
        text: ocrResult.text.slice(0, 15000),
        pages: ocrResult.pages,
        method: 'ocr',
      })
    }
    return res.status(200).json({
      text: null,
      error: 'PDF appears to be a scanned image and OCR could not extract readable text — the scan quality may be too low.',
    })
  } catch (ocrErr) {
    console.error('OCR failed:', ocrErr.message)
    return res.status(200).json({
      text: null,
      error: 'This is a scanned PDF and automatic text recognition (OCR) failed: ' + ocrErr.message,
    })
  }
}