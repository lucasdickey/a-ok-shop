import posthog from 'posthog-js';

// Store events sent to PostHog. Page views are captured automatically.
type AnalyticsEvents = {
  product_added_to_cart: { product_id: string; variant_id: string; title: string; price: number; quantity: number; size?: string; color?: string };
  checkout_started: { item_count: number; subtotal: number; flow: 'catalog' | 'monthly_deals' };
  checkout_failed: { reason: string; flow: 'catalog' | 'monthly_deals' };
  game_won: { tokens_collected: number };
  discount_code_issued: Record<string, never>;
  discount_code_failed: { reason: string };
};

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]) {
  // Without NEXT_PUBLIC_POSTHOG_KEY PostHog is never initialised, so events are dropped.
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}
