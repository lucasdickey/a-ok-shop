# ACP Production Setup Guide

## Stripe Configuration

### 1. Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_live_...` for production or `sk_test_...` for testing)

### 2. Configure Webhook Endpoint

The ACP implementation uses Stripe webhooks to track payment lifecycle events.

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://a-ok.shop/api/acp/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

### 3. Enable Automatic Tax (Optional but Recommended)

1. In Stripe Dashboard, go to **Products** → **Tax**
2. Enable **Stripe Tax**
3. Configure your tax settings for US, CA, and other relevant regions

Note: The ACP checkout endpoint has `automatic_tax: { enabled: true }` configured in `app/api/acp/checkout/route.ts:179`

---

## Vercel Configuration

### 1. Set Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

**Required:**
```bash
STRIPE_SECRET_KEY=sk_live_...your-secret-key...
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret...
```

**Optional (for CORS configuration):**
```bash
ACP_ALLOWED_ORIGINS=https://agent.example.com,https://partner-api.example.com
```

**Existing (keep these):**
```bash
SHOPIFY_STORE_DOMAIN=aokstore.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN=...your-token...
```

3. Set environment for each variable:
   - **Production** - for live site
   - **Preview** - for PR deployments (use test keys)
   - **Development** - for local dev (use test keys)

### 2. Redeploy

After adding environment variables:
1. Go to **Deployments**
2. Click on the latest deployment
3. Click **Redeploy** to pick up new environment variables

---

## Testing the Setup

### 1. Test Catalog Endpoint

```bash
curl https://a-ok.shop/api/acp/catalog
```

Expected: JSON response with `"protocol": "acp-draft-2024-12"`

### 2. Test Checkout Creation

```bash
curl -X POST https://a-ok.shop/api/acp/checkout \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-agent-domain.com" \
  -d '{
    "cart": {
      "items": [
        {"variantId": "gid://shopify/ProductVariant/46776424202459", "quantity": 1}
      ]
    },
    "customer": {"email": "test@example.com"}
  }'
```

Expected: JSON response with Stripe checkout URL

### 3. Test CORS

```bash
curl -i -H "Origin: https://unauthorized-site.com" https://a-ok.shop/api/acp/catalog
```

Expected: Should NOT see `access-control-allow-origin: https://unauthorized-site.com`
Should see production default origin instead.

### 4. Test Webhook Delivery

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Check the webhook logs for successful delivery (200 OK)

---

## Security Checklist

- [ ] Using live mode Stripe keys (not test keys) in production
- [ ] Webhook secret configured in Vercel
- [ ] `ACP_ALLOWED_ORIGINS` set to only trusted agent domains (or omit to use defaults)
- [ ] `NODE_ENV=production` in Vercel (should be automatic)
- [ ] HTTPS enforced on all endpoints (Vercel handles this)
- [ ] Stripe webhook signature verification enabled (handled by webhook route)

---

## Monitoring

### Stripe Dashboard
- Monitor failed payments: **Payments** → **Failed**
- Check webhook delivery: **Developers** → **Webhooks** → Click endpoint → **Events**
- View logs: **Developers** → **Logs**

### Vercel Logs
- Real-time logs: `vercel logs production`
- Or view in dashboard: **Deployments** → Click deployment → **Functions**

### Error Tracking
Consider adding:
- Sentry for error monitoring
- Datadog for APM
- LogDNA/Logtail for log aggregation

---

## Troubleshooting

### "Stripe is not configured" error
- Check `STRIPE_SECRET_KEY` is set in Vercel environment variables
- Verify variable is set for correct environment (Production/Preview)
- Redeploy after adding environment variables

### CORS errors
- Verify requesting origin is in `ACP_ALLOWED_ORIGINS`
- Check that origin includes protocol (`https://` not just `example.com`)
- For development, ensure `NODE_ENV=development` is NOT set in production

### Webhook failures
- Verify webhook URL is correct: `https://a-ok.shop/api/acp/webhook`
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Review webhook logs in Stripe Dashboard for error details

### Checkout sessions expire
- Default expiration is 24 hours
- Check `expires_at` timestamp in checkout response
- Sessions must be used before expiration

---

## Cost Considerations

### Stripe Fees
- 2.9% + $0.30 per successful card charge (US)
- Stripe Tax: $0.50 per transaction (if enabled)
- No monthly fees for standard usage

### Vercel Costs
- Hobby plan: Free for personal projects
- Pro plan: $20/month (recommended for production)
- Function invocations: Included in plan limits

---

## Next Steps After Production Deployment

1. **Test with Real Agents**: Share ACP endpoints with authorized agents
2. **Monitor Volume**: Track transaction counts and adjust Stripe/Vercel plans
3. **Set Up Alerts**: Configure Stripe email alerts for failed payments
4. **Document API**: Share ACP integration guide with partners
5. **Plan Rate Limiting**: Consider implementing rate limiting for high-volume scenarios

---

## Support

- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support
- ACP Implementation: See PR #12 for technical details
