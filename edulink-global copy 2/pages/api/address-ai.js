export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { hints, country } = req.body
  if (!hints) return res.status(400).json({ error: 'No hints provided' })

  try {
    // Step 1: Search OpenStreetMap Nominatim with the user's description
    const searchQuery = encodeURIComponent(`${hints} ${country || ''}`.trim())
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&addressdetails=1&limit=3&accept-language=en`,
      { headers: { 'User-Agent': 'EduLinkGlobal/1.0 (edulink@app.com)' } }
    )
    const results = await nominatimRes.json()

    if (!results || results.length === 0) {
      return res.status(200).json({
        error: 'Location not found',
        message: 'Could not find that location on the map. Try being more specific — add your city, neighbourhood, or a nearby landmark.',
        found: false,
      })
    }

    // Step 2: Take the best result
    const best = results[0]
    const addr = best.address || {}

    // Build address lines from OSM components
    const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.pedestrian || addr.suburb || ''
    const line2 = addr.suburb || addr.neighbourhood || addr.quarter || ''
    const city = addr.city || addr.town || addr.village || addr.municipality || ''
    const state = addr.state || addr.region || addr.county || ''
    const postcode = addr.postcode || ''
    const countryName = addr.country || country || ''
    const countryCode = addr.country_code?.toUpperCase() || ''

    // Format full address based on country norms
    const formatted_address = [line1, line2, city, state, postcode, countryName].filter(Boolean)
    const full_address_string = formatted_address.join('\n')

    // Country-specific format guide
    const FORMAT_GUIDES = {
      ZA: 'South Africa: House/Street, Suburb, City, Province, Postal Code',
      NG: 'Nigeria: House/Street, Area, City, State, Nigeria',
      KE: 'Kenya: House/Street, Area, City, Postal Code, Kenya',
      GH: 'Ghana: House/Street, Area, City, Region, Ghana',
      GB: 'UK: House Number Street, City, County, Postcode, United Kingdom',
      US: 'USA: Street Address, City, State Abbreviation ZIP, USA',
      CA: 'Canada: Street Address, City, Province, Postal Code, Canada',
      AU: 'Australia: Street Address, Suburb, State Abbreviation Postcode, Australia',
      IN: 'India: House/Street, Area, City, State, PIN Code, India',
      DE: 'Germany: Street Name House Number, Postal Code City, Germany',
    }

    const format_guide = FORMAT_GUIDES[countryCode] || `Standard format: Street Address, City, Region, Postal Code, Country`

    // Step 3: Use Groq to polish and format the address properly
    const groqPrompt = `Format this address data into a proper, professional postal address for a cover letter.

Raw data from OpenStreetMap:
${JSON.stringify(addr, null, 2)}

Full display name from map: ${best.display_name}

Country code: ${countryCode}
User's original description: "${hints}"

Return ONLY valid JSON:
{
  "formatted_address": ["Line 1", "Line 2", "City + State", "Postal Code", "Country"],
  "full_address_string": "Complete address as it would appear on a letter",
  "format_guide": "Brief note about address format in this country",
  "map_link": "https://www.openstreetmap.org/?mlat=${best.lat}&mlon=${best.lon}&zoom=15",
  "confidence": "high/medium/low",
  "tips": ["tip about this address or country format"]
}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.2,
        messages: [{ role: 'user', content: groqPrompt }],
      }),
    })

    const groqData = await groqRes.json()
    const text = groqData.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{'); const end = clean.lastIndexOf('}')

    let parsed = {}
    try {
      parsed = JSON.parse(clean.slice(start, end + 1))
    } catch {
      // Fallback to raw OSM data if Groq parse fails
      parsed = {
        formatted_address: formatted_address,
        full_address_string,
        format_guide,
        map_link: `https://www.openstreetmap.org/?mlat=${best.lat}&mlon=${best.lon}&zoom=15`,
        confidence: 'medium',
        tips: ['Address found on OpenStreetMap — verify the postal code if possible'],
      }
    }

    return res.status(200).json({ ...parsed, found: true, display_name: best.display_name })
  } catch (err) {
    console.error('Address AI error:', err)
    return res.status(500).json({ error: err.message, found: false })
  }
}