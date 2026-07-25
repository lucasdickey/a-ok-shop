/**
 * Shared Stripe Client Initialization
 *
 * Provides lazy initialization of Stripe client to avoid build-time errors.
 *
 * The API version is deliberately not overridden: the installed SDK is
 * generated against a specific version, and pinning a newer one (via `as any`)
 * means responses no longer match the TypeScript types. To move to a newer API
 * version, upgrade the `stripe` package instead.
 */

import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      appInfo: {
        name: 'a-ok-shop',
      },
    });
  }
  return stripe;
}
