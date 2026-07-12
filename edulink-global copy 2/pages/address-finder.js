import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useLocation } from '../lib/useLocation'

export default function AddressFinder() {
  const { location, requestLocation, permission } = useLocation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [mapUrl, setMapUrl] = useState(null)
  const [formattedAddress, setFormattedAddress] = useState(null)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streaming])

  const startChat = async () => {
    setStarted(true)
    setLoading(true)
    setStreaming('')

    const initMsg = location
      ? `Hello! I can see you're near ${location.city || 'your area'}, ${location.country}. Let's find your exact address. Can you describe where you are? You can mention a nearby landmark, shop, street name, or area — whatever you know!`
      : null

    if (initMsg) {
      setMessages([{ role: 'assistant', content: initMsg }])
      setLoading(false)
      return
    }

    // Ask AI to open the conversation
    await sendToAI([], true)
  }

  const sendToAI = async (msgs, isInit = false) => {
    setLoading(true)
    setStreaming('')

    const messagesToSend = isInit ? [] : msgs

    try {
      const res = await fetch('/api/address-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend, userLocation: location }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = '', fullText = ''

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
            // Check if AI wants to search
            if (fullText.includes('SEARCH_ADDRESS:')) {
              const match = fullText.match(/SEARCH_ADDRESS:(\{.*?\})/s)
              if (match) {
                try {
                  const searchData = JSON.parse(match[1])
                  await searchOnMap(searchData)
                }  catch {}
              }
              // Remove the SEARCH_ADDRESS: line from display
              fullText = fullText.replace(/SEARCH_ADDRESS:\{.*?\}/s, '').trim()
            }
            const finalMsgs = [...msgs, { role: 'assistant', content: fullText }]
            setMessages(finalMsgs)
            setStreaming('')
            setLoading(false)
            return
          }
          try {
            const p = JSON.parse(d)
            if (p.text) { fullText += p.text; setStreaming(fullText) }
          } catch {}
        }
      }
    } catch (e) {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    await sendToAI(newMessages)
  }

  const searchOnMap = async (searchData) => {
    setSearching(true)
    try {
      const query = encodeURIComponent(searchData.query)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=3&accept-language=en`,
        { headers: { 'User-Agent': 'EduLinkGlobal/1.0' } }
      )
      const results = await res.json()
      if (results && results.length > 0) {
        const best = results[0]
        const addr = best.address || {}

        const formatted = {
          line1: [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.pedestrian || addr.suburb || '',
          line2: addr.suburb || addr.neighbourhood || addr.quarter || '',
          city: addr.city || addr.town || addr.village || '',
          state: addr.state || addr.region || '',
          postcode: addr.postcode || '',
          country: addr.country || searchData.country || '',
          display: best.display_name,
          lat: best.lat,
          lon: best.lon,
        }

        setSearchResult(formatted)
        setFormattedAddress(formatted)
        setMapUrl(`https://www.openstreetmap.org/?mlat=${best.lat}&mlon=${best.lon}&zoom=16`)
      } else {
        // Add message saying we couldn't find it
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I searched the map but couldn't find an exact match. Could you give me a bit more detail? For example, the street name or a nearby well-known landmark?"
        }])
      }
    } catch { }
    setSearching(false)
  }

  const copyAddress = () => {
    if (!formattedAddress) return
    const text = [
      formattedAddress.line1,
      formattedAddress.line2,
      formattedAddress.city,
      formattedAddress.state,
      formattedAddress.postcode,
      formattedAddress.country,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    alert('📋 Address copied to clipboard!')
  }

  const QUICK_PROMPTS = [
    "I'm near a shopping mall",
    "I only know my area name",
    "I know the street but not the number",
    "I'm at a university campus",
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1000, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>🗺️ Conversational Address Finder</h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
            Chat naturally with AI to find your exact address — even if you only know landmarks or area names. The AI will guide you through the conversation and find your location on the real map.
          </p>
        </div>

        {/* Location status */}
        {permission !== 'granted' && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#fbbf24' }}>📍 Enable location for more accurate address finding</div>
            <button onClick={requestLocation} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Enable Location</button>
          </div>
        )}

        {location && (
          <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: '#10b981' }}>
            📍 Location detected: {location.city}, {location.country} — AI will focus on nearby addresses
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* Chat panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 500 }}>

            {/* Chat header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗺️</div>
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>Address AI Assistant</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Powered by AI + OpenStreetMap</div>
              </div>
              {searching && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#60a5fa' }}>🔍 Searching map...</div>}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 300, maxHeight: 460 }}>
              {!started ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>Find Your Address Through Conversation</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
                    Don't know your full address? No problem. Just tell the AI what you know — a landmark, area, nearby shop — and it will figure out the rest and find it on the real map.
                  </div>
                  <button onClick={startChat} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    🗺️ Start Finding My Address
                  </button>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, padding: '0 4px' }}>
                        {msg.role === 'user' ? 'You' : '🗺️ Address AI'}
                      </div>
                      <div style={{
                        padding: '11px 15px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)',
                        border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                        color: '#e2e8f0', fontSize: 13, lineHeight: 1.7,
                        maxWidth: '88%', whiteSpace: 'pre-wrap',
                      }}>{msg.content}</div>
                    </div>
                  ))}

                  {(loading || streaming) && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>🗺️ Address AI</div>
                      <div style={{ padding: '11px 15px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, maxWidth: '88%', whiteSpace: 'pre-wrap' }}>
                        {streaming || <span style={{ display: 'flex', gap: 5 }}>{[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}</span>}
                        {streaming && loading && <span style={{ display: 'inline-block', width: 2, height: 14, background: '#60a5fa', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.7s step-end infinite' }} />}
                      </div>
                    </div>
                  )}

                  {/* Quick prompts if no messages yet */}
                  {messages.length === 1 && !loading && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {QUICK_PROMPTS.map(q => (
                        <button key={q} onClick={() => { setInput(q); }} style={{ padding: '6px 12px', borderRadius: 14, fontSize: 11, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', color: '#94a3b8' }}>{q}</button>
                      ))}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            {started && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading) sendMessage() }} disabled={loading}
                  placeholder="Describe your location — landmark, area, street, anything you know..."
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 10, fontSize: 13, background: 'var(--surface2)', border: '1px solid rgba(124,58,237,0.4)', color: '#e2e8f0', outline: 'none' }} />
                <button onClick={sendMessage} disabled={!input.trim() || loading} style={{ padding: '11px 18px', borderRadius: 10, background: input.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'var(--surface)', color: input.trim() && !loading ? '#fff' : '#64748b', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Send ↑</button>
              </div>
            )}
          </div>

          {/* Map & Result panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Map preview */}
            {formattedAddress ? (
              <>
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14, marginBottom: 2 }}>📍 Address Found on Map!</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Source: OpenStreetMap</div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    {/* Address lines */}
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 2, marginBottom: 14 }}>
                      {formattedAddress.line1 && <div>{formattedAddress.line1}</div>}
                      {formattedAddress.line2 && <div>{formattedAddress.line2}</div>}
                      {formattedAddress.city && <div>{formattedAddress.city}</div>}
                      {formattedAddress.state && <div>{formattedAddress.state}</div>}
                      {formattedAddress.postcode && <div>{formattedAddress.postcode}</div>}
                      {formattedAddress.country && <div>{formattedAddress.country}</div>}
                    </div>

                    {/* Coordinates */}
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
                      📐 {parseFloat(formattedAddress.lat).toFixed(6)}, {parseFloat(formattedAddress.lon).toFixed(6)}
                    </div>

                    {/* Map embed */}
                    {formattedAddress.lat && (
                      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
                        <iframe
                          title="map"
                          width="100%"
                          height="200"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formattedAddress.lon)-0.01},${parseFloat(formattedAddress.lat)-0.01},${parseFloat(formattedAddress.lon)+0.01},${parseFloat(formattedAddress.lat)+0.01}&layer=mapnik&marker=${formattedAddress.lat},${formattedAddress.lon}`}
                          style={{ border: 'none', display: 'block' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={copyAddress} style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📋 Copy Address</button>
                      {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>🗺️ Open Map</a>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Map will appear here</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>Chat with the AI and it will find and pin your location on the real map automatically.</div>
              </div>
            )}

            {/* Tips */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 12 }}>💡 What You Can Say</div>
              {[
                '"I\'m near the Shoprite on Victoria Island, Lagos"',
                '"My street is Kenyatta Avenue, Nairobi, near the city centre"',
                '"I live in Sandton, Johannesburg, near the mall"',
                '"I\'m at the University of Ghana main campus"',
                '"123 Oxford Street, London, W1D 1BS"',
              ].map((tip, i) => (
                <div key={i} style={{ fontSize: 12, color: '#94a3b8', padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', lineHeight: 1.5, fontStyle: 'italic' }}>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}} @keyframes blink{50%{opacity:0}}`}</style>
    </div>
  )
}