import posthog from 'posthog-js';

// The project key is public by design: it can only send events, not read them.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

type StoreEvent =
  | 'product_viewed'
  | 'added_to_cart'
  | 'checkout_started'
  | 'game_won'
  | 'discount_code_issued';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

/** Starts PostHog on first use. Returns null on the server or when no key is set. */
function getPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return null;
  if (!posthog.__loaded) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Records a page view on first load and on every client-side navigation.
      capture_pageview: 'history_change',
      // Anonymous visitors don't get person profiles; keeps us well inside the free tier.
      person_profiles: 'identified_only',
    });
  }
  return posthog;
}

export function initAnalytics() {
  getPostHog();
}

export function track(event: StoreEvent, properties?: EventProperties) {
  getPostHog()?.capture(event, properties);
}

/** The visitor's anonymous PostHog ID, passed to checkout so purchases link to their visit. */
export function getAnalyticsId(): string | undefined {
  return getPostHog()?.get_distinct_id() || undefined;
}
