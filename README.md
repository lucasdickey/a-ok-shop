# A-OK Store - Custom Shopify Storefront

A modern, custom Shopify storefront built with Next.js 14, TypeScript, and Tailwind CSS. This project uses the Shopify Storefront GraphQL API to create a seamless shopping experience.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Shopify](https://img.shields.io/badge/Shopify-API-7AB55C.svg)](https://shopify.dev/docs/api/storefront)

## Features

- 🚀 Built with Next.js 14 App Router
- 🔒 TypeScript for type safety
- 💅 Responsive design with Tailwind CSS
- 🛍️ Shopify Storefront API integration
- 🛒 Shopping cart with local storage persistence
- 🔍 Product filtering by category and price
- 📱 Mobile-friendly interface

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Shopify store with Storefront API access

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/a-ok-store.git
cd a-ok-store
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Shopify credentials:

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN=your-storefront-api-token
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploying to Vercel

The easiest way to deploy this app is using [Vercel](https://vercel.com):

1. Push your code to a GitHub repository.

2. Import your project to Vercel:
   - Go to [Vercel](https://vercel.com) and sign in or create an account
   - Click "New Project" and import your GitHub repository
   - Configure the project settings (Next.js should be auto-detected)

3. Add environment variables:
   - In the Vercel project settings, go to the "Environment Variables" tab
   - Add the following variables:
     - `SHOPIFY_STORE_DOMAIN`: Your Shopify store domain (e.g., your-store.myshopify.com)
     - `SHOPIFY_STOREFRONT_API_TOKEN`: Your Shopify Storefront API access token

4. Deploy the project.

### Deploying to Netlify

You can also deploy to [Netlify](https://netlify.com):

1. Push your code to a GitHub repository.

2. Import your project to Netlify:
   - Go to [Netlify](https://netlify.com) and sign in or create an account
   - Click "New site from Git" and select your GitHub repository
   - Configure the build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`

3. Add environment variables:
   - In the Netlify site settings, go to "Environment" > "Environment variables"
   - Add the same environment variables as mentioned in the Vercel deployment

### Important Production Considerations

1. **Secure API Access**: Make sure your Shopify Storefront API token has the appropriate access scopes and is kept secure.

2. **CORS Configuration**: Ensure your Shopify store allows requests from your production domain.

3. **Performance Optimization**: Consider enabling caching strategies for product data to improve performance.

4. **Analytics**: Set up analytics to track user behavior and conversion rates.

5. **Testing**: Thoroughly test the checkout process in production to ensure a smooth customer experience.

## Connecting to Shopify

### Getting Your Shopify API Credentials

1. Log in to your Shopify admin panel.
2. Go to "Apps" > "App and sales channel settings".
3. Click on "Develop apps for your store".
4. Create a new app or select an existing one.
5. Under "API credentials", create a Storefront API access token.
6. Copy the token and store domain for use in your environment variables.

### Testing the Storefront

After deployment, verify that:
- Products are loading correctly
- Category filtering works as expected
- The cart functionality operates properly
- Checkout redirects to Shopify correctly

## Project Structure

```
a-ok-store/
├── app/                  # Next.js App Router
│   ├── components/       # Reusable components
│   │   ├── cart/         # Cart-related components
│   │   ├── layout/       # Layout components (Navbar, Footer)
│   │   ├── product/      # Product-related components
│   │   └── ui/           # UI components
│   ├── lib/              # Utility libraries
│   ├── products/         # Product listing and detail pages
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── public/               # Static assets
├── .env.local.example    # Example environment variables
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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
