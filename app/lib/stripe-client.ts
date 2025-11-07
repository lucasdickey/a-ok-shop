/**
 * Shared Stripe Client Initialization
 *
 * Provides lazy initialization of Stripe client to avoid build-time errors
 */

import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover' as any,
    });
  }
  return stripe;
}
