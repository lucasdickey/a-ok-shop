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

3. Set up environment variables:

Copy the `.env.local.example` file to `.env.local` and fill in your Shopify credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Shopify Storefront API token and store domain:

```
SHOPIFY_STOREFRONT_API_TOKEN=your_shopify_storefront_api_token
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

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

## Deployment on Vercel

This project is designed to be deployed on Vercel. Follow these steps to deploy:

1. Push your code to a GitHub repository
2. Import the project in the Vercel dashboard
3. Set the environment variables in the Vercel dashboard:
   - `SHOPIFY_STOREFRONT_API_TOKEN`
   - `SHOPIFY_STORE_DOMAIN`
4. Deploy!

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
