'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

// Starts PostHog once per page load. Renders nothing.
export default function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      // Sent through our own domain (see the /ingest rewrite in next.config.js) so ad blockers don't drop it.
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      // Includes page views on client-side navigation.
      defaults: '2026-08-30',
    });
  }, []);

  return null;
}
