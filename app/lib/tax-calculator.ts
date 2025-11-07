/**
 * Tax Calculation using Stripe Tax API
 *
 * Automatically calculates sales tax for checkout sessions
 */

import Stripe from 'stripe';
import { Address, LineItem } from './kv';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

/**
 * Calculate tax for a checkout session using Stripe Tax
 *
 * TODO: Implement Stripe Tax calculation
 */
export async function calculateTax(
  lineItems: LineItem[],
  address: Address
): Promise<number> {
  if (!stripe) {
    console.warn('Stripe not configured, skipping tax calculation');
    return 0;
  }

  try {
    // TODO: Call Stripe Tax API
    // const calculation = await stripe.tax.calculations.create({
    //   currency: 'usd',
    //   line_items: lineItems.map(item => ({
    //     amount: item.subtotal,
    //     reference: item.id
    //   })),
    //   customer_details: {
    //     address: {
    //       line1: address.line_one,
    //       city: address.city,
    //       state: address.state,
    //       postal_code: address.postal_code,
    //       country: address.country
    //     },
    //     address_source: 'shipping'
    //   }
    // });
    //
    // return calculation.tax_amount_exclusive;

    // STUB: Return 0 for now
    return 0;
  } catch (error) {
    console.error('Tax calculation error:', error);
    return 0;
  }
}
