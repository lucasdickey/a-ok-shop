/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell webpack to ignore the v0-retro-style-game-concept directory
  webpack: (config, { dev, isServer }) => {
    config.plugins = config.plugins || [];

    // Allow importing JSON files
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });

    if (isServer) {
      // Ensure the v0-retro-style-game-concept directory is not processed
      // config.watchOptions = {
      //   ...config.watchOptions,
      //   ignored: /v0-retro-style-game-concept/,
      // };
    }

    return config;
  },
  experimental: {
  },
  // PostHog is proxied through /ingest (see app/components/analytics/PostHogInit.tsx).
  // Its API paths end in a slash, so don't let Next redirect them.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
      // Markdown versions of product pages for AI agents (app/md/products/[handle]/route.ts).
      { source: '/products/:handle([^/]+)\\.md', destination: '/md/products/:handle' },
    ];
  },
  async headers() {
    return [
      {
        // Apply CORS headers to .well-known manifest files for agent discovery
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Accept, Content-Type',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
