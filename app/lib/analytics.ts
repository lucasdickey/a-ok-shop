import type { PostHog } from 'posthog-js';

// Store events sent to PostHog. Page views and clicks are captured automatically.
type AnalyticsEvents = {
  product_added_to_cart: { product_id: string; variant_id: string; title: string; price: number; quantity: number; size?: string; color?: string };
  checkout_started: { item_count: number; subtotal: number; flow: 'catalog' | 'monthly_deals' };
  checkout_failed: { reason: string; flow: 'catalog' | 'monthly_deals' };
  game_won: { tokens_collected: number };
  discount_code_issued: Record<string, never>;
  discount_code_failed: { reason: string };
  print_request_changed: { monkey_id: string; wanted: boolean };
};

let client: PostHog | null = null;
let starting: Promise<void> | null = null;

// Loads posthog-js only when a key is configured, so visitors don't download it otherwise.
export function initAnalytics(key: string) {
  starting ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      // Sent through our own domain (see the /ingest rewrite in next.config.js) so ad blockers don't drop it.
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      // Includes page views on client-side navigation.
      defaults: '2026-08-30',
      autocapture: true,
      // The PostHog project is shared with other sites; never record sessions here even if replay is
      // switched on there, since the game's win screen shows a live discount code.
      disable_session_recording: true,
    });
    client = posthog;
  });
  return starting;
}

// Events fired before PostHog has loaded, or without a key, are dropped.
export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]) {
  client?.capture(event, properties);
}
