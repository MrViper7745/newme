export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY not set in .env.local' })
  }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const { priceId, planName, billing } = req.body
  if (!priceId) return res.status(400).json({ error: 'Price ID is required' })

  const origin = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/api/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription?cancelled=true`,
      metadata: { planName, billing },
      subscription_data: { trial_period_days: 14, metadata: { planName, billing } },
      allow_promotion_codes: true,
    })
    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error.message)
    res.status(500).json({ error: error.message })
  }
}