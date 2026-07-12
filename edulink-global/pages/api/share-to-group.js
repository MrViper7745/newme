import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { group_id, user_id, file_id, message } = req.body
  if (!group_id || !user_id || !file_id) return res.status(400).json({ error: 'group_id, user_id, file_id required' })

  const [{ data: file }, { data: profile }, { data: group }] = await Promise.all([
    supabase.from('library_files').select('*').eq('id', file_id).single(),
    supabase.from('profiles').select('username, name').eq('id', user_id).single(),
    supabase.from('group_chats').select('members, name').eq('id', group_id).single(),
  ])

  if (!file) return res.status(404).json({ error: 'File not found' })
  if (!group) return res.status(404).json({ error: 'Group not found' })

  const members = Array.isArray(group.members) ? group.members : []
  if (!members.includes(user_id)) {
    await supabase.from('group_chats').update({ members: [...members, user_id] }).eq('id', group_id)
  }

  if (message?.trim()) {
    await supabase.from('group_messages').insert({
      group_id, user_id,
      username: profile?.username,
      display_name: profile?.name || profile?.username || 'Student',
      content: message.trim(),
      message_type: 'text',
    })
  }

  await supabase.from('group_messages').insert({
    group_id, user_id,
    username: profile?.username,
    display_name: profile?.name || profile?.username || 'Student',
    content: file.title || file.name || 'Document',
    message_type: 'document',
    document_url: file.url,
    document_name: file.title || file.name,
  })

  return res.status(200).json({ success: true })
}