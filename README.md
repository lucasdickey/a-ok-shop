# A-OK Shop - Custom Shopify Storefront

A modern, custom Shopify storefront for [Apes on Keys](https://www.apesonkeys.com), built with Next.js 14, TypeScript, and Tailwind CSS. This project uses the Shopify Storefront GraphQL API to create a seamless shopping experience for AI-inspired streetwear.

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Shopify](https://img.shields.io/badge/Shopify-API-7AB55C.svg)](https://shopify.dev/docs/api/storefront)

## About Apes on Keys

A-OK Shop is the official merchandise store for Apes on Keys, home of the E/ACC Monkey Theorem:

> **The E/ACC Monkey Theorem** states that if you give an infinite number of AI models an infinite amount of compute, they will eventually generate every possible text, image, video, and piece of code – including all of Shakespeare's works, their various HBO adaptations, and at least 47 different AI-generated musicals where Hamlet raps.
>
> However, they'll also generate an infinite number of hallucinated Shakespeare quotes about cryptocurrency, several million images of the Bard wearing Supreme hoodies, and countless variations of "To yeet or not to yeet." The models will perpetually insist they're unsure about events after their training cutoff date" even when discussing events from the 16th century.
>
> Unlike the original typing monkeys who would take eons to produce anything coherent, modern AI can generate nonsense at unprecedented speeds and with unwavering confidence. They'll even add citations to completely imaginary academic papers and insist they're being helpful while doing so.
>
> The theorem suggests that somewhere in this infinite digital soup of content, there exists a perfect reproduction of Romeo and Juliet – though it's probably tagged as "not financial advice" and ends with a prompt to like and subscribe.
>
> _(Note: This theorem has been reviewed by approximately 2.7 million AI models, each claiming to have a knowledge cutoff date that makes them unable to verify their own existence.)_

Our products are designed for AI enthusiasts, tech professionals, and anyone who appreciates the intersection of technology and humor. We offer high-quality streetwear with designs that capture the essence of modern AI culture - "Nerd streetwear for AI junkies."

## Features

- 🚀 Built with Next.js 14 App Router
- 🔒 TypeScript for type safety
- 💅 Responsive design with Tailwind CSS
- 🛍️ Shopify Storefront API integration
- 🛒 Shopping cart with local storage persistence
- 🔍 Product filtering by category and price
- 📱 Mobile-friendly interface
- 🎟️ Discount code generation (mock or real via Shopify Admin API)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Shopify store with Storefront API access
- (Optional) Shopify Admin API access for real discount code generation

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/a-ok-shop.git
cd a-ok-shop
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Shopify credentials:

```
# Required: Shopify Storefront API
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN=your-storefront-api-token

# Optional: Shopify Admin API (for real discount codes)
SHOPIFY_ADMIN_API_TOKEN=your-admin-api-token
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploying to Vercel

This app is deployed using [Vercel](https://vercel.com):

1. Push your code to a GitHub repository.

2. Import your project to Vercel:

   - Go to [Vercel](https://vercel.com) and sign in
   - Click "New Project" and import your GitHub repository
   - Configure the project settings (Next.js should be auto-detected)

3. Add environment variables:

   - In the Vercel project settings, go to the "Environment Variables" tab
   - Add the following variables:
     - `SHOPIFY_STORE_DOMAIN`: Your Shopify store domain (e.g., your-store.myshopify.com)
     - `SHOPIFY_STOREFRONT_API_TOKEN`: Your Shopify Storefront API access token
     - `SHOPIFY_ADMIN_API_TOKEN`: (Optional) Your Shopify Admin API token for real discount codes

4. Deploy the project.

### Important Production Considerations

1. **Secure API Access**: Make sure your Shopify API tokens have the appropriate access scopes and are kept secure.

2. **CORS Configuration**: Ensure your Shopify store allows requests from your production domain.

3. **Performance Optimization**: Consider enabling caching strategies for product data to improve performance.

4. **Analytics**: Set up analytics to track user behavior and conversion rates.

5. **Testing**: Thoroughly test the checkout process and discount code generation in production.

## Connecting to Shopify

### Getting Your Shopify API Credentials

#### Storefront API (Required)

1. Log in to your Shopify admin panel.
2. Go to "Settings" > "Apps and sales channels".
3. Click on "Develop apps".
4. Create a new app or select an existing one.
5. Under "API credentials", create a Storefront API access token.
6. Copy the token and store domain for use in your environment variables.

#### Admin API (Optional - for discount codes)

1. In the same app, click "Configure Admin API scopes".
2. Enable these scopes:
   - `write_discounts` - Required to create discount codes
   - `read_discounts` - Required to query existing discounts
3. Click "Save" and then "Install app".
4. Copy the Admin API access token (you'll only see it once!).

### Testing the Storefront

After deployment, verify that:

- Products are loading correctly
- Category filtering works as expected
- The cart functionality operates properly
- Checkout redirects to Shopify correctly
- Discount code generation works (will be mock codes without Admin API)

## Discount Code Feature

The app includes a special offer component that generates discount codes:

- **Without Admin API**: Generates mock discount codes for testing
- **With Admin API**: Creates real 10% discount codes in your Shopify store

See [SHOPIFY_DISCOUNT_SETUP.md](./SHOPIFY_DISCOUNT_SETUP.md) for detailed setup instructions.

## Agentic Commerce Protocol (ACP) Integration

The storefront now exposes a draft implementation of the Agentic Commerce Protocol to support agent-to-merchant interactions over HTTP using Stripe for delegated payments and checkout orchestration. All endpoints live under `/api/acp/*` and share the existing `STRIPE_SECRET_KEY` configuration.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/acp/catalog` | `GET` | Returns the product catalog with pricing, descriptions, sizing/options, and image metadata in ACP-compatible JSON. |
| `/api/acp/checkout` | `POST` | Creates a Stripe Checkout Session from ACP cart items (variant IDs and quantities) and returns the hosted checkout URL for agent delegation. |
| `/api/acp/delegate-payment` | `POST` | Creates a Stripe Payment Intent for direct delegate payments and returns the client secret for confirmation. |
| `/api/acp/webhook` | `POST` | Mirrors the existing Stripe webhook handler for ACP checkout lifecycle events. |

### Example Checkout Payload

```json
POST /api/acp/checkout
{
  "cart": {
    "items": [
      { "variantId": "gid://shopify/ProductVariant/123", "quantity": 2 }
    ]
  },
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel",
  "customer": { "email": "buyer@example.com" }
}
```

### Delegate Payment Payload

```json
POST /api/acp/delegate-payment
{
  "amount": 1200,
  "currency": "usd",
  "confirm": false,
  "metadata": { "orderReference": "agent-123" }
}
```

> **Note:** `amount` should be specified in the smallest currency unit (e.g., cents for USD). When `confirm` is set to `true`, you must provide a `paymentMethodId` from a previously tokenized card or wallet.

## Project Structure

```
a-ok-shop/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   │   └── discount/     # Discount code generation endpoint
│   │   └── product/      # Product-related components
│   │   └── ui/           # UI components
│   ├── lib/              # Utility libraries
│   ├── products/         # Product listing and detail pages
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Future Enhancements

- [ ] TipTap CMS integration for editable content blocks
- [ ] Countdown timer for limited product drops
- [ ] Analytics integration (GA4, Facebook Pixel)
- [ ] User authentication
- [ ] Wishlist functionality
- [ ] Product reviews
- [ ] Internationalization support
- [ ] AI-generated product descriptions that cite non-existent academic papers

## Possible TODO Items

### Medium-term Enhancements

- [ ] **Analytics tracking** - Track how many discount codes are generated and used
- [ ] **Mobile optimization** - Ensure the discount component looks great on all devices
- [ ] **Performance improvements** - Add loading states, optimize images, implement caching
- [ ] **SEO enhancements** - Better meta tags, structured data, social sharing
- [ ] **Error handling** - Better error states and user feedback throughout the app
- [ ] **Accessibility improvements** - ARIA labels, keyboard navigation, screen reader support

### Feature Additions

- [ ] **Customer account integration** - Track discount usage per customer
- [ ] **Product reviews/ratings** - Social proof for products
- [ ] **Wishlist functionality** - Let customers save items for later
- [ ] **Email capture** - Newsletter signup with discount incentive
- [ ] **Social sharing** - Share products on social media with auto-generated discount codes
- [ ] **Abandoned cart recovery** - Email sequence with discount codes for incomplete purchases
- [ ] **Loyalty program** - Points system with tiered discount benefits
- [ ] **Inventory notifications** - Email alerts when out-of-stock items are back
- [ ] **Product bundles** - Create bundle deals with special pricing
- [ ] **Gift cards** - Digital gift card purchase and redemption system

### Advanced Features

- [ ] **A/B testing framework** - Test different discount percentages and UI variations
- [ ] **Personalization engine** - AI-driven product recommendations and custom discount offers
- [ ] **Multi-currency support** - International customers with local pricing
- [ ] **Progressive Web App (PWA)** - Offline functionality and app-like experience
- [ ] **Voice commerce** - Integration with voice assistants for product search
- [ ] **AR/VR preview** - Virtual try-on for apparel items
- [ ] **Blockchain integration** - NFT-based products or crypto payment options

## Connect with Apes on Keys

- Website: [apesonkeys.com](https://www.apesonkeys.com)
- Twitter: [@apesonkeys](https://x.com/apesonkeys)
- Email: info@a-ok.shop

## License

This project is licensed under the MIT License - see the LICENSE file for details.

> _Disclaimer: This README has been reviewed by at least 13 AI models, none of which can verify whether they actually wrote it due to their knowledge cutoff dates._
