# Agent Guidelines

Welcome to the A-OK Shop repository. This project is a custom Shopify storefront built with Next.js 14+, TypeScript, and Tailwind CSS.

## Development

- Node.js 18 or newer is required.
- Install dependencies with `npm install`.
- The app uses the Next.js App Router. Keep new routes and layouts under `app/`.
- Place reusable components in `app/components` and use TypeScript.
- Use Tailwind CSS for styling; configuration lives in `tailwind.config.js`.

### Environment Variables

- Copy `.env.example` to `.env.local` and provide your Shopify credentials.
- Required keys: `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_API_TOKEN`.

### Build Checks

- Before committing, run `npm run lint` and then `npm run build` to ensure the project compiles.
- The build step runs `scripts/generate-image-list.js` via the `prebuild` script, so ensure it completes successfully.

## Shopify API

- All Shopify requests use the Storefront GraphQL API.
- Shared utilities can be found in `app/lib/shopify.ts`.

## Documentation

- Update `README.md` when configuration or usage instructions change.
- Keep documentation files in Markdown format.

## Testing

- This project has no automated test suite yet. Manually verify product listing, filtering, cart, and checkout behavior after code changes.
