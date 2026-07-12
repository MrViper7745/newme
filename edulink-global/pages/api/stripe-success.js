import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { session_id } = req.query
  if (!session_id) return res.redirect('/subscription?error=missing_session')

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.redirect('/subscription?error=stripe_not_configured')
  }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer'],
    })

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const customerEmail = session.customer_details?.email
      if (customerEmail) {
        await supabase.from('profiles').update({
          subscription_status: 'active',
          stripe_customer_id: session.customer?.id,
          subscribed_until: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('email', customerEmail)
      }
      return res.redirect('/dashboard?subscribed=true')
    }
    return res.redirect('/subscription?error=payment_incomplete')
  } catch (error) {
    console.error('Stripe success handler error:', error.message)
    return res.redirect('/subscription?error=unknown')
  }
}