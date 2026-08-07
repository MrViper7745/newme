// pages/api/cohort-compare.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  const { data: profile } = await supabase.from('profiles').select('field,year_of_study').eq('id', user_id).single()
  const { data: myStats } = await supabase.from('student_wallet').select('points,total_earned').eq('user_id', user_id).single()
  const { data: cohort } = await supabase.from('profiles').select('id').eq('field', profile?.field || '').eq('year_of_study', profile?.year_of_study || '')
  if (!cohort?.length) return res.status(200).json({ percentile: null, cohort_size: 0 })
  const cohortIds = cohort.map(c => c.id)
  const { data: cohortWallets } = await supabase.from('student_wallet').select('points').in('user_id', cohortIds)
  const myPoints = myStats?.points || 0
  const allPoints = (cohortWallets || []).map(w => w.points || 0).sort((a, b) => a - b)
  const rank = allPoints.filter(p => p < myPoints).length
  const percentile = Math.round((rank / allPoints.length) * 100)
  return res.status(200).json({ percentile, cohort_size: allPoints.length, my_points: myPoints, avg_points: Math.round(allPoints.reduce((s, p) => s + p, 0) / allPoints.length) })
}