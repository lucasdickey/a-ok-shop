# Stripe Webhook Setup Guide

## Webhook Endpoint

**Primary (Unified) Endpoint:**
```
POST /api/stripe/webhook
```

This endpoint handles orders from both:
- Main catalog (`metadata.source = "a-ok-shop-catalog"`)
- Monthly deals (`metadata.source = "monthly-deals"`)

**Legacy Endpoint (for backward compatibility):**
```
POST /api/monthly-deals/webhook
```
This redirects to the unified webhook. Can be deleted once Stripe is updated.

---

## Production Setup

### 1. Create Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) → Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
5. Click "Add endpoint"

### 2. Get Webhook Signing Secrets

You have **two webhook destinations** configured in Stripe, both pointing to the same endpoint but with different secrets. The webhook handler will try both secrets automatically.

1. Copy both signing secrets from Stripe
2. Add to Vercel environment variables:
   ```
   STRIPE_WEBHOOK_SECRET_1=whsec_Z35wbTt7Sqw6Ipe3YjtiPjeFpivPUZnk
   STRIPE_WEBHOOK_SECRET_2=whsec_p75EmetZkPhDMW5IZe1bSF3eRGtoPcLf
   ```

The webhook handler will automatically try both secrets when verifying incoming webhooks.

### 3. Update Stripe Keys to Live Mode

In Vercel environment variables, replace test keys with live keys:
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Local Development Testing

### Using Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_...`) to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   ```

---

## What the Webhook Does

When a successful checkout occurs:

1. ✅ **Validates** the webhook signature for security
2. ✅ **Retrieves** full order details from Stripe
3. ✅ **Identifies** the source (catalog vs monthly-deals)
4. ✅ **Logs** order information including:
   - Customer email and name
   - Shipping address
   - Items purchased (with size/color metadata)
   - Total, tax, and shipping amounts
   - Payment status
5. ✅ **Prepares** confirmation email data (logs to console)

### Next Steps (TODO)

Currently the webhook only logs order information. You'll want to add:

- [ ] **Email service integration** (Resend, SendGrid, Amazon SES)
- [ ] **Order database storage** (if needed)
- [ ] **Fulfillment service integration** (Printful, Shipstation, etc.)
- [ ] **Inventory updates** (if managing stock)
- [ ] **Analytics tracking** (order conversion events)

---

## Email Service Integration Example

Recommended: Use [Resend](https://resend.com) for Next.js apps

1. Install Resend:
   ```bash
   npm install resend
   ```

2. Add API key to environment:
   ```
   RESEND_API_KEY=re_...
   ```

3. Uncomment and customize the email sending code in:
   ```
   app/api/stripe/webhook/route.ts (line ~147)
   ```

---

## Troubleshooting

### Webhook signature verification fails
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Check that you're using the correct secret for test/live mode
- Verify the webhook URL matches exactly

### Orders not being logged
- Check Vercel logs for errors
- Verify webhook is active in Stripe Dashboard
- Test with Stripe CLI locally first

### Events not triggering
- Ensure you selected the right events in Stripe Dashboard
- Check webhook status (active vs inactive)
- Look for failed delivery attempts in Stripe Dashboard
