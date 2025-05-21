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
  // Tell webpack to ignore the v0-retro-style-game-concept directory
  webpack: (config, { dev, isServer }) => {
    config.plugins = config.plugins || [];
    
    if (isServer) {
      // Ensure the v0-retro-style-game-concept directory is not processed
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /v0-retro-style-game-concept/,
      };
    }
    
    return config;
  },
  experimental: {
    // Exclude directories from compilation
    outputFileTracingExcludes: ['v0-retro-style-game-concept/**'],
  },
};

module.exports = nextConfig;
