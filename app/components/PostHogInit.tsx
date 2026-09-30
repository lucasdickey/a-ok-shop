'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/app/lib/analytics';

/** Starts PostHog on every page so page views are recorded even where no event fires. */
export default function PostHogInit() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
