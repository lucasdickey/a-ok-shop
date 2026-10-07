import catalogData from "../../product-catalog.json";
import { absoluteUrl } from "./site";

// Types reflecting the static product catalog JSON bundled with the app
export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  productType: string;
  vendor: string;
  tags: string[];
  stripeProductId?: string; // Stripe product ID for this product
  featured?: boolean; // Whether this product is featured on homepage
  featuredOrder?: number; // Display order for featured products
  /** Search and social-preview copy for the product page, from the product's copy file. */
  seo?: { title?: string; description?: string; socialTitle?: string; socialDescription?: string };
  /** Swatch color per Color option value, measured from the product's photos. */
  swatches?: Record<string, string>;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange?: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string | null;
        width: number;
        height: number;
        /** The garment color this photo shows; artwork-only images have none. */
        color?: string;
        /** Present the chest print close up while retaining the full garment asset. */
        presentation?: "chest-detail";
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string;
        stripePriceId?: string; // Stripe price ID for this variant
        price: {
          amount: string;
          currencyCode: string;
        };
        compareAtPrice?: {
          amount: string;
          currencyCode: string;
        } | null;
        availableForSale: boolean;
        selectedOptions: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  collections?: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
  onlineStoreUrl?: string;
  availableForSale: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

// Simplified product type for API responses derived from the static catalog
export type SimpleProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  createdAt: string;
  updatedAt: string;
  stripeProductId?: string;
  featured?: boolean;
  featuredOrder?: number;
  seo?: { title?: string; description?: string; socialTitle?: string; socialDescription?: string };
  /** Swatch color per Color option value, measured from the product's photos. */
  swatches?: Record<string, string>;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
        color?: string;
        presentation?: "chest-detail";
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string;
        stripePriceId?: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        compareAtPrice?: {
          amount: string;
          currencyCode: string;
        } | null;
        availableForSale: boolean;
        selectedOptions?: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  options?: Array<{
    name: string;
    values: string[];
  }>;
  tags: string[];
  productType: string;
  availableForSale: boolean;
};

// Load all products from the embedded JSON catalog
function loadProducts(): Product[] {
  return catalogData.products.edges.map(({ node }: any) => node as Product);
}

// Extract the trailing numeric identifier from a product id
// (e.g. "gid://a-ok/Product/8755818758363" -> 8755818758363).
// Newer products have larger numeric IDs, so sorting by this value
// in descending order yields newest-first ordering.
function getNumericProductId(id: string): number {
  const match = id.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

/**
 * True when two product or variant ids refer to the same item. Ids used to
 * carry a different prefix; carts and agents may still send those, and the
 * trailing number never changed, so it is compared too.
 */
export function isSameId(a: string, b: string): boolean {
  if (a === b) return true;
  const n = getNumericProductId(a);
  return n > 0 && n === getNumericProductId(b);
}

/**
 * Tag marking a SKU that exists for machine buyers only.
 *
 * The machine-payable sticker is priced at $0.05 so an MPP settlement can be
 * demonstrated for pennies. That price makes no sense on the human storefront —
 * checkout would add $9.99 of freight to a five-cent digital download — so
 * tagged products are served to agents and hidden from people.
 */
export const AGENT_ONLY_TAG = "agent-only";

function isAgentOnly(product: { tags?: string[] }): boolean {
  return (product.tags ?? []).some(
    (tag) => tag.toLowerCase() === AGENT_ONLY_TAG
  );
}

// Every product, agent-only ones included, sorted newest first.
function loadMappedProducts(): SimpleProduct[] {
  const products = [...loadProducts()].sort(
    (a, b) => getNumericProductId(b.id) - getNumericProductId(a.id)
  );

  return products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    stripeProductId: product.stripeProductId,
    featured: product.featured,
    featuredOrder: product.featuredOrder,
    seo: product.seo,
    swatches: product.swatches,
    priceRange: {
      minVariantPrice: {
        amount: product.priceRange.minVariantPrice.amount,
        currencyCode: product.priceRange.minVariantPrice.currencyCode,
      },
    },
    images: {
      edges: product.images.edges.map((edge) => ({
        node: {
          id: edge.node.id,
          url: edge.node.url,
          altText: edge.node.altText || product.title,
          color: edge.node.color,
          presentation: edge.node.presentation,
        },
      })),
    },
    variants: {
      edges: product.variants.edges.map((edge) => ({
        node: {
          id: edge.node.id,
          title: edge.node.title,
          sku: edge.node.sku,
          stripePriceId: edge.node.stripePriceId,
          price: {
            amount: edge.node.price.amount,
            currencyCode: edge.node.price.currencyCode,
          },
          compareAtPrice: edge.node.compareAtPrice ?? undefined,
          availableForSale: edge.node.availableForSale,
          selectedOptions: edge.node.selectedOptions,
        },
      })),
    },
    options: product.options.map((option) => ({
      name: option.name,
      values: option.values,
    })),
    tags: product.tags,
    productType: product.productType,
    availableForSale: product.availableForSale,
  }));
}

/**
 * Products for the human storefront (sorted newest first).
 * Agent-only SKUs are excluded — see {@link AGENT_ONLY_TAG}.
 */
export function getAllProducts(): SimpleProduct[] {
  return loadMappedProducts().filter((product) => !isAgentOnly(product));
}

/**
 * Products for machine buyers (MPP / ACP feeds), including agent-only SKUs.
 */
export function getAgentProducts(): SimpleProduct[] {
  return loadMappedProducts();
}

// Words that place a product in each shop category.
const CATEGORY_WORDS: Record<string, string[]> = {
  hats: ["hat", "cap"],
  "t-shirts": ["shirt", "tee"],
  hoodies: ["hoodie", "sweatshirt"],
};

// Get products by category (using productType, then tags)
export function getProductsByCategory(category: string): SimpleProduct[] {
  const normalizedCategory = category.toLowerCase();
  const words = CATEGORY_WORDS[normalizedCategory] ?? [normalizedCategory];
  const matches = (value: string) => words.some((word) => value.toLowerCase().includes(word));

  return getAllProducts().filter((product) => {
    // The product's own type decides when it names a category, so a tee tagged
    // "red hoodie" (describing the artwork) stays out of Hoodies.
    const type = product.productType.toLowerCase();
    const typeIsHoodie = CATEGORY_WORDS.hoodies.some((word) => type.includes(word));
    const typeIsKnown =
      typeIsHoodie ||
      CATEGORY_WORDS.hats.some((word) => type.includes(word)) ||
      type.includes("t-shirt") ||
      type.includes("tee");
    if (typeIsKnown) {
      // "Sweatshirts" contains "shirt"; it belongs with hoodies, not tees.
      if (normalizedCategory === "t-shirts" && typeIsHoodie) return false;
      return matches(type);
    }
    return matches(type) || product.tags.some(matches);
  });
}

/**
 * Get a single product by handle.
 *
 * Resolves agent-only SKUs too: this backs the MPP purchase route, which has to
 * be able to price and sell the machine-payable sticker even though the
 * storefront never lists it.
 */
export function getProductByHandle(handle: string): SimpleProduct | null {
  return loadMappedProducts().find((product) => product.handle === handle) || null;
}

// Get featured products (sorted by featuredOrder)
export function getFeaturedProducts(): SimpleProduct[] {
  const allProducts = getAllProducts();
  return allProducts
    .filter((product) => product.featured === true)
    .sort((a, b) => {
      const orderA = a.featuredOrder ?? 999;
      const orderB = b.featuredOrder ?? 999;
      return orderA - orderB;
    });
}
