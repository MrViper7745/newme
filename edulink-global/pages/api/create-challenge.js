// POST to this endpoint to seed daily challenges
// Protect with AGENT_CRON_SECRET or call manually from an admin panel

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Subjects pool — expand as needed
const SUBJECTS = [
  'Engineering Mathematics', 'Electrical Circuit Theory', 'Thermodynamics',
  'Fluid Mechanics', 'Structural Analysis', 'Digital Electronics',
  'Accounting Principles', 'Microeconomics', 'Business Law',
  'Human Anatomy', 'Organic Chemistry', 'Physics Mechanics',
  'Computer Science Algorithms', 'Database Systems', 'Operating Systems',
  'Statistics and Probability', 'Calculus', 'Linear Algebra',
]

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

const PRIZES = { easy: 15, medium: 30, hard: 75, expert: 150 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { count = 3, custom } = req.body

  const now = new Date()
  const challenges = []

  if (custom) {
    challenges.push(custom)
  } else {
    // Generate `count` random challenges spaced throughout the day
    for (let i = 0; i < count; i++) {
      const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]
      const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]
      const prize = PRIZES[difficulty]

      // Random start time: spread throughout the day
      const hoursFromNow = [2, 6, 14][i] || Math.floor(Math.random() * 18) + 2
      const startsAt = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000)
      const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000) // 3-hour window

      challenges.push({
        title: `${subject} Challenge`,
        subject,
        difficulty,
        prize_amount: prize,
        prize_pool: prize * 10,
        total_questions: difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : difficulty === 'hard' ? 12 : 15,
        time_limit_minutes: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 30 : difficulty === 'hard' ? 45 : 60,
        max_winners: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 10 : difficulty === 'hard' ? 5 : 2,
        winners_so_far: 0,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
      })
    }
  }

  const { data, error } = await supabase.from('challenges').insert(challenges).select()
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ created: data.length, challenges: data })
}