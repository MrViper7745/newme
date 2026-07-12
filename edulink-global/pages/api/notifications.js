import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  const today = new Date().toISOString().split('T')[0]
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: unreadMessages },
    { count: unreadInsights },
    { data: upcomingExams },
  ] = await Promise.all([
    supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user_id)
      .eq('read', false),
    supabase
      .from('agent_insights')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('dismissed', false),
    supabase
      .from('exam_entries')
      .select('module_name, exam_date')
      .eq('user_id', user_id)
      .gte('exam_date', today)
      .lte('exam_date', sevenDays)
      .order('exam_date', { ascending: true })
      .limit(3),
  ])

  return res.status(200).json({
    unread_messages: unreadMessages || 0,
    unread_insights: unreadInsights || 0,
    upcoming_exams: upcomingExams || [],
    total: (unreadMessages || 0) + (unreadInsights || 0),
  })
}