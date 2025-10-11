import Stripe from 'stripe';

// Server-side Stripe instance (uses secret key)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Creates a payment intent for the given order
 */
export async function createPaymentIntent(
  amount: number, // in cents
  orderId: number,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        order_id: orderId.toString(),
        ...metadata,
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Retrieves a payment intent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error('Failed to retrieve payment intent');
  }
}

/**
 * Confirms a payment intent (usually done on client side, but useful for testing)
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethod?: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod,
    });
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw new Error('Failed to confirm payment intent');
  }
}

/**
 * Constructs a webhook event from the raw body and signature
 * This is critical for webhook security
 */
export function constructWebhookEvent(
  body: Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

export default stripe;