import { getProductByHandle, isSameId } from '@/app/lib/catalog';
import { getStripeClient } from '@/app/lib/stripe-client';
import { createStripePaymentFromSPT, parsePaymentAuthorization } from '@/app/lib/mpp-payment-verifier';
import { saveOrder, MPPOrder } from '@/app/lib/mpp-order-store';
import { CLOTHING_SIZES, isClothing } from '@/app/lib/sizes';
import { SHIPPING_COUNTRIES } from '@/app/lib/store-checkout';
import { MPPItem, MPPOrderConfirmation, MPPPaymentChallenge, MPPPurchaseRequest, MPPShipping } from '@/app/types/mpp';
import { NextRequest, NextResponse } from 'next/server';

const MAX_QUANTITY_PER_ITEM = 20;

/** Checks the request shape, keeping only the fields we use. */
function parsePurchaseRequest(raw: unknown): MPPPurchaseRequest | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Request body must be a JSON object' };
  const { items, agentId, email } = raw as Record<string, unknown>;
  const shapeError = {
    error: `\`items\` must be a non-empty array of { handle, variantId, quantity (1-${MAX_QUANTITY_PER_ITEM}), size }; tees and hoodies need a size`,
  };
  if (!Array.isArray(items) || items.length === 0) return shapeError;

  const parsedItems: MPPItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') return shapeError;
    const { handle, variantId, quantity, size } = entry as Record<string, unknown>;
    if (typeof handle !== 'string' || !handle || typeof variantId !== 'string' || !variantId) return shapeError;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      return shapeError;
    }
    parsedItems.push({ handle, variantId, quantity, size: typeof size === 'string' && size ? size : undefined });
  }

  const parsedShipping = parseShipping((raw as Record<string, unknown>).shipping);
  if (parsedShipping && 'error' in parsedShipping) return parsedShipping;

  return {
    items: parsedItems,
    agentId: typeof agentId === 'string' && agentId ? agentId.slice(0, 100) : undefined,
    email: typeof email === 'string' && email ? email.slice(0, 254) : undefined,
    shipping: parsedShipping,
  };
}

const SHIPPING_ERROR =
  `\`shipping\` must be { name, address: { line1, line2?, city, state, postal_code, country } } with country ${SHIPPING_COUNTRIES.join(' or ')}`;

/** Checks the shipping address. Returns undefined when none was sent. */
function parseShipping(raw: unknown): MPPShipping | { error: string } | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') return { error: SHIPPING_ERROR };
  const { name, address } = raw as Record<string, unknown>;
  if (!address || typeof address !== 'object') return { error: SHIPPING_ERROR };
  const fields = address as Record<string, unknown>;

  // Trimmed, non-empty, and short enough for Stripe's address fields.
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

  const parsed = {
    name: text(name, 100),
    line1: text(fields.line1, 200),
    line2: text(fields.line2, 200),
    city: text(fields.city, 100),
    state: text(fields.state, 100),
    postal_code: text(fields.postal_code, 20),
    country: text(fields.country, 2)?.toUpperCase(),
  };
  const { name: shipName, line1, city, state, postal_code, country } = parsed;
  if (!shipName || !line1 || !city || !state || !postal_code || !country) return { error: SHIPPING_ERROR };
  if (!(SHIPPING_COUNTRIES as readonly string[]).includes(country)) {
    return { error: `We only ship to ${SHIPPING_COUNTRIES.join(' and ')}` };
  }

  return {
    name: shipName,
    address: { line1, line2: parsed.line2, city, state, postal_code, country },
  };
}

/**
 * MPP Purchase Endpoint (Machine Payments Protocol)
 *
 * Implements the proper MPP flow per paymentauth.org spec:
 *
 * 1. Client sends POST with items
 * 2. Server validates and returns 402 with WWW-Authenticate header
 * 3. Client obtains SPT (Shared Payment Token) from wallet
 * 4. Client retries with Authorization: Payment header (base64url-encoded SPT)
 * 5. Server creates/confirms PaymentIntent and returns 200 with order
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = parsePurchaseRequest(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { items, agentId = 'unknown-agent', email } = parsed;
    let { shipping } = parsed;

    console.log('[MPP] Purchase request from agent:', agentId, 'items:', items.length);

    // Validate items and calculate total
    let totalAmount = 0;
    const lineItems: Array<{ handle: string; variantId: string; quantity: number; price: number }> = [];
    // Digital goods have nothing to ship. Tracked so a five-cent download
    // doesn't get $9.99 of freight bolted onto it (see the shipping rule below).
    let requiresShipping = false;

    for (const item of items) {
      const product = getProductByHandle(item.handle);
      if (!product) {
        console.warn('[MPP] Product not found:', item.handle);
        return NextResponse.json({ error: `Product not found: ${item.handle}` }, { status: 404 });
      }

      const variant = product.variants?.edges?.find(
        (edge: any) => isSameId(edge.node.id, item.variantId)
      )?.node;

      if (!variant) {
        console.warn('[MPP] Variant not found:', item.variantId);
        return NextResponse.json({ error: `Variant not found: ${item.variantId}` }, { status: 404 });
      }

      // Tees and hoodies are printed to order, so an order without a size can't be filled.
      if (isClothing(product.productType, product.tags)) {
        if (!item.size) {
          return NextResponse.json({ error: `Choose a size for ${product.title}: ${CLOTHING_SIZES.join(', ')}` }, { status: 400 });
        }
        if (!CLOTHING_SIZES.includes(item.size)) {
          return NextResponse.json({ error: `Size must be one of ${CLOTHING_SIZES.join(', ')}` }, { status: 400 });
        }
      } else {
        delete item.size;
      }

      if (!variant.availableForSale) {
        console.warn('[MPP] Variant not available:', item.variantId);
        return NextResponse.json({ error: `Variant not available: ${item.variantId}` }, { status: 400 });
      }

      const isDigital = (product.tags || []).some(
        (tag: string) => tag.toLowerCase() === 'digital'
      );
      if (!isDigital) {
        requiresShipping = true;
      }

      const price = parseFloat(variant.price.amount);
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        handle: item.handle,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
    }

    // Add shipping. Orders that are entirely digital ship nothing and are
    // charged nothing for freight — otherwise the $0.05 machine-payable sticker
    // would settle at $10.04 and stop being a cheap way to exercise the protocol.
    // A physical order without an address can't be fulfilled; digital orders don't keep one.
    if (requiresShipping && !shipping) {
      return NextResponse.json({ error: `This order ships, so it needs a shipping address. ${SHIPPING_ERROR}` }, { status: 400 });
    }
    if (!requiresShipping) shipping = undefined;

    const shippingCost = requiresShipping && totalAmount < 50 ? 9.99 : 0;
    const amountInCents = Math.round((totalAmount + shippingCost) * 100);
    console.log('[MPP] Order totals - items:', totalAmount.toFixed(2), 'shipping:', shippingCost.toFixed(2));

    // Check for Authorization: Payment header (second step of flow)
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      console.log('[MPP] Payment authorization header received, processing payment');
      return handlePaymentAuthorization(authHeader, items, lineItems, amountInCents, agentId, email, shipping);
    }

    // First step: return 402 Payment Required with payment challenge
    console.log('[MPP] Returning 402 Payment Required challenge');
    return handlePaymentChallenge(items, totalAmount, shippingCost, amountInCents, agentId);
  } catch (error) {
    console.error('[MPP] Error in purchase endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle initial payment challenge (402 response)
 * Returns proper MPP protocol response with WWW-Authenticate header
 */
async function handlePaymentChallenge(
  items: MPPPurchaseRequest['items'],
  subtotal: number,
  shipping: number,
  amountInCents: number,
  agentId: string
) {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      console.error('[MPP] Stripe client not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const amount = amountInCents;

    // Create a payment reference ID
    const paymentId = `pi_mpp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Get Stripe network ID (required for link-cli mpp decode to work properly)
    const networkId = process.env.STRIPE_NETWORK_ID?.trim();
    if (!networkId) {
      console.error('[MPP] STRIPE_NETWORK_ID environment variable not configured');
      return NextResponse.json({ error: 'Server misconfiguration: STRIPE_NETWORK_ID not set' }, { status: 500 });
    }

    // Prepare request details for base64url encoding
    // Include methodDetails with networkId so link-cli mpp decode can extract it from the request
    const requestDetails = {
      id: paymentId,
      amount: amount.toString(), // link-cli expects amount as string
      currency: 'usd',
      description: `Purchase ${items.length} item(s) from a-ok.ai`,
      items,
      agentId,
      timestamp: Date.now().toString(), // link-cli expects timestamp as string
      methodDetails: {
        networkId,
        paymentMethodTypes: ['card'],
      },
    };

    // Encode request details in base64url (not base64)
    const base64Request = Buffer.from(JSON.stringify(requestDetails)).toString('base64');
    // Convert base64 to base64url: replace +/= with -_
    const base64urlRequest = base64Request.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Create the payment challenge response
    // Note: methodDetails.networkId is now in the base64url-encoded request for link-cli mpp decode to read
    const challenge: MPPPaymentChallenge = {
      id: paymentId,
      request: base64urlRequest,
      amount,
      currency: 'USD',
      description: `Purchase ${items.length} item(s) from a-ok.ai`,
      paymentMethods: {
        stripe: {
          method: 'stripe',
          intent: 'charge',
        },
      },
    };

    console.log('[MPP] Payment challenge created:', paymentId, 'networkId:', networkId);

    // Build WWW-Authenticate header per MPP spec with realm and base64url request
    const wwwAuthenticateHeader = `Payment realm="a-ok.ai", id="${paymentId}", method="stripe", intent="charge", request="${base64urlRequest}"`;

    // Return 402 with proper MPP headers
    return NextResponse.json(challenge, {
      status: 402,
      headers: {
        'WWW-Authenticate': wwwAuthenticateHeader,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[MPP] Error creating payment challenge:', error);
    return NextResponse.json({ error: 'Failed to create payment challenge' }, { status: 500 });
  }
}

/**
 * Handle payment authorization with SPT (second step)
 * Creates PaymentIntent, confirms with SPT, and returns order confirmation
 */
async function handlePaymentAuthorization(
  authHeader: string,
  items: MPPPurchaseRequest['items'],
  lineItems: Array<{ handle: string; variantId: string; quantity: number; price: number }>,
  amountInCents: number,
  agentId: string,
  email?: string,
  shipping?: MPPShipping
): Promise<NextResponse> {
  try {
    // Parse the SPT from base64url-encoded Authorization header
    const { method, spt } = parsePaymentAuthorization(authHeader);

    if (method !== 'stripe-link' || !spt) {
      console.warn('[MPP] Invalid authorization method or missing SPT:', method);
      return NextResponse.json({ error: 'Invalid payment authorization' }, { status: 400 });
    }

    console.log('[MPP] Processing SPT payment for agent:', agentId);

    // Generate order ID upfront
    const orderId = `mpp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create and confirm PaymentIntent with SPT
    const paymentResult = await createStripePaymentFromSPT(
      spt,
      amountInCents,
      agentId,
      orderId,
      email,
      items,
      shipping
    );

    if (!paymentResult.verified) {
      console.error('[MPP] Payment verification failed:', paymentResult.error);
      return NextResponse.json({ error: paymentResult.error || 'Payment failed' }, { status: 401 });
    }

    console.log('[MPP] Payment verified successfully:', paymentResult.paymentId);

    // Save order record
    const order: MPPOrder = {
      orderId,
      paymentIntentId: paymentResult.paymentId,
      agentId,
      email,
      items,
      shipping,
      amount: amountInCents,
      currency: 'USD',
      paymentMethod: 'stripe-spt',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        lineItemCount: lineItems.length.toString(),
      },
    };

    await saveOrder(order);
    console.log('[MPP] Order saved:', orderId);

    // Return order confirmation
    const confirmation: MPPOrderConfirmation = {
      orderId,
      status: 'completed',
      amount: amountInCents / 100,
      currency: 'USD',
      paymentMethod: 'stripe-spt',
      paymentId: paymentResult.paymentId,
      items,
      message: 'Order completed successfully',
    };

    return NextResponse.json(confirmation, {
      status: 200,
      headers: {
        'Payment-Receipt': `receipt-${orderId}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[MPP] Error processing payment authorization:', error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}
