/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '**.myshopify.com',
      },
      {
        protocol: 'https',
        hostname: '**.shopify.com',
      },
    ],
  },
  env: {
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
  },
};

module.exports = nextConfig;
