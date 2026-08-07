import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  // Get the requesting user's profile and weak topics
  const [profileRes, weakRes] = await Promise.all([
    supabase.from('profiles').select('field, institution, year_of_study').eq('id', user_id).single(),
    supabase.from('weak_topics').select('topic').eq('user_id', user_id).limit(5),
  ])

  const profile = profileRes.data
  const weakTopics = (weakRes.data || []).map(w => w.topic)

  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  // Find students with similar profile — same field, similar year
  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, name, username, avatar_url, field, institution, year_of_study, bio')
    .eq('field', profile.field)
    .neq('id', user_id)
    .eq('allow_messages', true)
    .eq('profile_public', true)
    .limit(20)

  if (!candidates?.length) return res.status(200).json({ matches: [] })

  // Score and rank matches
  const scored = await Promise.all(candidates.map(async (c) => {
    let score = 0
    if (c.institution === profile.institution) score += 30
    if (c.year_of_study === profile.year_of_study) score += 20

    // Check if they have overlapping weak topics
    const { data: theirWeak } = await supabase
      .from('weak_topics')
      .select('topic')
      .eq('user_id', c.id)
      .limit(5)

    const theirTopics = (theirWeak || []).map(w => w.topic)
    const overlap = weakTopics.filter(t => theirTopics.some(tt => tt.toLowerCase().includes(t.toLowerCase().split(' ')[0]))).length
    score += overlap * 15

    return { ...c, _score: score }
  }))

  const matches = scored
    .sort((a, b) => b._score - a._score)
    .slice(0, 8)
    .map(({ _score, ...m }) => m)

  return res.status(200).json({ matches })
}