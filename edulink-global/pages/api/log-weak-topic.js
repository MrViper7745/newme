import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, topic, module, file_id, trigger_type } = req.body
  if (!user_id || !topic) return res.status(400).json({ error: 'user_id and topic required' })

  // Check if this topic already exists for the user (fuzzy match on topic text)
  const { data: existing } = await supabase
    .from('weak_topics')
    .select('*')
    .eq('user_id', user_id)
    .eq('resolved', false)
    .ilike('topic', `%${topic.slice(0, 40)}%`)
    .limit(1)
    .single()

  if (existing) {
    await supabase.from('weak_topics').update({
      occurrence_count: existing.occurrence_count + 1,
      last_occurred_at: new Date().toISOString(),
    }).eq('id', existing.id)
    return res.status(200).json({ updated: true, occurrence_count: existing.occurrence_count + 1 })
  }

  await supabase.from('weak_topics').insert({
    user_id, topic, module, file_id, trigger_type,
  })

  return res.status(200).json({ created: true })
}