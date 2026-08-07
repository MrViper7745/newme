// pages/api/voice-room-token.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // WebRTC voice rooms use peer-to-peer via simple-peer
  // No token needed for basic WebRTC — this endpoint returns ICE server config
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
  return res.status(200).json({ iceServers, timestamp: Date.now() })
}