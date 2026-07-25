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
   - ✅ `checkout.session.completed` — instant payments; fulfillment trigger
   - ✅ `checkout.session.async_payment_succeeded` — delayed methods (bank debits, vouchers) clearing later
   - ✅ `checkout.session.async_payment_failed` — delayed payment that never cleared; do **not** fulfill
   - ✅ `payment_intent.succeeded` — machine-initiated (MPP agent) orders
   - ✅ `payment_intent.payment_failed` — failure visibility in logs
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

On `checkout.session.completed` / `checkout.session.async_payment_succeeded`:

1. ✅ **Verifies** the Stripe signature (tries each configured secret)
2. ✅ **De-duplicates** by event ID, so Stripe retries never re-send emails
3. ✅ **Re-reads** the session from Stripe, expanding line items down to the
   product (so size/colour metadata is available) and the charge
4. ✅ **Refuses to fulfill unpaid sessions** — a completed session with
   `payment_status: "unpaid"` is a delayed payment still in flight; it is
   fulfilled later on `checkout.session.async_payment_succeeded`
5. ✅ **Triggers Stripe's own receipt** by setting `receipt_email` on the
   **Charge** (setting it on an already-succeeded PaymentIntent does nothing —
   receipts are generated from the Charge)
6. ✅ **Emails the customer** an itemised order confirmation via Resend
7. ✅ **Emails the operator** a fulfillment alert, so no order goes unnoticed
8. ✅ **Returns a non-2xx on transient failure** so Stripe retries with backoff

### Retry semantics

| Situation | Response | Stripe behaviour |
| --- | --- | --- |
| Handled successfully | 200 | Done |
| Duplicate delivery | 200 | Done |
| Email provider error / network failure | 500 | Retries with backoff (up to 3 days) |
| `RESEND_API_KEY` not configured | 200 + error log | No retry — retrying cannot fix config |
| Bad signature | 400 | No retry |

### Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Stripe API access |
| `STRIPE_WEBHOOK_SECRET_1` / `_2` / `STRIPE_WEBHOOK_SECRET` | Yes (at least one) | Signature verification |
| `RESEND_API_KEY` | **Yes for emails** | Without it, **no confirmation email is sent** |
| `ORDER_EMAIL_FROM` | Recommended | Verified Resend sender, e.g. `A-OK Shop <orders@a-ok.shop>` |
| `ORDER_NOTIFICATION_EMAIL` | **Recommended** | Operator address for fulfillment alerts |
| `REDIS_URL` | Optional | Shares webhook de-duplication across instances |
| `STRIPE_AUTOMATIC_TAX_ENABLED` | Optional | `true` only after registering tax locations |

`ORDER_EMAIL_FROM` must be on a domain verified in Resend, otherwise every send
is rejected and orders arrive with no customer email.

### Dashboard settings worth checking

- **Settings → Emails → "Successful payments"** — enable so Stripe also sends
  its own receipt as a backstop.
- **Test mode sends no receipts** to real inboxes; verify receipts in live mode
  (or with a real test purchase) rather than assuming.

### Still to build

- [ ] Order database storage
- [ ] Fulfillment service integration (Printful, Shipstation, etc.)
- [ ] Inventory updates
- [ ] Analytics tracking (order conversion events)

Until a fulfillment integration exists, the operator alert email is the record
of record — `ORDER_NOTIFICATION_EMAIL` must be set.

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

### No confirmation email arrived
- Confirm `RESEND_API_KEY` is set in the deployment environment — without it the
  webhook logs `RESEND_API_KEY is not set` and sends nothing
- Confirm `ORDER_EMAIL_FROM` uses a domain verified in Resend
- Check the Stripe Dashboard webhook delivery log for non-2xx responses
- Search logs for `[orders]` to see every order the webhook processed

### Events not triggering
- Ensure you selected the right events in Stripe Dashboard
- Check webhook status (active vs inactive)
- Look for failed delivery attempts in Stripe Dashboard
