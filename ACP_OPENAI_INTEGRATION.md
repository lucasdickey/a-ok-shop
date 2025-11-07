# OpenAI Agentic Commerce Protocol (ACP) Integration

**Status**: 🚧 In Development
**Target Launch**: 1-day sprint
**Last Updated**: November 6, 2025

## Overview

This document outlines the complete integration of OpenAI's Agentic Commerce Protocol (ACP) with Stripe Instant Checkout to enable ChatGPT users to discover and purchase products from A-OK Shop directly within the chat interface.

## What We're Building

**Goal**: Enable ChatGPT users to:
1. Discover A-OK products through natural conversation
2. Browse catalog with variants, pricing, and images
3. Complete checkout entirely within ChatGPT
4. Pay securely using Stripe's SharedPaymentToken (SPT) system

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   ChatGPT   │ ◄─────► │  A-OK Shop   │ ◄─────► │   Stripe    │
│   (Agent)   │         │  (Merchant)  │         │  (Payment)  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │ 1. Discover products   │                        │
      │───────────────────────►│                        │
      │                        │                        │
      │ 2. Create checkout     │                        │
      │───────────────────────►│                        │
      │                        │                        │
      │ 3. Update cart/address │                        │
      │───────────────────────►│                        │
      │                        │                        │
      │ 4. Complete w/ SPT     │                        │
      │───────────────────────►│──── Process SPT ─────►│
      │                        │                        │
      │ 5. Order confirmation  │                        │
      │◄───────────────────────│                        │
```

## Key Components

### 1. Product Feed (OpenAI Discovery)
**Purpose**: Allow ChatGPT to discover and surface A-OK products

- **Endpoint**: `GET /api/feed/products.json`
- **Format**: JSON (OpenAI Product Feed Spec compliant)
- **Update Frequency**: Real-time (no caching for MVP)
- **Required Fields**: See [Technical Spec](./ACP_TECHNICAL_SPEC.md)

### 2. Checkout Session API (Stateful)
**Purpose**: Manage cart state across multiple agent interactions

**Endpoints**:
- `POST /api/checkouts` - Create session
- `GET /api/checkouts/:id` - Retrieve session
- `PUT /api/checkouts/:id` - Update session
- `POST /api/checkouts/:id/complete` - Complete with SPT
- `POST /api/checkouts/:id/cancel` - Cancel session

**Storage**: Redis/Vercel KV for session state

### 3. Stripe SharedPaymentToken Integration
**Purpose**: Securely process payments without handling raw card data

**Flow**:
1. ChatGPT collects payment from buyer
2. ChatGPT creates SharedPaymentToken (SPT) via Stripe
3. ChatGPT sends SPT to our `/complete` endpoint
4. We create PaymentIntent with SPT
5. Stripe processes payment under our account

**Key Benefit**: We never see raw card data, only secure SPT references

### 4. Webhooks & Events
**Purpose**: Keep ChatGPT informed of order lifecycle

**Events We Emit**:
- `order_created` - Order successfully created
- `order_updated` - Status changes (shipped, fulfilled, etc.)

**HMAC Signing**: All webhooks signed with shared secret

## Implementation Plan

### Phase 1: Product Feed & Legal Pages (2-3 hours)

**Files to Create**:
- `app/api/feed/products.json/route.ts` - Product feed endpoint
- `app/privacy/page.tsx` - Privacy policy
- `app/terms/page.tsx` - Terms of service
- `app/returns/page.tsx` - Return policy
- `app/lib/product-feed.ts` - Feed generation logic

**Tasks**:
- [x] Map Shopify products to OpenAI schema
- [ ] Add control flags (`enable_search`, `enable_checkout`)
- [ ] Generate stock legal pages
- [ ] Test feed validation

### Phase 2: Checkout Session API (3-4 hours)

**Files to Create**:
- `app/api/checkouts/route.ts` - Create & list sessions
- `app/api/checkouts/[id]/route.ts` - Get & update session
- `app/api/checkouts/[id]/complete/route.ts` - Complete with SPT
- `app/api/checkouts/[id]/cancel/route.ts` - Cancel session
- `app/lib/checkout-sessions.ts` - Session management
- `app/lib/tax-calculator.ts` - Tax calculation (Stripe Tax)
- `app/lib/shipping-calculator.ts` - Shipping calculation

**Dependencies**:
```bash
npm install @upstash/redis  # Session storage
npm install @stripe/stripe-js  # Stripe SDK (already installed)
```

**Tasks**:
- [ ] Set up Redis/KV storage
- [ ] Implement session CRUD operations
- [ ] Add tax calculation (Stripe Tax API)
- [ ] Add shipping calculation
- [ ] Implement SPT → PaymentIntent flow
- [ ] Add fulfillment options logic

### Phase 3: Security & Webhooks (1-2 hours)

**Files to Create**:
- `app/lib/webhook-signing.ts` - HMAC signing utilities
- `app/api/webhooks/openai/route.ts` - Receive webhooks from OpenAI
- `middleware.ts` - API key authentication

**Tasks**:
- [ ] Implement webhook signing (HMAC-SHA256)
- [ ] Add API key authentication
- [ ] Create webhook endpoint for OpenAI events
- [ ] Test signature verification

### Phase 4: Testing & Registration (1-2 hours)

**Tasks**:
- [ ] Test all 5 checkout endpoints locally
- [ ] Test SPT processing with Stripe test tokens
- [ ] Validate product feed against OpenAI schema
- [ ] Register with OpenAI Commerce Platform
- [ ] Submit feed URL and API base URL
- [ ] Test with OpenAI sandbox/staging

## Environment Variables

**New Variables Needed**:
```bash
# Redis/KV for session storage
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Or use Vercel KV (if available)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# OpenAI Integration
OPENAI_API_KEY=sk-...              # For API auth
OPENAI_WEBHOOK_URL=https://...     # Where to send order events
WEBHOOK_SECRET=...                 # For HMAC signing

# Existing (already configured)
STRIPE_SECRET_KEY=sk_live_...
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_STOREFRONT_API_TOKEN=...
```

## Success Criteria

- [ ] Product feed passes OpenAI validation
- [ ] All 5 checkout endpoints return correct schemas
- [ ] Can create session, add items, update address
- [ ] Can process test SPT and create PaymentIntent
- [ ] Webhooks successfully deliver to OpenAI
- [ ] Legal pages (privacy/terms/returns) published
- [ ] Registered with OpenAI Commerce Platform
- [ ] Successfully complete test purchase in ChatGPT sandbox

## Timeline

**Total Estimated Time**: 7-9 hours (1 working day)

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Feed & Legal | 2-3 hours | 🔲 Not Started |
| Phase 2: Checkout API | 3-4 hours | 🔲 Not Started |
| Phase 3: Security | 1-2 hours | 🔲 Not Started |
| Phase 4: Testing | 1-2 hours | 🔲 Not Started |

## Cost Estimates

**One-time Setup**:
- $0 - All open-source integration

**Recurring Monthly**:
- Redis/Upstash: $10-20/month (free tier: 10K commands/day)
- Stripe fees: 2.9% + $0.30 per transaction (standard)
- Stripe Tax: $0.50 per transaction (if enabled)
- Vercel: Included in current plan

**Expected Additional Load**:
- Redis: ~5 operations per checkout
- API calls: ~10 per checkout
- Stripe API: ~3 calls per checkout

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI approval delay | Blocks launch | Start application early, provide complete docs |
| Session storage costs | Ongoing expense | Use free tier initially, implement TTL cleanup |
| Tax calculation errors | Legal/financial | Use Stripe Tax API (handles 40+ countries) |
| SPT processing failures | Lost sales | Implement retry logic, monitor Stripe logs |
| Webhook delivery failures | Order sync issues | Implement exponential backoff, dead letter queue |

## Monitoring & Alerts

**Key Metrics to Track**:
- Checkout session creation rate
- Checkout completion rate (conversion)
- SPT processing success rate
- Webhook delivery success rate
- Average session value
- Time to complete checkout

**Alerts to Configure**:
- SPT processing failures (>5% failure rate)
- Webhook delivery failures (>3 consecutive failures)
- Redis connection errors
- API authentication failures

## Related Documentation

- [Technical Specification](./ACP_TECHNICAL_SPEC.md) - Detailed API schemas
- [ACP Production Setup](./ACP_PRODUCTION_SETUP.md) - Legacy lightweight ACP docs
- [Stripe Webhook Setup](./STRIPE_WEBHOOK_SETUP.md) - Existing Stripe config
- [OpenAI Commerce Docs](https://developers.openai.com/commerce) - Official spec
- [Stripe ACP Docs](https://docs.stripe.com/agentic-commerce) - Stripe integration guide

## Questions & Decisions

### Open Questions
- [ ] Should we support multiple shipping options (standard, expedited, overnight)?
- [ ] Do we need inventory reservation during checkout?
- [ ] Should we implement discount code support in Phase 1?
- [ ] What's our policy on international shipping for ACP orders?

### Decisions Made
- ✅ Use Upstash Redis for session storage (Vercel KV as backup)
- ✅ Use Stripe Tax API for all tax calculation
- ✅ Start with US shipping only, expand later
- ✅ Use 24-hour TTL for checkout sessions
- ✅ No discount codes in MVP, add later if needed

## Next Steps

1. **NOW**: Create technical spec document
2. **NOW**: Scaffold project structure
3. **TODAY**: Implement Phase 1 (Feed & Legal)
4. **TODAY**: Implement Phase 2 (Checkout API)
5. **TODAY**: Implement Phase 3 (Security)
6. **TODAY**: Test & register with OpenAI

---

**Project Lead**: Lucas Dickey
**Technical Implementation**: Claude Code
**Target Go-Live**: November 6, 2025 (EOD)
