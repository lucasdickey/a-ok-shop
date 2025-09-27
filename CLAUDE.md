# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo containing multiple Next.js applications for the A-OK Shop ecosystem:

1. **a-ok-shop**: Main Shopify storefront with integrated game and discount system
2. **self-replicating-art**: Automated daily image generator using OpenAI APIs
3. **v0-retro-style-game-concept**: Pac-Man/Snake hybrid game component

## Development Commands

### Main A-OK Shop Application
```bash
cd a-ok-shop
npm install            # Install dependencies
npm run dev           # Start development server (localhost:3000)
npm run lint          # Run ESLint
npm run build         # Build for production (includes image list generation)
npm run start         # Start production server
```

### Self-Replicating Art Service
```bash
cd self-replicating-art
npm install            # Install dependencies
npm start             # Run image generation locally
npm run build         # Compile TypeScript
```

### Game Component
```bash
cd v0-retro-style-game-concept
npm install            # Install dependencies
npm run dev           # Start development server
npm run lint          # Run ESLint
npm run build         # Build for production
```

## Architecture

### A-OK Shop Structure
- **app/**: Next.js 14 App Router implementation
  - **api/discount/**: Discount code generation endpoint (mock or real via Shopify Admin API)
  - **api/gallery/**: Gallery and image endpoints
  - **components/**: React components organized by feature (cart, layout, product)
  - **lib/shopify.ts**: Shopify GraphQL client and API integration
  - **game/**: Integrated game page with discount reward system

### Key Integrations
1. **Shopify Storefront API**: Product catalog, checkout (GraphQL)
2. **Shopify Admin API**: Real discount code generation (optional)
3. **Self-Replicating Art**: Daily image generation via GitHub Actions
4. **Game Reward System**: Win-based 25% discount codes

### State Management
- **Cart**: Zustand store with localStorage persistence
- **Game**: Local React state within game component

## Environment Variables

### Required for A-OK Shop
```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN=your-storefront-token

# Optional for real discount codes
SHOPIFY_ADMIN_API_TOKEN=your-admin-token
```

### Required for Self-Replicating Art
```bash
SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your-storefront-token
OPENAI_API_KEY=your-openai-key
VERCEL_DEPLOY_HOOK_URL=your-deploy-hook
```

## Code Conventions

1. **TypeScript**: All new code must use TypeScript with proper type safety
2. **Styling**: Use Tailwind CSS for all styling (avoid inline styles)
3. **Components**: Functional components with hooks (no class components)
4. **API Calls**: Use Shopify GraphQL for all product/catalog data
5. **File Organization**: Group by feature, not by file type
6. **State Updates**: Immutable updates, no direct state mutation
7. **Error Handling**: Always handle API errors gracefully with user feedback

## Testing & Quality Checks

Before committing:
```bash
npm run lint          # Must pass with no errors
npm run build         # Must build successfully
```

Note: No test suite currently configured. Consider adding tests for critical paths (cart operations, checkout flow, discount generation).

## Deployment

The main app deploys to Vercel:
- Push to main branch triggers automatic deployment
- Environment variables must be configured in Vercel dashboard
- Self-replicating art triggers deployments via webhook

## Security Considerations

1. Never commit API keys or secrets
2. Use environment variables for all sensitive data
3. Validate all user inputs before processing
4. Sanitize data before rendering to prevent XSS
5. Use Shopify's built-in checkout for payment processing

## Performance Optimizations

1. Image optimization via Next.js Image component
2. Dynamic imports for heavy components (game)
3. API response caching where appropriate
4. Lazy loading for below-fold content
5. Minimize bundle size - avoid unnecessary dependencies