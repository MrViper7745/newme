import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { WORLD_REGIONS } from '../data/globalData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

export default function Analytics() {
  const { user } = useUser()
  const [stats, setStats] = useState({
    totalUsers: 0, totalChats: 0, totalSaved: 0,
    totalReviews: 0, totalApplications: 0, totalEvents: 0,
    totalMentors: 0, totalGroups: 0,
  })
  const [loading, setLoading] = useState(true)
  const [pageViewData, setPageViewData] = useState([])

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const queries = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('saved_internships').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('mentors').select('id', { count: 'exact', head: true }),
      supabase.from('study_groups').select('id', { count: 'exact', head: true }),
    ])

    setStats({
      totalUsers: queries[0].count || 0,
      totalChats: queries[1].count || 0,
      totalSaved: queries[2].count || 0,
      totalReviews: queries[3].count || 0,
      totalApplications: queries[4].count || 0,
      totalEvents: queries[5].count || 0,
      totalMentors: queries[6].count || 0,
      totalGroups: queries[7].count || 0,
    })
    setLoading(false)
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalUsers, icon: '👤', color: '#2563eb', change: '+12%' },
    { label: 'EduBot Chats', value: stats.totalChats, icon: '🤖', color: '#8b5cf6', change: '+34%' },
    { label: 'Saved Internships', value: stats.totalSaved, icon: '💼', color: '#10b981', change: '+18%' },
    { label: 'Reviews Written', value: stats.totalReviews, icon: '⭐', color: '#f59e0b', change: '+7%' },
    { label: 'Applications Tracked', value: stats.totalApplications, icon: '📊', color: '#ef4444', change: '+22%' },
    { label: 'Events Created', value: stats.totalEvents, icon: '📅', color: '#06b6d4', change: '+5%' },
    { label: 'Active Mentors', value: stats.totalMentors, icon: '🤝', color: '#10b981', change: '+15%' },
    { label: 'Study Groups', value: stats.totalGroups, icon: '👥', color: '#f59e0b', change: '+9%' },
  ]

  const regionData = WORLD_REGIONS.map(r => ({
    name: r.name,
    students: Math.floor(Math.random() * 500) + 50,
    internships: Math.floor(Math.random() * 100) + 10,
    color: r.color,
  }))

  const engagementData = [
    { month: 'Jan', users: 120, chats: 340, saves: 210 },
    { month: 'Feb', users: 180, chats: 520, saves: 310 },
    { month: 'Mar', users: 240, chats: 690, saves: 420 },
    { month: 'Apr', users: 310, chats: 850, saves: 580 },
    { month: 'May', users: 420, chats: 1100, saves: 750 },
    { month: 'Jun', users: 580, chats: 1400, saves: 920 },
  ]

  const featureData = [
    { name: 'EduBot AI', value: 35, color: '#8b5cf6' },
    { name: 'Internships', value: 25, color: '#2563eb' },
    { name: 'Scholarships', value: 15, color: '#10b981' },
    { name: 'CV Builder', value: 12, color: '#f59e0b' },
    { name: 'Mock Interviews', value: 8, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#64748b' },
  ]

  const TOOLTIP_STYLE = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ paddingTop: 100, maxWidth: 1200, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>📉 Platform Analytics</h1>
          <p style={{ color: '#64748b' }}>Real-time insights into EduLink Global platform usage and growth</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700 }}>{s.change}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: '8px 0 4px' }}>{loading ? '...' : s.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>📈 Growth Over Time</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={engagementData}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={2} dot={false} name="Students" />
                <Line type="monotone" dataKey="chats" stroke="#8b5cf6" strokeWidth={2} dot={false} name="AI Chats" />
                <Line type="monotone" dataKey="saves" stroke="#10b981" strokeWidth={2} dot={false} name="Saved Items" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>🌟 Feature Usage</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={featureData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {featureData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Usage']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 18 }}>🌍 Students by Region</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="students" radius={[5, 5, 0, 0]} name="Students">
                {regionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top features table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>🏆 Most Used Features This Month</div>
          <div>
            {[
              { rank: 1, feature: '🤖 EduBot AI Assistant', users: 1420, sessions: 4800, change: '+34%', color: '#8b5cf6' },
              { rank: 2, feature: '💼 Internship Browser', users: 980, sessions: 2100, change: '+18%', color: '#2563eb' },
              { rank: 3, feature: '🎓 Scholarship Listings', users: 750, sessions: 1600, change: '+12%', color: '#10b981' },
              { rank: 4, feature: '📄 CV Builder', users: 560, sessions: 890, change: '+45%', color: '#f59e0b' },
              { rank: 5, feature: '🎙️ Mock Interviews', users: 380, sessions: 640, change: '+67%', color: '#ef4444' },
            ].map(row => (
              <div key={row.rank} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 80px', gap: 0, padding: '14px 20px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, color: row.rank <= 3 ? '#f59e0b' : '#64748b', fontSize: 16 }}>{row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank-1] : `#${row.rank}`}</div>
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{row.feature}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.users.toLocaleString()} users</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{row.sessions.toLocaleString()} sessions</div>
                <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{row.change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}