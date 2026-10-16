# A-OK Shop

A custom storefront for [Apes on Keys](https://www.apesonkeys.com), built with Next.js 14, TypeScript, and Tailwind CSS. Products come from a bundled catalog (`product-catalog.json`) and checkout runs on Stripe.

Catalog garments may specify `supportedSizes` when their blank differs from the default XS–2XL range. Product pages, checkout, agent descriptions and Stripe synchronization use that restriction. The Cotton Heritage M2480 sweatshirts offer S–2XL. The original Printful mockup URLs and garment models for the October 2026 sweatshirt additions are recorded in `catalog-sources/printful-sweatshirts.json`.

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout-635BFF.svg)](https://stripe.com/docs/payments/checkout)

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
- 🛍️ Stripe Checkout, with prices checked against the catalog on the server
- 👕 Every tee and hoodie printed on demand in XS–2XL
- 🛒 Shopping cart with local storage persistence
- 🔍 Product filtering by category and price
- 📱 Mobile-friendly interface
- 🎟️ Game reward codes (mock in development, Stripe promotion codes in production)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- (Optional) A Stripe account for checkout and real discount codes

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

3. Copy `.env.example` to `.env.local` and fill in the values. The store runs without any keys; add `STRIPE_SECRET_KEY` to enable checkout and real discount codes.

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
     - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: checkout, discount codes, and paid-order webhooks
     - `SITE_URL`: your production domain, used for Stripe redirects
     - `RESEND_API_KEY` and `ORDER_NOTIFICATION_EMAIL`: paid-order alerts to the owner
     - See `.env.example` for the full list

4. Deploy the project.

### Important Production Considerations

1. **Secure API Access**: Keep Stripe and Resend keys in Vercel environment variables only.

2. **Performance Optimization**: Consider enabling caching strategies for product data to improve performance.

3. **Analytics**: Set up analytics to track user behavior and conversion rates.

4. **Testing**: Thoroughly test the checkout process and discount code generation in production.

## Catalog and Checkout

- **Catalog:** `product-catalog.json`, read through `app/lib/catalog.ts`. Edit it to change content; see [STRIPE_CATALOG_SYNC.md](./STRIPE_CATALOG_SYNC.md) to keep Stripe products and prices in step.
- **Sizes:** every tee and hoodie is printed on demand in XS–2XL (`app/lib/sizes.ts`). The size a shopper picks is recorded on the Stripe line item and in the owner's order email.
- **Checkout:** `/api/catalog/checkout` re-prices every line from the catalog and creates a Stripe Checkout session. Free shipping at $50; $9.99 below that.

### Testing the Storefront

After deployment, verify that:

- Products are loading correctly
- Category filtering works as expected
- The cart functionality operates properly
- Checkout redirects to Stripe with the chosen size and color on each line
- Discount code generation works (mock codes without Stripe)

## Discount Code Feature

Winning Run, Human, Run! calls `/api/discount`:

- **Without Stripe**: Generates mock discount codes for testing
- **With Stripe**: Creates a real single-use 25% Stripe promotion code, valid for 30 days, that shoppers enter at checkout

## Agentic Commerce Protocol (ACP) Integration

AI agents can buy from the shop through the [Agentic Commerce Protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol), version `2026-04-17`. Agents find it through the discovery document at `/.well-known/acp.json`, which points them at `https://a-ok.ai/api/acp`.

Every color and size is its own item: its ID is the catalog variant's number plus the size for clothing (`47200000000110-L`, a Red L Insert Token Tee). Checkout prices items from the catalog and charges the store's shipping (flat $9.99, free from $50, US and Canada only). Paid orders reach the owner as the same order alert store orders send, with sizes, colors and the shipping address.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/acp/products` | `GET` | ACP product feed: one variant per color and size, with its item ID, price in cents and Color/Size options. |
| `/api/acp/checkout_sessions` | `POST` | Create a checkout session from item IDs. The response lists line items, shipping, totals and messages saying what's still needed. |
| `/api/acp/checkout_sessions/{id}` | `GET`, `POST` | Retrieve or update a session (items, buyer, shipping address, notes). |
| `/api/acp/checkout_sessions/{id}/complete` | `POST` | Pay with the buyer's Stripe shared payment token and place the order. |
| `/api/acp/checkout_sessions/{id}/cancel` | `POST` | Cancel an open session. |
| `/api/acp/checkout` | `POST` | Simpler alternative: returns a Stripe-hosted checkout page for variant IDs plus size and color. |
| `/api/acp/catalog` | `GET` | The catalog in the shop's earlier ACP draft format, with Size options for clothing. |
| `/api/acp/webhook` | `POST` | Mirrors the Stripe webhook handler. |

Checkout session requests need the `API-Version: 2026-04-17` header, and every `POST` needs an `Idempotency-Key`: a retry with the same key returns the first answer, so an order is never placed twice. Agents' cards must not need 3D Secure, which isn't supported yet. Tax isn't charged on agent orders.

### Settings

| Variable | Needed | What it does |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Charges the buyer's shared payment token. |
| `STRIPE_NETWORK_ID` | Yes | Your Stripe profile's network ID, given to agents so the token they create is for this shop. Without it, sessions never become ready for payment. |
| `REDIS_URL` | In production | Keeps checkout sessions and retry records. Without it, production answers 503; a local dev server keeps them in memory. |
| `ACP_API_KEYS` | No | Comma-separated keys agents must send as `Authorization: Bearer <key>`; each key only sees its own sessions. Empty means any agent can check out, rate-limited to 120 requests a minute. |
| `ACP_WEBHOOK_URL`, `ACP_WEBHOOK_SECRET` | No | The agent platform's order webhook and signing secret. Each paid order is sent as a signed `order_create` event. |
| `STRIPE_SPT_API_VERSION` | No | Stripe API version for charging shared payment tokens (default `2026-09-30.preview`). |

Stripe's shared payment tokens are a Stripe preview feature: the account must be enabled for agentic commerce. In test mode, create a token with Stripe's test helper (`POST /v1/test_helpers/shared_payment/granted_tokens`).

### Example Purchase

```http
POST /api/acp/checkout_sessions
API-Version: 2026-04-17
Idempotency-Key: 6d0f5a4e-0d6b-4a8e-9c1e-3d1f0b7a2c11

{
  "currency": "usd",
  "line_items": [{ "id": "47200000000110-L", "quantity": 2 }],
  "fulfillment_details": {
    "name": "Ada Ape",
    "email": "ada@example.com",
    "address": { "name": "Ada Ape", "line_one": "1 Banana Way", "city": "Toronto", "state": "ON", "country": "CA", "postal_code": "M5V 2T6" }
  }
}
```

The response has `"status": "ready_for_payment"`, the line item with `Color: Red` and `Size: L`, free shipping, and a `total` of `6000`. Then:

```http
POST /api/acp/checkout_sessions/cs_.../complete
API-Version: 2026-04-17
Idempotency-Key: 0b9a7c3e-5f1d-4e2a-8b6c-9d4e3f2a1b00

{
  "payment_data": {
    "handler_id": "card_tokenized",
    "instrument": { "type": "card", "credential": { "type": "spt", "token": "spt_..." } }
  }
}
```

On success the session comes back `"status": "completed"` with an `order` and its `permalink_url`. A declined card comes back still `ready_for_payment`, with a `payment_declined` message.

A tee or hoodie sent without a size is refused with the sizes it comes in:

```json
{
  "type": "invalid_request",
  "code": "size_required",
  "message": "Choose a size for A-OK Insert Token Tee. Sizes: XS, S, M, L, XL, 2XL",
  "param": "$.line_items[0].id"
}
```

### CORS Configuration

The catalog, product feed and hosted checkout endpoints implement origin-based CORS validation for security. The checkout session endpoints are called by agents' servers, not browsers, and send no CORS headers.

**Development Mode** (`NODE_ENV=development`):
- All `localhost` origins are automatically allowed on **any port** (e.g., `http://localhost:3000`, `http://localhost:3001`, `http://localhost:9999`)
- Also supports `127.0.0.1` origins
- This allows running multiple apps concurrently without configuration

**Production Mode**:
Default allowed origins:
- `https://a-ok.ai`
- `https://www.a-ok.ai`
- `https://a-ok.shop` (legacy, during the domain move)
- `https://www.a-ok.shop` (legacy, during the domain move)

To configure custom allowed origins for production, set the `ACP_ALLOWED_ORIGINS` environment variable:

```bash
ACP_ALLOWED_ORIGINS=https://agent.example.com,https://api.partner.com
```

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
- Email: info@a-ok.ai

## License

This project is licensed under the MIT License - see the LICENSE file for details.

> _Disclaimer: This README has been reviewed by at least 13 AI models, none of which can verify whether they actually wrote it due to their knowledge cutoff dates._

## Storefront design review

Open `/concepts` to compare all 27 storefront concepts at desktop or mobile width, including fullscreen comparison. Club Receipt (27) opens by default. The Astra Round 5 filter shows Print Room (24), The Human Edit (25), and Off Model (26). These three use six identical catalog products, isolated preview bags, artwork inspection, and an explicitly labeled existing-sample generator preview. Their bags never create orders. The separate Claude Code round (21–23) retains its real-cart behavior.

See [the round-four review](session/0907-codex-gpt6/design-concepts.md) for the recommendation, tradeoffs, verification, and regeneration instructions. Direct previews are also listed at `/design-concepts/`.

See [the Astra round-five review](session/0923-astra-round-five/review.md) for the 20-concept audit, weighted comparison, and verification. Astra’s original draft numbers 21–23 became 24–26 at publication to preserve the already-published Claude Code trio.

### Club Receipt — concept 27

Open `/design-concepts/27-club-receipt.html` for the Hallucination Club × Receipt Machine concept. Acid yellow, red, cobalt, arched photography, receipt perforations, barcodes, and offset shadows. Category filters and the mobile menu work; product links open existing product pages for options and checkout. Display prices are a snapshot of `product-catalog.json`. This standalone concept does not replace the storefront homepage.

## Chaos Monkeys

New A-OK apes, most days. Each morning this Mac drafts about six with Claude and GPT-6-Astra, using the Claude Code and Codex logins already on it: no API keys, no CI. One draft riffs on the day's [Zingers](https://zingers.dev) story. A person picks two or three to publish, and each shipped monkey appears on the homepage ("Latest drop") and at `/chaos-monkeys`. The site reads `app/data/chaos-monkeys.json` and rejects a malformed entry at build time. Setup, commands, and safety notes are in [scripts/chaos-monkeys/README.md](scripts/chaos-monkeys/README.md).
