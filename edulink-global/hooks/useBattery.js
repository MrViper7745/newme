import { useState, useEffect } from 'react'

export default function useBattery() {
  const [level, setLevel] = useState(100)
  const [charging, setCharging] = useState(true)
  const [low, setLow] = useState(false)

  useEffect(() => {
    if (!('getBattery' in navigator)) return
    navigator.getBattery().then(bat => {
      const update = () => {
        setLevel(Math.round(bat.level * 100))
        setCharging(bat.charging)
        setLow(bat.level < 0.2 && !bat.charging)
      }
      update()
      bat.addEventListener('levelchange', update)
      bat.addEventListener('chargingchange', update)
    }).catch(() => {})
  }, [])

  return { level, charging, low }
}