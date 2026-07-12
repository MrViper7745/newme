import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

const SAMPLE_NOTIFS = [
  { id: 1, type: 'deadline', icon: '⏰', title: 'Application Deadline Tomorrow', message: 'Google APAC Internship closes tomorrow. Have you applied?', link: '/internships', color: '#ef4444', read: false, time: '2 hours ago' },
  { id: 2, type: 'scholarship', icon: '🎓', title: 'New Scholarship Match', message: 'Chevening Scholarship 2025 applications are now open for your country.', link: '/scholarships', color: '#2563eb', read: false, time: '5 hours ago' },
  { id: 3, type: 'cv', icon: '📄', title: 'CV Tip', message: 'Your CV hasn\'t been updated in a while. Keep it fresh with your latest achievements.', link: '/cv-builder', color: '#8b5cf6', read: true, time: '1 day ago' },
  { id: 4, type: 'course', icon: '📚', title: 'Course Recommendation', message: 'Based on your profile: "Machine Learning Specialization" by DeepLearning.AI is highly rated.', link: '/courses', color: '#10b981', read: true, time: '2 days ago' },
  { id: 5, type: 'message', icon: '💬', title: 'New Message', message: 'You have an unread message from another EduLink student.', link: '/messages', color: '#f59e0b', read: false, time: '3 hours ago' },
]

const TYPE_FILTERS = ['All', 'deadline', 'scholarship', 'cv', 'course', 'message']

export default function Notifications() {
  const { user } = useUser()
  const [notifs, setNotifs] = useState(SAMPLE_NOTIFS)
  const [filter, setFilter] = useState('All')
  const [reminders, setReminders] = useState([])

  useEffect(() => {
    if (user) fetchReminders()
  }, [user])

  const fetchReminders = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(5)

    if (data?.length) {
      const reminderNotifs = data.map(r => ({
        id: `r_${r.id}`,
        type: 'deadline',
        icon: '📅',
        title: r.title,
        message: `Due: ${new Date(r.due_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
        link: '/reminders',
        color: '#ef4444',
        read: false,
        time: 'from your reminders',
      }))
      setNotifs(prev => [...reminderNotifs, ...prev])
    }
  }

  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })))
  const remove = (id) => setNotifs(p => p.filter(n => n.id !== id))

  const filtered = filter === 'All' ? notifs : notifs.filter(n => n.type === filter)
  const unread = notifs.filter(n => !n.read).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 720, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
              🔔 Notifications
              {unread > 0 && <span style={{ marginLeft: 10, fontSize: 14, padding: '2px 10px', borderRadius: 20, background: '#ef4444', color: '#fff', fontWeight: 700 }}>{unread}</span>}
            </h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Stay on top of deadlines, scholarships, and opportunities</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ padding: '8px 16px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✓ Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
          {TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'rgba(37,99,235,0.15)' : 'var(--surface)',
              color: filter === f ? '#60a5fa' : '#64748b',
              border: `1px solid ${filter === f ? '#2563eb' : 'var(--border)'}`,
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'All' && unread > 0 && ` (${unread})`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div>No notifications in this category</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(notif => (
              <div key={notif.id} style={{
                background: notif.read ? 'var(--surface)' : 'var(--surface)',
                border: `1px solid ${notif.read ? 'var(--border)' : notif.color + '40'}`,
                borderLeft: `4px solid ${notif.read ? 'var(--border)' : notif.color}`,
                borderRadius: 12, padding: '16px 18px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
                opacity: notif.read ? 0.7 : 1,
                transition: 'all 0.2s',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${notif.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {notif.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: notif.read ? 600 : 800, color: '#f1f5f9', fontSize: 14 }}>{notif.title}</div>
                    <div style={{ fontSize: 10, color: '#374151', flexShrink: 0 }}>{notif.time}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 }}>{notif.message}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={notif.link || '#'} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, background: `${notif.color}15`, color: notif.color, border: `1px solid ${notif.color}30`, textDecoration: 'none', fontWeight: 600 }}>
                      View →
                    </Link>
                    {!notif.read && (
                      <button onClick={() => markRead(notif.id)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#64748b', cursor: 'pointer' }}>
                        Mark read
                      </button>
                    )}
                    <button onClick={() => remove(notif.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div style={{ marginTop: 32, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 14 }}>⚡ Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            {[
              { href: '/reminders', icon: '⏰', label: 'Set a Deadline Reminder' },
              { href: '/internships', icon: '💼', label: 'Browse New Internships' },
              { href: '/scholarships', icon: '🎓', label: 'Find Scholarships' },
              { href: '/tracker', icon: '📊', label: 'Update Applications' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', textDecoration: 'none', color: '#94a3b8', fontSize: 13 }}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}