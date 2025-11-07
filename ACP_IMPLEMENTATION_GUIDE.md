# ACP Implementation Guide - Getting Started

**Status**: 📝 Phase 1 Complete (Documentation & Legal Pages)
**Next**: Phase 2 (API Implementation)

## What's Been Done ✅

### Documentation Created
- ✅ `ACP_OPENAI_INTEGRATION.md` - Complete project plan with timeline
- ✅ `ACP_TECHNICAL_SPEC.md` - Detailed API specifications & data models
- ✅ `app/privacy/page.tsx` - Privacy policy page
- ✅ `app/terms/page.tsx` - Terms of service page
- ✅ `app/returns/page.tsx` - Return policy page

### What's Next 🚧

## Phase 2: Dependencies & Core Libraries (15 min)

```bash
# Install required packages
npm install @vercel/kv

# Already installed (verify):
# - stripe (for SPT processing)
# - @stripe/stripe-js
```

## Phase 3: Scaffold API Structure (30 min)

Create these files:

```
app/
├── lib/
│   ├── kv.ts                    # Vercel KV client
│   ├── product-feed.ts          # Feed generation logic
│   ├── checkout-sessions.ts     # Session management
│   ├── tax-calculator.ts        # Stripe Tax integration
│   ├── shipping-calculator.ts   # Shipping cost logic
│   └── webhook-signing.ts       # HMAC utilities
├── api/
│   ├── feed/
│   │   └── products.json/
│   │       └── route.ts         # Product feed endpoint
│   ├── checkouts/
│   │   ├── route.ts             # POST (create), GET (list)
│   │   └── [id]/
│   │       ├── route.ts         # GET (retrieve), PUT (update)
│   │       ├── complete/
│   │       │   └── route.ts     # POST (complete with SPT)
│   │       └── cancel/
│   │           └── route.ts     # POST (cancel)
│   └── webhooks/
│       └── openai/
│           └── route.ts         # Receive OpenAI webhook events
└── middleware.ts                # API key authentication
```

## Phase 4: Implementation Checklist

### Product Feed (`app/api/feed/products.json/route.ts`)
- [ ] Fetch products from Shopify
- [ ] Map to OpenAI schema (see `ACP_TECHNICAL_SPEC.md`)
- [ ] Add control flags (`enable_search`, `enable_checkout`)
- [ ] Include merchant URLs (privacy, terms, returns)
- [ ] Test against OpenAI validator

### Session Storage (`app/lib/kv.ts`)
- [ ] Set up Vercel KV client
- [ ] Implement `setCheckoutSession()`
- [ ] Implement `getCheckoutSession()`
- [ ] Implement `deleteCheckoutSession()`
- [ ] Add 24-hour TTL

### Checkout Endpoints (`app/api/checkouts/*`)
- [ ] **POST /api/checkouts** - Create session
  - [ ] Validate cart items
  - [ ] Calculate line items
  - [ ] Generate fulfillment options
  - [ ] Calculate totals
  - [ ] Store in KV
- [ ] **GET /api/checkouts/:id** - Retrieve session
- [ ] **PUT /api/checkouts/:id** - Update session
  - [ ] Handle item updates
  - [ ] Handle address updates
  - [ ] Recalculate tax & shipping
- [ ] **POST /api/checkouts/:id/complete** - Process SPT
  - [ ] Create Stripe PaymentIntent with SPT
  - [ ] Wait for payment confirmation
  - [ ] Create order
  - [ ] Emit webhook to OpenAI
- [ ] **POST /api/checkouts/:id/cancel** - Cancel

### Tax & Shipping (`app/lib/*`)
- [ ] Implement Stripe Tax calculation
- [ ] Implement shipping cost logic
  - [ ] US standard: $7.95
  - [ ] US expedited: $15.95
  - [ ] Canada: $12.95
  - [ ] Digital: $0

### Webhooks (`app/lib/webhook-signing.ts`)
- [ ] Implement HMAC-SHA256 signing
- [ ] Implement signature verification
- [ ] Create webhook delivery with retry

### Security (`middleware.ts`)
- [ ] Add Bearer token validation
- [ ] Protect `/api/checkouts/*` routes
- [ ] Protect `/api/feed/*` routes (optional)

## Environment Variables Needed

Add to Vercel:

```bash
# Vercel KV (get from Vercel dashboard)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# OpenAI Integration
OPENAI_API_KEY=sk-proj-...              # From OpenAI dashboard
OPENAI_WEBHOOK_URL=https://...          # Provided by OpenAI
WEBHOOK_SECRET=...                       # Generate: openssl rand -hex 32

# Existing (already configured)
STRIPE_SECRET_KEY=sk_live_...
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_STOREFRONT_API_TOKEN=...
```

## Testing Workflow

1. **Local Testing**:
```bash
# Start dev server
npm run dev

# Test product feed
curl http://localhost:3000/api/feed/products.json | jq .

# Test create session
curl -X POST http://localhost:3000/api/checkouts \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"gid://shopify/ProductVariant/46776424202459","quantity":1}]}'
```

2. **Stripe Test Mode**:
- Use test SPT: `spt_test_...`
- Test payment flow without charging real cards

3. **OpenAI Registration**:
- Submit feed URL: `https://www.a-ok.shop/api/feed/products.json`
- Submit API base: `https://www.a-ok.shop/api`
- Provide webhook endpoint
- Test in ChatGPT sandbox

## Quick Start Commands

```bash
# 1. Install dependencies
npm install @vercel/kv

# 2. Set up Vercel KV
vercel env pull .env.local

# 3. Start development
npm run dev

# 4. Build for production
npm run build

# 5. Deploy
git add .
git commit -m "Implement OpenAI ACP integration"
git push origin main
```

## Helpful Resources

- **Our Docs**:
  - [Project Plan](./ACP_OPENAI_INTEGRATION.md)
  - [Technical Spec](./ACP_TECHNICAL_SPEC.md)

- **External Docs**:
  - [OpenAI Commerce](https://developers.openai.com/commerce)
  - [Stripe ACP](https://docs.stripe.com/agentic-commerce)
  - [Vercel KV](https://vercel.com/docs/storage/vercel-kv)

## Timeline

- **Now**: Phase 1 Complete ✅
- **Next 2 hours**: Install deps, scaffold files
- **Next 3 hours**: Implement core logic
- **Next 2 hours**: Testing & registration
- **Total**: ~7-8 hours remaining

## Current Status

```
├── ✅ Phase 1: Documentation & Legal (DONE)
├── 🚧 Phase 2: Dependencies (NEXT)
├── ⏳ Phase 3: API Implementation
├── ⏳ Phase 4: Testing & Registration
└── ⏳ Phase 5: OpenAI Approval & Launch
```

---

**Ready to continue?** Let's install dependencies and scaffold the API structure!

```bash
npm install @vercel/kv
```
