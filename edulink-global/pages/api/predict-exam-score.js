// pages/api/predict-exam-score.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { user_id, module_name } = req.body
  if (!user_id || !module_name) return res.status(400).json({ error: 'Missing fields' })
  const [practiceRes, weakRes, sessRes] = await Promise.all([
    supabase.from('practice_attempts').select('percentage').eq('user_id', user_id).eq('completed', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('weak_topics').select('topic,occurrence_count').eq('user_id', user_id).eq('resolved', false).limit(5),
    supabase.from('study_sessions').select('completed').eq('user_id', user_id).eq('module_name', module_name).limit(20),
  ])
  const scores = (practiceRes.data || []).map(p => p.percentage || 0)
  const avgScore = scores.length ? scores.reduce((s, p) => s + p, 0) / scores.length : 50
  const sessions = sessRes.data || []
  const completionRate = sessions.length ? sessions.filter(s => s.completed).length / sessions.length : 0
  const weakPenalty = Math.min((weakRes.data || []).length * 3, 15)
  const sessionBonus = completionRate * 10
  const predicted = Math.min(100, Math.max(0, Math.round(avgScore - weakPenalty + sessionBonus)))
  const low = Math.max(0, predicted - 8)
  const high = Math.min(100, predicted + 8)
  return res.status(200).json({ predicted, range: { low, high }, weak_topics: weakRes.data || [], sessions_completed: sessions.filter(s => s.completed).length, based_on_scores: scores.length })
}