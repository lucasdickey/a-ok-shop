'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/app/lib/analytics';

// Starts PostHog once per page load. Renders nothing.
export default function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) void initAnalytics(key);
  }, []);

  return null;
}
