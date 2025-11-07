# ACP Technical Specification

**Version**: 1.0.0
**Protocol**: `acp-draft-2024-12`
**Last Updated**: November 6, 2025

This document provides detailed technical specifications for implementing OpenAI's Agentic Commerce Protocol with Stripe SharedPaymentToken integration.

## Table of Contents

1. [Product Feed API](#product-feed-api)
2. [Checkout Session API](#checkout-session-api)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Security & Authentication](#security--authentication)
6. [Webhooks](#webhooks)
7. [Stripe Integration](#stripe-integration)

---

## Product Feed API

### GET /api/feed/products.json

**Purpose**: Provide OpenAI-compliant product feed for ChatGPT discovery

**Response Format**: JSON array of products

**Response Schema**:
```typescript
interface ProductFeedItem {
  // Required: Basic Product Data
  id: string;                    // Shopify product ID
  title: string;                 // Max 150 chars
  description: string;           // Max 5000 chars, plain text
  link: string;                  // Product detail page URL
  image_link: string;            // Primary product image

  // Required: Pricing
  price: string;                 // Format: "29.99 USD"
  availability: 'in_stock' | 'out_of_stock' | 'preorder';

  // Required: Merchant Info
  brand: string;                 // "A-OK Shop"
  seller_name: string;           // Max 70 chars
  seller_url: string;            // Storefront URL
  seller_privacy_policy: string; // Privacy policy URL
  seller_tos: string;            // Terms of service URL

  // Required: Returns
  return_policy: string;         // Return policy URL
  return_window: number;         // Days (e.g., 30)

  // Required: Control Flags
  enable_search: boolean;        // true
  enable_checkout: boolean;      // true

  // Optional: Additional Images
  additional_image_link?: string; // Comma-separated URLs

  // Optional: Variants
  item_group_id?: string;        // Parent product ID for variants
  color?: string;                // Max 40 chars
  size?: string;                 // Max 20 chars

  // Optional: Performance
  popularity_score?: number;     // 0-5 scale
  product_review_count?: number;
  product_review_rating?: number; // 0-5 scale
}
```

**Example Response**:
```json
[
  {
    "id": "gid://shopify/Product/8755818758363",
    "title": "A-OK GLITCHED VECTORS TEE",
    "description": "Emergent Patterns. Corrupted Glyphs...",
    "link": "https://www.a-ok.shop/products/a-ok-glitch-art-face-mask-t-shirt",
    "image_link": "https://www.a-ok.shop/images/products/glitched-vectors-0.png",
    "additional_image_link": "https://www.a-ok.shop/images/products/glitched-vectors-1.png",
    "price": "50.00 USD",
    "availability": "in_stock",
    "brand": "A-OK Shop",
    "seller_name": "A-OK Shop",
    "seller_url": "https://www.a-ok.shop",
    "seller_privacy_policy": "https://www.a-ok.shop/privacy",
    "seller_tos": "https://www.a-ok.shop/terms",
    "return_policy": "https://www.a-ok.shop/returns",
    "return_window": 30,
    "enable_search": true,
    "enable_checkout": true,
    "item_group_id": "gid://shopify/Product/8755818758363",
    "color": "Red"
  }
]
```

**Caching**: No caching for MVP (real-time)
**Rate Limiting**: None for MVP

---

## Checkout Session API

### POST /api/checkouts

**Purpose**: Create new checkout session

**Authentication**: `Authorization: Bearer {OPENAI_API_KEY}`

**Request Body**:
```typescript
interface CreateCheckoutRequest {
  items: Array<{
    id: string;        // Product variant ID
    quantity: number;  // Must be > 0
  }>;
  buyer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;  // E.164 format
  };
  fulfillment_address?: Address;
}

interface Address {
  name: string;
  line_one: string;
  line_two?: string;
  city: string;
  state: string;          // ISO 3166-2 (e.g., "CA")
  country: string;        // ISO 3166-1 (e.g., "US")
  postal_code: string;
  phone_number?: string;  // E.164 format
}
```

**Response Body**:
```typescript
interface CheckoutSession {
  id: string;              // Session ID (e.g., "cs_abc123")
  status: 'not_ready_for_payment' | 'ready_for_payment' | 'in_progress' | 'completed' | 'canceled';
  currency: string;        // Lowercase ISO 4217 (e.g., "usd")

  line_items: LineItem[];
  fulfillment_options: FulfillmentOption[];
  totals: Total[];

  messages?: Message[];
  links?: {
    privacy_policy?: string;
    terms_of_service?: string;
    return_policy?: string;
  };
}
```

**Status Codes**:
- `201 Created` - Session created successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Missing/invalid API key
- `500 Internal Server Error` - Server error

---

### GET /api/checkouts/:id

**Purpose**: Retrieve existing checkout session

**Authentication**: `Authorization: Bearer {OPENAI_API_KEY}`

**Path Parameters**:
- `id` (string, required) - Checkout session ID

**Response**: Same as POST /api/checkouts

**Status Codes**:
- `200 OK` - Session found
- `404 Not Found` - Session doesn't exist
- `401 Unauthorized` - Invalid API key

---

### PUT /api/checkouts/:id

**Purpose**: Update existing checkout session

**Authentication**: `Authorization: Bearer {OPENAI_API_KEY}`

**Request Body**:
```typescript
interface UpdateCheckoutRequest {
  items?: Array<{
    id: string;
    quantity: number;
  }>;
  fulfillment_address?: Address;
  fulfillment_option_id?: string;
  buyer?: Buyer;
}
```

**Response**: Updated CheckoutSession

**Behavior**:
- Recalculates line items if `items` changed
- Recalculates shipping if `fulfillment_address` changed
- Recalculates tax if address or items changed
- Sets status to `ready_for_payment` if all required data present

**Status Codes**:
- `200 OK` - Session updated
- `400 Bad Request` - Invalid update data
- `404 Not Found` - Session doesn't exist
- `409 Conflict` - Session already completed/canceled

---

### POST /api/checkouts/:id/complete

**Purpose**: Complete checkout with SharedPaymentToken

**Authentication**: `Authorization: Bearer {OPENAI_API_KEY}`

**Request Body**:
```typescript
interface CompleteCheckoutRequest {
  payment_data: {
    token: string;              // SharedPaymentToken (e.g., "spt_abc123")
    provider: "stripe";         // Only "stripe" supported
    billing_address?: Address;
  };
}
```

**Response**:
```typescript
interface CompleteCheckoutResponse {
  id: string;           // Checkout session ID
  status: "completed";
  order: {
    id: string;         // Internal order ID
    checkout_session_id: string;
    permalink_url: string; // Order detail page
  };
  totals: Total[];      // Final amounts charged
}
```

**Processing Steps**:
1. Validate session exists and status is `ready_for_payment`
2. Create Stripe PaymentIntent with SPT
3. Wait for PaymentIntent confirmation
4. Create order in database
5. Emit `order_created` webhook to OpenAI
6. Update session status to `completed`
7. Return order details

**Status Codes**:
- `200 OK` - Order created successfully
- `400 Bad Request` - Invalid payment data
- `402 Payment Required` - Payment declined
- `404 Not Found` - Session doesn't exist
- `409 Conflict` - Session already completed

---

### POST /api/checkouts/:id/cancel

**Purpose**: Cancel checkout session

**Authentication**: `Authorization: Bearer {OPENAI_API_KEY}`

**Request Body**: Empty `{}`

**Response**: CheckoutSession with `status: "canceled"`

**Behavior**:
- Releases inventory reservation (if implemented)
- Session cannot be resumed after cancellation

**Status Codes**:
- `200 OK` - Session canceled
- `404 Not Found` - Session doesn't exist
- `405 Method Not Allowed` - Session already completed

---

## Data Models

### LineItem

```typescript
interface LineItem {
  id: string;          // Line item ID
  item: {
    id: string;        // Product variant ID
    title: string;     // Product name + variant
    image_url?: string;
  };
  quantity: number;

  // All amounts in smallest currency unit (cents for USD)
  base_amount: number;     // Unit price × quantity
  discount: number;        // Total discount applied
  subtotal: number;        // base_amount - discount
  tax: number;             // Tax amount
  total: number;           // subtotal + tax
}
```

**Validation Rules**:
- `quantity` must be > 0
- `subtotal = base_amount - discount`
- `total = subtotal + tax`
- All amounts must be non-negative integers

---

### Total

```typescript
interface Total {
  type: 'items_base_amount' | 'items_discount' | 'subtotal' |
        'discount' | 'fulfillment' | 'tax' | 'fee' | 'total';
  display_text: string;    // Human-readable label
  amount: number;          // Amount in smallest currency unit
}
```

**Example**:
```json
[
  { "type": "items_base_amount", "display_text": "Subtotal", "amount": 5000 },
  { "type": "items_discount", "display_text": "Discount", "amount": 0 },
  { "type": "fulfillment", "display_text": "Shipping", "amount": 795 },
  { "type": "tax", "display_text": "Tax", "amount": 471 },
  { "type": "total", "display_text": "Total", "amount": 6266 }
]
```

---

### FulfillmentOption

**Shipping Option**:
```typescript
interface ShippingOption {
  type: "shipping";
  id: string;                 // Unique fulfillment ID
  title: string;              // "Standard Shipping"
  subtitle?: string;          // "3-5 business days"
  carrier_info?: {
    name: string;             // "USPS", "FedEx", etc.
    tracking_available: boolean;
  };
  earliest_delivery_time?: string;  // RFC 3339 timestamp
  latest_delivery_time?: string;    // RFC 3339 timestamp

  subtotal: number;           // Shipping cost before tax
  tax: number;                // Tax on shipping
  total: number;              // subtotal + tax
}
```

**Digital Option**:
```typescript
interface DigitalOption {
  type: "digital";
  id: string;
  title: string;              // "Digital Download"
  subtitle?: string;          // "Instant delivery"

  subtotal: number;           // Always 0 for digital
  tax: number;
  total: number;
}
```

---

### Message

```typescript
interface Message {
  type: "info" | "error";
  code?: string;              // Error code (see Error Codes below)
  param?: string;             // JSONPath to problematic field
  content_type: "plain" | "markdown";
  content: string;            // Message text
}
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    type: "invalid_request";
    code: string;              // See error codes below
    message: string;           // Human-readable message
    param?: string;            // JSONPath to field (e.g., "$.items[0].quantity")
  };
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `missing` | Required field missing | 400 |
| `invalid` | Field value is invalid | 400 |
| `out_of_stock` | Product unavailable | 400 |
| `payment_declined` | Payment was declined | 402 |
| `requires_sign_in` | User auth required | 401 |
| `requires_3ds` | 3D Secure needed | 400 |
| `session_expired` | Session TTL exceeded | 410 |
| `session_completed` | Already completed | 409 |
| `internal_error` | Server error | 500 |

### Example Error Response

```json
{
  "error": {
    "type": "invalid_request",
    "code": "out_of_stock",
    "message": "The selected product variant is currently out of stock",
    "param": "$.items[0].id"
  }
}
```

---

## Security & Authentication

### API Key Authentication

**Header**: `Authorization: Bearer {OPENAI_API_KEY}`

**Validation**:
```typescript
// middleware.ts
if (!req.headers.authorization?.startsWith('Bearer ')) {
  return 401 Unauthorized
}

const token = req.headers.authorization.substring(7);
if (token !== process.env.OPENAI_API_KEY) {
  return 403 Forbidden
}
```

**Environment Variable**:
```bash
OPENAI_API_KEY=sk-proj-...your-key...
```

---

### Request Signing (Webhooks)

**Algorithm**: HMAC-SHA256

**Headers**:
- `X-Signature`: HMAC signature
- `X-Timestamp`: Unix timestamp (milliseconds)

**Signature Generation**:
```typescript
import crypto from 'crypto';

function signPayload(payload: string, secret: string, timestamp: number): string {
  const data = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}
```

**Signature Verification**:
```typescript
function verifySignature(
  payload: string,
  signature: string,
  timestamp: number,
  secret: string
): boolean {
  const expected = signPayload(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Webhooks

### Events We Emit to OpenAI

#### order_created

**Trigger**: Checkout completed successfully

**Payload**:
```typescript
interface OrderCreatedEvent {
  event: "order_created";
  timestamp: number;          // Unix timestamp (ms)
  data: {
    checkout_session_id: string;
    order_id: string;
    permalink_url: string;    // Order detail page
    status: "created" | "confirmed" | "manual_review";
  };
}
```

#### order_updated

**Trigger**: Order status changed (shipped, fulfilled, etc.)

**Payload**:
```typescript
interface OrderUpdatedEvent {
  event: "order_updated";
  timestamp: number;
  data: {
    checkout_session_id: string;
    order_id: string;
    permalink_url: string;
    status: "confirmed" | "shipped" | "fulfilled" | "canceled";
    tracking_number?: string;
    carrier?: string;
    refunds?: Array<{
      type: "store_credit" | "original_payment";
      amount: number;
    }>;
  };
}
```

---

### Webhook Delivery

**Endpoint**: `POST {OPENAI_WEBHOOK_URL}`

**Headers**:
```
Content-Type: application/json
X-Signature: {hmac_signature}
X-Timestamp: {unix_timestamp_ms}
```

**Retry Policy**:
- Retry on 5xx errors
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 retries
- Dead letter queue after exhaustion

---

## Stripe Integration

### SharedPaymentToken (SPT) Flow

**1. ChatGPT creates SPT** (agent-side):
```bash
curl https://api.stripe.com/v1/shared_payment/issued_tokens \
  -d payment_method=pm_card_visa \
  -d usage_limits[currency]=usd \
  -d usage_limits[max_amount]=10000 \
  -d seller_details[network_id]=bn_abc123 \
  -d seller_details[external_id]=cs_xyz789
```

**2. We receive SPT** in `/complete` endpoint:
```json
{
  "payment_data": {
    "token": "spt_abc123",
    "provider": "stripe"
  }
}
```

**3. We create PaymentIntent with SPT**:
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: session.totals.find(t => t.type === 'total').amount,
  currency: session.currency,
  shared_payment_granted_token: payment_data.token,  // ← SPT here
  metadata: {
    checkout_session_id: session.id,
    protocol: 'acp-draft-2024-12'
  }
});
```

**4. Stripe processes payment** automatically

---

### Tax Calculation (Stripe Tax)

```typescript
import Stripe from 'stripe';

async function calculateTax(
  lineItems: LineItem[],
  address: Address
): Promise<number> {
  const calculation = await stripe.tax.calculations.create({
    currency: 'usd',
    line_items: lineItems.map(item => ({
      amount: item.subtotal,
      reference: item.id
    })),
    customer_details: {
      address: {
        line1: address.line_one,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country
      },
      address_source: 'shipping'
    }
  });

  return calculation.tax_amount_exclusive;
}
```

---

### Risk Assessment

```typescript
// Retrieve SPT details for fraud signals
const grantedToken = await stripe.sharedPayment.grantedTokens.retrieve(
  payment_data.token
);

const riskSignals = {
  fraudulent_dispute: grantedToken.risk_insights.fraudulent_dispute,
  card_testing: grantedToken.risk_insights.card_testing,
  stolen_card: grantedToken.risk_insights.stolen_card,
  bot_activity: grantedToken.risk_insights.bot_activity
};

// Each includes .score and .recommendation ("block" | "continue")
if (riskSignals.fraudulent_dispute.recommendation === 'block') {
  throw new Error('High fraud risk detected');
}
```

---

## Session Storage (Vercel KV)

### Setup

```bash
# Install Vercel KV SDK
npm install @vercel/kv
```

```typescript
// app/lib/kv.ts
import { kv } from '@vercel/kv';

export async function setCheckoutSession(id: string, data: CheckoutSession) {
  await kv.set(`checkout:${id}`, JSON.stringify(data), {
    ex: 86400  // 24 hour TTL
  });
}

export async function getCheckoutSession(id: string): Promise<CheckoutSession | null> {
  const data = await kv.get<string>(`checkout:${id}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteCheckoutSession(id: string) {
  await kv.del(`checkout:${id}`);
}
```

### Key Naming Convention

- Checkout sessions: `checkout:{session_id}`
- TTL: 24 hours (86400 seconds)

---

## Performance Considerations

### Response Time Targets

| Endpoint | Target | Max |
|----------|--------|-----|
| GET /api/feed/products.json | < 500ms | 2s |
| POST /api/checkouts | < 300ms | 1s |
| GET /api/checkouts/:id | < 100ms | 500ms |
| PUT /api/checkouts/:id | < 500ms | 2s |
| POST /api/checkouts/:id/complete | < 2s | 5s |

### Caching Strategy

**Product Feed**: No caching (real-time)
**Checkout Sessions**: In-memory via Vercel KV
**Shopify Catalog**: Consider 5-minute cache for catalog endpoint

---

## Testing Checklist

- [ ] Product feed validates against OpenAI schema
- [ ] Can create checkout session with valid items
- [ ] Can retrieve session by ID
- [ ] Can update items in session
- [ ] Can update fulfillment address
- [ ] Tax recalculates correctly
- [ ] Shipping options update based on address
- [ ] Can complete with test SPT
- [ ] PaymentIntent created successfully
- [ ] Order webhooks deliver to OpenAI
- [ ] API key auth works
- [ ] Webhook signatures verify correctly
- [ ] Error responses match spec
- [ ] Session TTL expires after 24 hours

---

## Reference Links

- [OpenAI Commerce Docs](https://developers.openai.com/commerce)
- [OpenAI Product Feed Spec](https://developers.openai.com/commerce/specs/feed)
- [OpenAI Agentic Checkout Spec](https://developers.openai.com/commerce/specs/checkout)
- [Stripe ACP Integration](https://docs.stripe.com/agentic-commerce)
- [Stripe SharedPaymentToken Docs](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens)
- [ACP GitHub Repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

---

**Document Version**: 1.0.0
**Last Updated**: November 6, 2025
**Status**: 🚧 Implementation in Progress
