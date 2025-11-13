import catalogData from "../../product-catalog.json";

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

// Get all products
export function getAllProducts(): SimpleProduct[] {
  const products = loadProducts();

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

// Get products by category (using tags and productType)
export function getProductsByCategory(category: string): SimpleProduct[] {
  const allProducts = getAllProducts();
  const normalizedCategory = category.toLowerCase();

  return allProducts.filter((product) => {
    const normalizedTags = product.tags.map((tag) => tag.toLowerCase());
    const normalizedProductType = product.productType.toLowerCase();

    // Check if category matches tags or product type
    if (normalizedCategory === "hats") {
      return (
        normalizedTags.some((tag) => tag.includes("hat") || tag.includes("cap")) ||
        normalizedProductType.includes("hat") ||
        normalizedProductType.includes("cap")
      );
    } else if (normalizedCategory === "t-shirts") {
      return (
        normalizedTags.some((tag) => tag.includes("shirt") || tag.includes("tee")) ||
        normalizedProductType.includes("t-shirt") ||
        normalizedProductType.includes("tee")
      );
    } else if (normalizedCategory === "hoodies") {
      return (
        normalizedTags.some((tag) => tag.includes("hoodie") || tag.includes("sweatshirt")) ||
        normalizedProductType.includes("hoodie") ||
        normalizedProductType.includes("sweatshirt")
      );
    } else {
      return (
        normalizedTags.some((tag) => tag.includes(normalizedCategory)) ||
        normalizedProductType.includes(normalizedCategory)
      );
    }
  });
}

// Get a single product by handle
export function getProductByHandle(handle: string): SimpleProduct | null {
  const allProducts = getAllProducts();
  return allProducts.find((product) => product.handle === handle) || null;
}

// Get product categories (unique product types and tags)
export function getCategories(): string[] {
  const products = loadProducts();
  const categoriesSet = new Set<string>();

  products.forEach((product) => {
    if (product.productType) {
      categoriesSet.add(product.productType);
    }
    product.tags.forEach((tag) => categoriesSet.add(tag));
  });

  return Array.from(categoriesSet).sort();
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

// For Stripe checkout - convert product handle to line items
// Supports both Stripe price IDs (preferred) and price_data (fallback)
export function createCheckoutLineItems(cartItems: Array<{
  variantId: string;
  quantity: number;
  handle?: string;
}>): Array<{
  price?: string;
  price_data?: {
    currency: string;
    product_data: {
      name: string;
      images?: string[];
    };
    unit_amount: number;
  };
  quantity: number;
}> {
  const products = loadProducts();

  return cartItems.map((item) => {
    // Find the product and variant
    const product = products.find((p) =>
      p.variants.edges.some((v) => v.node.id === item.variantId)
    );

    if (!product) {
      throw new Error(`Product not found for variant ${item.variantId}`);
    }

    const variant = product.variants.edges.find(
      (v) => v.node.id === item.variantId
    )?.node;

    if (!variant) {
      throw new Error(`Variant not found: ${item.variantId}`);
    }

    // Use Stripe price ID if available (preferred)
    if (variant.stripePriceId) {
      return {
        price: variant.stripePriceId,
        quantity: item.quantity,
      };
    }

    // Fallback to price_data for products not yet synced to Stripe
    const imageUrl = product.images.edges[0]?.node.url || "";
    const fullImageUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}${imageUrl}`;

    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: `${product.title} - ${variant.title}`,
          images: fullImageUrl.startsWith("http") ? [fullImageUrl] : [],
        },
        unit_amount: Math.round(parseFloat(variant.price.amount) * 100),
      },
      quantity: item.quantity,
    };
  });
}
