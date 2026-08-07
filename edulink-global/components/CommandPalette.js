import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'

const STATIC_COMMANDS = [
  { id: 'dashboard',   label: 'Go to Dashboard',         icon: '🏠', href: '/dashboard',          group: 'Navigate' },
  { id: 'library',     label: 'Open Library',            icon: '📚', href: '/library',             group: 'Navigate' },
  { id: 'upload',      label: 'Upload Files',            icon: '📤', href: '/upload',              group: 'Navigate' },
  { id: 'search',      label: 'Search Library',          icon: '🔍', href: '/search',              group: 'Navigate' },
  { id: 'study-ai',    label: 'Open Study AI',           icon: '🤖', href: '/study-ai',            group: 'Navigate' },
  { id: 'assistant',   label: 'Chat with EduBot',        icon: '💬', href: '/assistant',           group: 'Navigate' },
  { id: 'exams',       label: 'View Exams',              icon: '📅', href: '/exams',               group: 'Navigate' },
  { id: 'community',   label: 'Open Community',          icon: '🌍', href: '/community',           group: 'Navigate' },
  { id: 'messages',    label: 'Open Messages',           icon: '✉️', href: '/messages',            group: 'Navigate' },
  { id: 'analytics',   label: 'View Study Analytics',   icon: '📈', href: '/analytics',           group: 'Navigate' },
  { id: 'cv',          label: 'Open CV Builder',         icon: '📄', href: '/cv-builder',          group: 'Career' },
  { id: 'interview',   label: 'Interview Simulator',     icon: '🎙️', href: '/interview-simulator', group: 'Career' },
  { id: 'tracker',     label: 'Application Tracker',    icon: '📊', href: '/tracker',             group: 'Career' },
  { id: 'language',    label: 'Language Learning',       icon: '🌐', href: '/language',            group: 'Career' },
  { id: 'profile',     label: 'Edit Profile',            icon: '👤', href: '/profile',             group: 'Account' },
  { id: 'settings',    label: 'Settings',                icon: '⚙️', href: '/settings',            group: 'Account' },
]

export default function CommandPalette({ onClose }) {
  const { user } = useUser()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim() || !user) { setFiles([]); return }
    const search = async () => {
      const { data } = await supabase.from('library_files').select('id,title,name,label,ext')
        .eq('user_id', user.id).or(`title.ilike.%${query}%,name.ilike.%${query}%`).limit(5)
      setFiles(data || [])
    }
    const t = setTimeout(search, 200)
    return () => clearTimeout(t)
  }, [query, user])

  const staticFiltered = STATIC_COMMANDS.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.group.toLowerCase().includes(query.toLowerCase())
  )

  const fileCommands = files.map(f => ({
    id: f.id, label: f.title || f.name, icon: '📄',
    href: '/library', group: 'Library Files',
    sub: f.label,
  }))

  const allCommands = [...fileCommands, ...staticFiltered]

  const go = (href) => { router.push(href); onClose() }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allCommands.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && allCommands[selected]) go(allCommands[selected].href)
  }

  // Group commands
  const groups = {}
  allCommands.forEach((cmd, i) => {
    if (!groups[cmd.group]) groups[cmd.group] = []
    groups[cmd.group].push({ ...cmd, _idx: i })
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 16px', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 560, background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKey}
            placeholder="Search pages, files, commands..."
            style={{ flex: 1, background: 'none', border: 'none', color: '#f1f5f9', fontSize: 16, outline: 'none', fontFamily: 'inherit' }}
          />
          <kbd style={{ fontSize: 10, color: '#374151', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '2px 6px' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
          {allCommands.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No results for "{query}"</div>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <div style={{ padding: '10px 16px 4px', fontSize: 10, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group}</div>
                {cmds.map(cmd => (
                  <div key={cmd.id} onClick={() => go(cmd.href)}
                    style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: selected === cmd._idx ? 'rgba(37,99,235,0.15)' : 'transparent', borderLeft: `2px solid ${selected === cmd._idx ? '#2563eb' : 'transparent'}`, transition: 'all 0.1s' }}
                    onMouseEnter={() => setSelected(cmd._idx)}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{cmd.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: selected === cmd._idx ? '#f1f5f9' : '#e2e8f0', fontWeight: selected === cmd._idx ? 600 : 400 }}>{cmd.label}</div>
                      {cmd.sub && <div style={{ fontSize: 11, color: '#64748b' }}>{cmd.sub}</div>}
                    </div>
                    {selected === cmd._idx && <span style={{ fontSize: 10, color: '#60a5fa', flexShrink: 0 }}>↵ Open</span>}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 14, fontSize: 10, color: '#374151' }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>Esc close</span>
        </div>
      </div>
    </div>
  )
}