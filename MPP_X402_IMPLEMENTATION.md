# Stripe MPP and x402 Protocol Implementation

This document describes the Stripe Machine Payments Protocol (MPP) integration in the A-OK Shop. These protocols allow AI agents to discover products and pay for them machine-to-machine using the HTTP 402 "Payment Required" status code.

## Protocol Overview

### Stripe MPP (Machine Payments Protocol)
MPP is an open standard (see paymentauth.org) that embeds payment negotiation directly into HTTP requests. When a resource (like a cart of products) requires payment, the server returns a `402 Payment Required` response with a `WWW-Authenticate: Payment ...` header. The agent obtains a credential (a Stripe **Shared Payment Token**, "SPT", from a Stripe Link AI wallet) and retries the request with an `Authorization: Payment <credential>` header.

### x402 / Tempo
x402-style stablecoin settlement (USDC on Tempo) is scaffolded in `app/lib/mpp-payment-verifier.ts` (`verifyTempoPayment`) but on-chain verification is still a placeholder. The live, end-to-end path today is Stripe SPT.

## Endpoints

### 1. Catalog — `GET /api/mpp/catalog`
Returns the product catalog in a machine-readable format: `id`, `handle`, `title`, `description`, `priceRange`, `variants` (with `id`, `price`, `available`, `options`, `stripePriceId`), `images`, and `options`. No payment required. This is the canonical discovery endpoint for agents.

> `GET /api/mpp/products` is a legacy, lighter-weight feed kept for backwards compatibility. Prefer `/api/mpp/catalog`.

### 2. Purchase — `POST /api/mpp/purchase`
Implements the two-step MPP flow.

**Request body:**
```jsonc
{
  "agentId": "demo-agent",          // optional, defaults to "unknown-agent"
  "email": "agent@example.com",     // optional, used for the Stripe receipt
  "items": [
    { "handle": "product-handle", "variantId": "gid://shopify/ProductVariant/...", "quantity": 1 }
  ]
}
```

**Step 1 — challenge (no `Authorization` header):**
The server validates items, computes the total (adds $9.99 shipping when the merchandise subtotal is under $50), and returns `402 Payment Required` with:
- A `WWW-Authenticate: Payment realm="a-ok.shop", id="...", method="stripe", intent="charge", request="<base64url>"` header.
- A JSON body (`MPPPaymentChallenge`) containing the payment `id`, the base64url-encoded `request` details (including `methodDetails.networkId` for `link-cli mpp decode`), `amount` (cents), `currency`, and `paymentMethods`.

**Step 2 — authorization (`Authorization: Payment <base64url>` header):**
The agent supplies a credential envelope, base64url-encoded:
```jsonc
{ "payload": { "spt": "spt_...", "method": "stripe" } }
```
The server creates and confirms a Stripe `PaymentIntent` using `shared_payment_granted_token: <spt>` (idempotency-keyed on the order ID), persists the order, and returns `200` with an `MPPOrderConfirmation` plus a `Payment-Receipt` header.

### 3. Order status — `GET /api/mpp/orders/:orderId`
Lets an agent look up an order it placed. Returns the order `status`, `amount`, `currency`, `paymentMethod`, `items`, and timestamps. Returns `404` if the order is unknown or order persistence (Redis) is not configured.

## Example Flow

1. **Discover**: `GET /api/mpp/catalog`
2. **Attempt purchase**: `POST /api/mpp/purchase` with `items` → `402` + `WWW-Authenticate: Payment ...`
3. **Obtain SPT**: Agent's Stripe Link AI wallet mints a Shared Payment Token for the challenge.
4. **Authorize**: Retry `POST /api/mpp/purchase` with `Authorization: Payment <base64url({ payload: { spt, method } })>` → `200` with `{ orderId, status, paymentId, ... }`.
5. **Track**: `GET /api/mpp/orders/:orderId`

## Supporting Code

- `app/api/mpp/catalog/route.ts` — catalog feed
- `app/api/mpp/purchase/route.ts` — 402 challenge + SPT authorization
- `app/api/mpp/orders/[orderId]/route.ts` — order status lookup
- `app/lib/mpp-payment-verifier.ts` — Stripe SPT confirmation + Tempo placeholder
- `app/lib/mpp-order-store.ts` — Redis-backed order persistence
- `app/lib/stripe-client.ts` — lazily-initialized Stripe client (API `2026-04-22.dahlia`)
- `app/types/mpp.ts` — shared MPP types

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API key used to create/confirm PaymentIntents. |
| `STRIPE_NETWORK_ID` | Stripe Link network ID; **required** by the 402 challenge so `link-cli mpp decode` can read payment method details. |
| `REDIS_URL` | Redis connection string for order persistence. Without it, purchases still succeed but orders are not queryable via `/api/mpp/orders/:id`. |

## Production Roadmap

1. **Stripe access**: Ensure the account has Machine Payments / SPT access and the correct preview API version.
2. **x402 facilitator**: Implement real on-chain verification in `verifyTempoPayment` (e.g., via a Solana RPC for USDC on Tempo) or integrate a facilitator such as Coinbase Developer Platform.
3. **Fulfillment**: Wire completed MPP orders into the existing order/fulfillment pipeline (shipping address collection, Shopify order creation).
4. **Webhooks**: Reconcile `payment_intent.*` webhook events with stored MPP orders.

## Demonstration

```bash
# With the dev server running and STRIPE_SECRET_KEY + STRIPE_NETWORK_ID set
node scripts/test-mpp-flow.js
```

The script discovers a product, triggers the `402` challenge, and decodes it. The final SPT charge step is manual because it requires a token from a Stripe Link AI wallet (use Stripe's `link-cli mpp` against the printed `WWW-Authenticate` header).
