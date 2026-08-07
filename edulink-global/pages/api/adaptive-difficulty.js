// pages/api/adaptive-difficulty.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { user_id, subject } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  const { data: attempts } = await supabase.from('challenge_attempts').select('percentage,passed').eq('user_id', user_id).order('completed_at', { ascending: false }).limit(10)
  if (!attempts?.length) return res.status(200).json({ recommended_difficulty: 'medium', confidence: 'low' })
  const avg = attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length
  const passRate = attempts.filter(a => a.passed).length / attempts.length
  let difficulty = 'medium'
  if (avg >= 85 && passRate >= 0.8) difficulty = 'hard'
  else if (avg >= 90 && passRate >= 0.9) difficulty = 'expert'
  else if (avg < 55 || passRate < 0.4) difficulty = 'easy'
  return res.status(200).json({ recommended_difficulty: difficulty, avg_score: Math.round(avg), pass_rate: Math.round(passRate * 100), based_on: attempts.length })
}