import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Allow extension to fetch user profile
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ error: 'user_id required' })

    const { data, error } = await supabase
      .from('profiles')
      .select('name, email, field, institution, skills, country')
      .eq('id', user_id)
      .single()

    if (error) return res.status(404).json({ error: 'Profile not found' })

    // Also get their modules from timetable
    const { data: timetableData } = await supabase
      .from('timetable')
      .select('subject')
      .eq('user_id', user_id)

    const modules = [...new Set((timetableData || []).map(t => t.subject))]

    return res.status(200).json({
      ...data,
      modules: modules.length > 0 ? modules : (data.skills || []),
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}