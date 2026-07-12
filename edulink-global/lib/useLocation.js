import { useState, useEffect } from 'react'

export function useLocation() {
  const [location, setLocation] = useState(null)
  const [country, setCountry] = useState(null)
  const [city, setCity] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState('unknown') // unknown | granted | denied

  useEffect(() => {
    // Check if we already have stored location
    const stored = localStorage.getItem('edulink_location')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setLocation(parsed)
        setCountry(parsed.country)
        setCity(parsed.city)
        setPermission('granted')
      } catch {}
    }
  }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        try {
          // Reverse geocode using OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'EduLinkGlobal/1.0' } }
          )
          const data = await res.json()
          const addr = data.address || {}

          const locationData = {
            latitude,
            longitude,
            country: addr.country || '',
            country_code: (addr.country_code || '').toUpperCase(),
            city: addr.city || addr.town || addr.village || addr.municipality || '',
            state: addr.state || addr.region || '',
            postcode: addr.postcode || '',
            display_name: data.display_name || '',
            timestamp: Date.now(),
          }

          setLocation(locationData)
          setCountry(locationData.country)
          setCity(locationData.city)
          setPermission('granted')
          localStorage.setItem('edulink_location', JSON.stringify(locationData))
        } catch {
          // Use coordinates even if reverse geocode fails
          const fallback = { latitude, longitude, country: '', city: '', timestamp: Date.now() }
          setLocation(fallback)
          setPermission('granted')
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setPermission('denied')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  const clearLocation = () => {
    localStorage.removeItem('edulink_location')
    setLocation(null)
    setCountry(null)
    setCity(null)
    setPermission('unknown')
  }

  return { location, country, city, loading, error, permission, requestLocation, clearLocation }
}