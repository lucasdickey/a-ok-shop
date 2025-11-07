/**
 * Checkout Session Business Logic
 *
 * Handles session creation, updates, and calculations for OpenAI ACP
 */

import { CheckoutSession, LineItem, FulfillmentOption, Total, Address, generateSessionId } from './kv';
import { calculateTax } from './tax-calculator';
import { calculateShipping } from './shipping-calculator';
import { getAllProducts } from './catalog';

/**
 * Create a new checkout session
 */
export async function createCheckoutSession(data: {
  items: Array<{ id: string; quantity: number }>;
  buyer?: any;
  fulfillment_address?: Address;
}): Promise<CheckoutSession> {
  const sessionId = generateSessionId();
  const now = Date.now();

  // Calculate line items from product catalog
  const lineItems = await calculateLineItems(data.items);

  // Calculate shipping options based on address
  const fulfillmentOptions = await calculateShipping(data.fulfillment_address);

  // Calculate tax (if address provided)
  const taxAmount = data.fulfillment_address
    ? await calculateTax(lineItems, data.fulfillment_address)
    : 0;

  // Build session object
  const session: CheckoutSession = {
    id: sessionId,
    status: data.fulfillment_address ? 'not_ready_for_payment' : 'not_ready_for_payment',
    currency: 'usd',
    items: data.items,
    fulfillment_address: data.fulfillment_address,
    buyer: data.buyer,
    line_items: lineItems,
    fulfillment_options: fulfillmentOptions,
    totals: [], // Will be calculated below
    created_at: now,
    updated_at: now,
    expires_at: now + (24 * 60 * 60 * 1000) // 24 hours
  };

  // Calculate totals
  session.totals = await recalculateTotals(session, taxAmount);

  // Update status based on completeness
  if (data.fulfillment_address && fulfillmentOptions.length > 0) {
    session.status = 'ready_for_payment';
  }

  return session;
}

/**
 * Calculate line items from cart items using local product catalog
 */
export async function calculateLineItems(items: Array<{ id: string; quantity: number }>): Promise<LineItem[]> {
  const products = getAllProducts();
  const lineItems: LineItem[] = [];

  for (const item of items) {
    // Find product by handle (id is the product handle)
    const product = products.find(p => p.handle === item.id);

    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }

    // Get the first variant (or implement variant selection logic)
    const variant = product.variants.edges[0]?.node;

    if (!variant) {
      throw new Error(`No variants available for product: ${item.id}`);
    }

    const unitPrice = parseFloat(variant.price.amount) * 100; // Convert to cents
    const baseAmount = unitPrice * item.quantity;

    lineItems.push({
      id: variant.id,
      product_id: item.id,
      title: product.title,
      subtitle: variant.title !== 'Default Title' ? variant.title : undefined,
      quantity: item.quantity,
      base_amount: baseAmount,
      discount_amount: 0, // No discounts for now
      subtotal: baseAmount,
      tax: 0, // Tax calculated separately
      total: baseAmount,
      currency: 'usd',
      image_url: product.images.edges[0]?.node.url || undefined,
    });
  }

  return lineItems;
}

/**
 * Recalculate session totals
 */
export async function recalculateTotals(session: CheckoutSession, taxAmount: number = 0): Promise<Total[]> {
  const totals: Total[] = [];

  // Calculate merchandise subtotal
  const merchandiseSubtotal = session.line_items.reduce((sum, item) => sum + item.subtotal, 0);

  totals.push({
    type: 'merchandise',
    label: 'Merchandise',
    amount: merchandiseSubtotal,
  });

  // Add shipping cost if selected
  let shippingTotal = 0;
  if (session.fulfillment_option_id) {
    const selectedOption = session.fulfillment_options.find(
      opt => opt.id === session.fulfillment_option_id
    );
    if (selectedOption) {
      shippingTotal = selectedOption.total;
      totals.push({
        type: 'shipping',
        label: selectedOption.title,
        amount: shippingTotal,
      });
    }
  }

  // Add tax
  const taxTotal = taxAmount;
  if (taxTotal > 0) {
    totals.push({
      type: 'tax',
      label: 'Tax',
      amount: taxTotal,
    });
  }

  // Calculate grand total
  const grandTotal = merchandiseSubtotal + shippingTotal + taxTotal;
  totals.push({
    type: 'total',
    label: 'Total',
    amount: grandTotal,
  });

  return totals;
}
