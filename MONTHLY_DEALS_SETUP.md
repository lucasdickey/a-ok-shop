# Monthly Deals Setup Guide

## Overview
Simple monthly deals implementation with Stripe Checkout for A-OK Store.

## Features Implemented
✅ Monthly deals landing page at `/monthly-deals`
✅ Single product configuration (easily updated monthly)
✅ Cart functionality for multiple sizes/colors
✅ Direct Stripe Checkout integration (hosted)
✅ Order confirmation page
✅ Webhook handling for payment confirmation
✅ Email notification logging (ready for email service integration)

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env.local` and configure:

```bash
# Stripe Configuration (Required for Monthly Deals)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Site URL (Required for redirect URLs)
NEXT_PUBLIC_SITE_URL=http://localhost:3002  # Local development
# NEXT_PUBLIC_SITE_URL=https://your-domain.com  # Production
```

### 2. Stripe Dashboard Configuration

#### Create Products in Stripe Dashboard (Optional)
- Products are created dynamically via API, but you can pre-create them for consistency

#### Configure Webhooks
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/monthly-deals/webhook` (or use ngrok for local testing)
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

#### Configure Branding (Optional)
1. Go to Stripe Dashboard > Settings > Branding
2. Upload logo, set colors to match A-OK Store theme:
   - Primary color: `#8B1E24` (A-OK red)
   - Background: `#F5F2DC` (A-OK cream)

### 3. Local Testing

#### Start Development Server
```bash
npm run dev
# Server runs on http://localhost:3002
```

#### Test Flow
1. Visit `http://localhost:3002/monthly-deals`
2. Select size and color
3. Add to cart
4. Click "PROCEED TO CHECKOUT"
5. Should redirect to Stripe Checkout (will fail without valid keys)

#### Test Webhooks Locally
Use Stripe CLI or ngrok:
```bash
# Option 1: Stripe CLI
stripe listen --forward-to localhost:3002/api/monthly-deals/webhook

# Option 2: ngrok
ngrok http 3002
# Then update webhook endpoint in Stripe Dashboard
```

## File Structure

```
app/
├── monthly-deals/
│   ├── page.tsx                    # Main landing page
│   └── success/
│       └── page.tsx                # Order confirmation page
└── api/
    └── monthly-deals/
        ├── create-checkout-session/
        │   └── route.ts            # Create Stripe checkout session
        ├── checkout-session/
        │   └── route.ts            # Retrieve session details
        └── webhook/
            └── route.ts            # Handle Stripe webhooks
```

## Updating Monthly Product

Edit the `MONTHLY_DEAL` object in `/app/monthly-deals/page.tsx`:

```typescript
const MONTHLY_DEAL = {
  id: "monthly-deal-2025-02",  // Update monthly
  title: "February 2025 - New Product",
  description: "...",
  price: 65.00,
  originalPrice: 85.00,
  image: "/images/new-product.jpg",  // Add image to public/images/
  sizes: ["S", "M", "L", "XL", "2XL"],
  colors: ["Black", "Navy", "Charcoal"],
  features: ["Feature 1", "Feature 2", "..."]
};
```

## Email Integration

Currently emails are logged to console. To implement actual email sending:

1. Choose email service (Amazon SES, SendGrid, etc.)
2. Update `sendConfirmationEmail()` function in webhook route
3. Add email service credentials to environment variables

## Security Notes

- Webhook endpoint validates Stripe signatures
- No payment data stored locally
- All transactions processed by Stripe
- Environment variables required for security

## Production Deployment

1. Set production environment variables in Vercel/hosting platform
2. Update webhook endpoint in Stripe Dashboard
3. Configure custom domain for professional appearance
4. Test with Stripe test mode first, then switch to live mode

## Troubleshooting

### Common Issues
- **"Invalid signature" webhook error**: Check `STRIPE_WEBHOOK_SECRET`
- **Checkout redirect fails**: Verify `NEXT_PUBLIC_SITE_URL` is correct
- **Cart doesn't persist**: Check if CartProvider is wrapping the app

### Debug Mode
Check browser console and server logs for detailed error messages.