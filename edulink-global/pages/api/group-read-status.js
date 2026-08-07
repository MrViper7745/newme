import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Mark group as read
    const { user_id, group_id } = req.body
    if (!user_id || !group_id) return res.status(400).json({ error: 'Missing fields' })

    await supabase.from('group_read_status').upsert({
      user_id, group_id, last_read: new Date().toISOString(),
    }, { onConflict: 'user_id,group_id' })

    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' })

    // Get last message per group
    const { data: groups } = await supabase.from('group_chats')
      .select('id').filter('members', 'cs', `{${user_id}}`)

    if (!groups?.length) return res.status(200).json({ unread: {} })

    const { data: readStatus } = await supabase.from('group_read_status')
      .select('group_id, last_read').eq('user_id', user_id)

    const readMap = {}
    ;(readStatus || []).forEach(r => { readMap[r.group_id] = r.last_read })

    const unread = {}
    await Promise.all(groups.map(async g => {
      const lastRead = readMap[g.id]
      const query = supabase.from('group_messages').select('id', { count: 'exact', head: true })
        .eq('group_id', g.id).neq('user_id', user_id)
      if (lastRead) query.gt('created_at', lastRead)
      const { count } = await query
      if (count > 0) unread[g.id] = count
    }))

    return res.status(200).json({ unread })
  }

  return res.status(405).end()
}