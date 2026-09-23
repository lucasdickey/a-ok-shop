# Agent Guidelines

Welcome to the A-OK Shop repository. This project is a custom storefront built with Next.js 14+, TypeScript, and Tailwind CSS, with checkout on Stripe.

## Project Overview

The A-OK Shop features:

- **Custom Storefront**: Product browsing, cart, and Stripe checkout
- **Embedded Game**: Pac-Man/Snake hybrid with reward system at `/game`
- **Discount Code System**: Win-based 25% discount codes via `/api/discount`
- **Self-Replicating Art Gallery**: Dynamic image generation and display
- **Responsive Design**: Mobile-friendly interface

## Development

- Node.js 18 or newer is required.
- Install dependencies with `npm install`.
- The app uses the Next.js App Router. Keep new routes and layouts under `app/`.
- Place reusable components in `app/components` and use TypeScript.
- Use Tailwind CSS for styling; configuration lives in `tailwind.config.js`.

### Environment Variables

- Copy `.env.example` to `.env.local` and fill in the values.
- `STRIPE_SECRET_KEY` enables checkout and real discount codes; without it, `/api/discount` returns mock codes.
- `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `ORDER_NOTIFICATION_EMAIL` enable the owner's paid-order alerts.

### Build Checks

- Before committing, run `npm run lint` and then `npm run build` to ensure the project compiles.
- The build step runs `scripts/generate-image-list.js` via the `prebuild` script, so ensure it completes successfully.

## Catalog and Checkout

- Product data comes from `product-catalog.json` through `app/lib/catalog.ts`. There are no catalog API calls.
- Every tee and hoodie is printed on demand in XS–2XL; the list lives in `app/lib/sizes.ts`.
- Checkout (`app/api/catalog/checkout/route.ts`) re-prices every line from the catalog and creates a Stripe Checkout session.
- Discount codes are Stripe promotion codes created by `/api/discount` (mock codes when Stripe isn't configured).
- `scripts/sync-stripe-products.js` keeps Stripe products and prices in step with the catalog (see `STRIPE_CATALOG_SYNC.md`).

## Game Integration

- Game located at `/game` with embedded ChaosMonkey component
- Win condition: Collect 3 UBI Credits
- Reward: Discount code overlay with 25% off coupon
- Discount codes auto-generated via `/api/discount` endpoint

## Documentation

- Update `README.md` when configuration or usage instructions change.
- Keep documentation files in Markdown format.
- See `STRIPE_CATALOG_SYNC.md` and `STRIPE_WEBHOOK_SETUP.md` for Stripe setup.

## Testing

- This project has no automated test suite yet. Manually verify product listing, filtering, cart, and checkout behavior after code changes.
- Test game functionality and discount code generation in both development and production modes.
