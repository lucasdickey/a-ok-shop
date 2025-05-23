# Agent Guidelines

Welcome to the A-OK Shop repository. This project is a custom Shopify storefront built with Next.js 14+, TypeScript, and Tailwind CSS.

## Project Overview

The A-OK Shop features:

- **Custom Shopify Storefront**: Product browsing, cart, and checkout
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

- Copy `.env.example` to `.env.local` and provide your Shopify credentials.
- Required keys: `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_API_TOKEN`.
- Optional: `SHOPIFY_ADMIN_API_TOKEN` for real discount code generation (see `SHOPIFY_DISCOUNT_SETUP.md`).

### Build Checks

- Before committing, run `npm run lint` and then `npm run build` to ensure the project compiles.
- The build step runs `scripts/generate-image-list.js` via the `prebuild` script, so ensure it completes successfully.

## Shopify API

- All Shopify requests use the Storefront GraphQL API.
- Discount code generation uses Admin API (optional, falls back to mock codes).
- Shared utilities can be found in `app/lib/shopify.ts`.

## Game Integration

- Game located at `/game` with embedded ChaosMonkey component
- Win condition: Collect 3 UBI Credits
- Reward: Discount code overlay with 25% off coupon
- Discount codes auto-generated via `/api/discount` endpoint

## Documentation

- Update `README.md` when configuration or usage instructions change.
- Keep documentation files in Markdown format.
- See `SHOPIFY_DISCOUNT_SETUP.md` for discount code configuration.

## Testing

- This project has no automated test suite yet. Manually verify product listing, filtering, cart, and checkout behavior after code changes.
- Test game functionality and discount code generation in both development and production modes.
