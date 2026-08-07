import { useState, useRef, useCallback } from 'react'

export default function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recog = useRef(null)

  const start = useCallback(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recog.current = new SR()
    recog.current.continuous = false
    recog.current.interimResults = false
    recog.current.lang = 'en-ZA'
    recog.current.onstart  = () => setListening(true)
    recog.current.onend    = () => setListening(false)
    recog.current.onerror  = () => setListening(false)
    recog.current.onresult = (e) => {
      const text = e.results[0][0].transcript
      if (onResult) onResult(text)
    }
    recog.current.start()
  }, [supported, onResult])

  const stop = useCallback(() => {
    if (recog.current) { recog.current.stop(); setListening(false) }
  }, [])

  return { listening, supported, start, stop }
}