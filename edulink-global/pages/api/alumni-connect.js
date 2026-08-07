import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { field, institution, limit = 20 } = req.query

    let query = supabase
      .from('profiles')
      .select('id,name,username,avatar_url,field,institution,graduation_year,employer,role,bio')
      .eq('is_alumni', true)
      .eq('profile_public', true)
      .limit(parseInt(limit))

    if (field) query = query.eq('field', field)
    if (institution) query = query.eq('institution', institution)

    const { data, error } = await query.order('graduation_year', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ alumni: data || [] })
  }

  if (req.method === 'POST') {
    const { user_id, graduation_year, employer, role, advice } = req.body
    if (!user_id) return res.status(400).json({ error: 'user_id required' })

    const { error } = await supabase
      .from('profiles')
      .update({
        is_alumni: true,
        graduation_year,
        employer,
        role,
        alumni_advice: advice,
        alumni_joined_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}