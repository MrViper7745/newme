import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })
  }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder'
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const updateByCustomerId = async (customerId, data) => {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      const email = customer.email
      if (email) {
        await supabase.from('profiles').update(data).eq('email', email)
      }
    } catch (e) {
      console.error('Update profile error:', e.message)
    }
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        await updateByCustomerId(sub.customer, {
          subscription_status: sub.status === 'active' ? 'active' : sub.status,
          stripe_subscription_id: sub.id,
          subscribed_until: new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await updateByCustomerId(sub.customer, {
          subscription_status: 'expired',
          subscribed_until: null,
        })
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        await updateByCustomerId(inv.customer, { subscription_status: 'past_due' })
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription)
          await updateByCustomerId(inv.customer, {
            subscription_status: 'active',
            subscribed_until: new Date(sub.current_period_end * 1000).toISOString(),
          })
        }
        break
      }
    }
    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err.message)
    res.status(500).json({ error: err.message })
  }
}