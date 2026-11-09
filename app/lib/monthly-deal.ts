import { CLOTHING_SIZES } from "@/app/lib/sizes";

/**
 * The current monthly deal. The page shows it and the checkout route prices it from
 * here, so the price a shopper pays never comes from the browser.
 */
export const MONTHLY_DEAL = {
  id: "monthly-deal-2025-01",
  month: "2025-01",
  title: "A-OK DAY 2 MONKEY HOODIE",
  description: "Simplified. Streamlined. Still A Little Scary. A hoodie designed to reflect the clean, evolving interfaces of modern LLMs with a focus on comfort and style. New look. Same depth. Fully backward compatible.",
  price: 50.0,
  originalPrice: 75.0,
  images: [
    "/images/monthly-deals/hoodie-lids-front-modeled.png",
    "/images/monthly-deals/pullover-hoodie.png",
    "/images/monthly-deals/hoodie-worn.jpg",
  ],
  sizes: [...CLOTHING_SIZES],
  colors: ["Black", "Navy", "Heather Grey"],
  features: [
    "Cozy fleece interior",
    "Simplified A-OK mascot on front",
    "Classic hoodie fit",
    "Designed for prompt engineers & digital therapists",
    "Limited monthly release",
  ],
};

/** The cart's variant id for one size and color of the deal. */
export function monthlyDealVariantId(size: string, color: string): string {
  return `${MONTHLY_DEAL.id}-${size}-${color}`;
}

/** True when a cart line is the monthly deal rather than a catalog product. */
export function isMonthlyDealVariant(variantId: string): boolean {
  return variantId.startsWith(`${MONTHLY_DEAL.id}-`);
}
