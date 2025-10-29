import catalogData from '../../product-catalog.json';

// Types matching the JSON structure from Shopify
export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  productType: string;
  vendor: string;
  tags: string[];
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

// Simplified product type for API responses (matching Shopify's format)
export type SimpleProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  createdAt: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
    };
  };
  images: {
    edges: Array<{
      node: {
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
        price: {
          amount: string;
        };
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
};

// Load all products from the JSON catalog
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
    priceRange: {
      minVariantPrice: {
        amount: product.priceRange.minVariantPrice.amount,
      },
    },
    images: {
      edges: product.images.edges.map((edge) => ({
        node: {
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
          price: {
            amount: edge.node.price.amount,
          },
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

// For Stripe checkout - convert product handle to line items
export function createCheckoutLineItems(cartItems: Array<{
  variantId: string;
  quantity: number;
  handle?: string;
}>): Array<{
  price_data: {
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

    // Get the first image URL (will be local path)
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
