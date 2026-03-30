# Stripe MPP and x402 Protocol Implementation (Prototype)

This document outlines the implementation of the Stripe Machine Payments Protocol (MPP) and the x402 protocol within the A-OK Shop. These protocols allow AI agents to shop for products and perform machine-to-machine payments using the HTTP 402 "Payment Required" status code.

## Protocol Overview

### Stripe MPP (Machine Payments Protocol)
MPP is an open standard co-authored by Stripe and Tempo. It embeds payment negotiation directly into HTTP requests. When a resource (like a product) requires payment, the server returns a 402 status code with a JSON body containing a `challengeId` and a list of supported payment methods.

### x402 Protocol
Similar to MPP, x402 is a protocol for internet payments that leverages the HTTP 402 status code. It is backed by Coinbase and Stripe, focusing on protocol minimization and embedding payments directly into HTTP requests, often using cryptocurrency on networks like Base.

## Prototype Components

We have implemented a functional prototype with the following endpoints:

### 1. Agentic Product Feed
**Endpoint**: `GET /api/mpp/products`

Returns a list of products in a machine-readable format that highlights payment protocol capabilities. This allows agents to discover products and understand the payment methods required (e.g., Stripe MPP, x402).

### 2. MPP Buy Endpoint
**Endpoint**: `POST /api/mpp/buy`

This endpoint initiates the purchase flow.
- **First Request**: Returns a `402 Payment Required` response with:
    - `WWW-Authenticate: MPP challengeId="chal_..."` header.
    - JSON body with `challengeId`, `methods` (Stripe MPP, x402), and payment details (amount, currency, recipient address).
- **Subsequent Request**: After the agent completes the payment (e.g., on-chain), they retry the request with an `Authorization: MPP <challengeId>` header. If verified, the server returns the order confirmation and a receipt.

## Example Flow

1. **Agent Discovers Product**:
   ```bash
   GET /api/mpp/products
   ```

2. **Agent Attempts Purchase**:
   ```bash
   POST /api/mpp/buy
   { "variantId": "variant_123", "quantity": 1 }
   ```

3. **Server Responds with 402**:
   ```json
   {
     "status": 402,
     "challengeId": "chal_abc123",
     "methods": [
       {
         "type": "stripe-mpp",
         "recipient": "0x...",
         "network": "tempo"
       }
     ]
   }
   ```

4. **Agent Performs Payment**: The agent sends the specified amount to the recipient address on the given network.

5. **Agent Retries with Credential**:
   ```bash
   POST /api/mpp/buy
   Headers: { "Authorization": "MPP chal_abc123" }
   ```

6. **Server Delivers Resource**:
   ```json
   { "success": true, "order": { "id": "mpp_order_456" }, "receipt": "rcpt_789" }
   ```

## Production Roadmap

To move this prototype to production, the following steps are required:

1. **Stripe Private Preview Access**: Request access to "Machine Payments" in the Stripe Dashboard.
2. **Stripe API Version**: Use the `2026-03-04.preview` (or latest) API version.
3. **PaymentIntents with Deposit Mode**: Implement server-side logic to create Stripe PaymentIntents in `mode: 'deposit'` for each purchase, which generates unique crypto deposit addresses.
4. **Webhook Integration**: Use Stripe webhooks (`payment_intent.succeeded`) to verify payments and update the session status in a real database (e.g., Redis or PostgreSQL).
5. **x402 Facilitator**: For x402 support on mainnet, integrate with an x402 facilitator such as Coinbase Developer Platform (CDP).
6. **Production Secrets**: Configure `STRIPE_SECRET_KEY` and appropriate webhook secrets.

## Demonstration

You can run the demonstration script to see the flow in action:
```bash
# In a local development environment
node scripts/test-mpp-flow.js
```
