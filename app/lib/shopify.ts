import { GraphQLClient } from "graphql-request";

// Types for Shopify API responses
export type ShopifyProduct = {
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
        originalSrc?: string;
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
        metafield?: {
          namespace: string;
          key: string;
          value: string;
        };
        metafields?: {
          edges: Array<{
            node: {
              namespace: string;
              key: string;
              value: string;
            };
          }>;
        };
      };
    }>;
  };
  options?: Array<{
    name: string;
    values: string[];
  }>;
  metafield?: {
    namespace: string;
    key: string;
    value: string;
  };
  metafields?: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }>;
  };
  tags: string[];
  productType: string;
};

export type ShopifyCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: {
    url: string;
    altText: string;
  } | null;
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
};

// Initialize GraphQL client
export const getShopifyClient = () => {
  // Get credentials from environment variables
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  if (!storeDomain || !token) {
    console.error("Missing Shopify API credentials");
    throw new Error(
      "Shopify API credentials are missing. Please check your environment variables."
    );
  }

  // Correct Shopify Storefront API endpoint format
  const endpoint = `https://${storeDomain}/api/2024-01/graphql.json`;
  
  console.log(`Initializing Shopify client with endpoint: ${endpoint}`);
  
  return new GraphQLClient(endpoint, {
    headers: {
      "X-Shopify-Storefront-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

// Mock products for development when API is not available
const mockProducts: ShopifyProduct[] = [
  {
    id: "gid://shopify/Product/1",
    handle: "mock-tshirt-1",
    title: "A-OK T-Shirt",
    description: "A comfortable t-shirt with the A-OK logo",
    createdAt: "2022-01-01T00:00:00Z",
    priceRange: {
      minVariantPrice: {
        amount: "29.99",
      },
    },
    images: {
      edges: [
        {
          node: {
            url: "/images/product-placeholder.jpg",
            altText: "A-OK T-Shirt",
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: "gid://shopify/ProductVariant/1",
            title: "S",
            price: {
              amount: "29.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "S",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Red",
            },
          },
        },
        {
          node: {
            id: "gid://shopify/ProductVariant/2",
            title: "M",
            price: {
              amount: "29.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "M",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Blue",
            },
          },
        },
        {
          node: {
            id: "gid://shopify/ProductVariant/3",
            title: "L",
            price: {
              amount: "29.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "L",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Green",
            },
          },
        },
      ],
    },
    options: [
      {
        name: "Size",
        values: ["S", "M", "L"],
      },
    ],
    metafield: {
      namespace: "custom",
      key: "color",
      value: "Red",
    },
    tags: ["t-shirt", "apparel"],
    productType: "T-Shirts",
  },
  {
    id: "gid://shopify/Product/2",
    handle: "mock-hoodie-1",
    title: "A-OK Hoodie",
    description: "A warm hoodie with the A-OK logo",
    createdAt: "2022-01-01T00:00:00Z",
    priceRange: {
      minVariantPrice: {
        amount: "49.99",
      },
    },
    images: {
      edges: [
        {
          node: {
            url: "/images/product-placeholder.jpg",
            altText: "A-OK Hoodie",
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: "gid://shopify/ProductVariant/4",
            title: "S",
            price: {
              amount: "49.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "S",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Red",
            },
          },
        },
        {
          node: {
            id: "gid://shopify/ProductVariant/5",
            title: "M",
            price: {
              amount: "49.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "M",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Blue",
            },
          },
        },
        {
          node: {
            id: "gid://shopify/ProductVariant/6",
            title: "L",
            price: {
              amount: "49.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "L",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Green",
            },
          },
        },
        {
          node: {
            id: "gid://shopify/ProductVariant/7",
            title: "XL",
            price: {
              amount: "49.99",
            },
            availableForSale: true,
            selectedOptions: [
              {
                name: "Size",
                value: "XL",
              },
            ],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Yellow",
            },
          },
        },
      ],
    },
    options: [
      {
        name: "Size",
        values: ["S", "M", "L", "XL"],
      },
    ],
    metafield: {
      namespace: "custom",
      key: "color",
      value: "Red",
    },
    tags: ["hoodie", "apparel"],
    productType: "Hoodies",
  },
  {
    id: "gid://shopify/Product/3",
    handle: "mock-hat-1",
    title: "A-OK Baseball Cap",
    description: "A stylish baseball cap with the A-OK logo",
    createdAt: "2022-01-01T00:00:00Z",
    priceRange: {
      minVariantPrice: {
        amount: "24.99",
      },
    },
    images: {
      edges: [
        {
          node: {
            url: "/images/product-placeholder.jpg",
            altText: "A-OK Baseball Cap",
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: "gid://shopify/ProductVariant/7",
            title: "Default Title",
            price: {
              amount: "24.99",
            },
            availableForSale: true,
            selectedOptions: [],
            metafield: {
              namespace: "custom",
              key: "color",
              value: "Red",
            },
          },
        },
      ],
    },
    options: [],
    metafield: {
      namespace: "custom",
      key: "color",
      value: "Red",
    },
    tags: ["hat", "cap", "apparel"],
    productType: "Hats",
  },
];

// Fetch all products
export async function getAllProducts() {
  const client = getShopifyClient();

  const query = `
    query {
      products(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            description
            descriptionHtml
            createdAt
            priceRange {
              minVariantPrice {
                amount
              }
            }
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                  metafield(namespace: "custom", key: "color") {
                    value
                    type
                  }
                }
              }
            }
            options {
              name
              values
            }
            metafield(namespace: "custom", key: "color") {
              value
              type
            }
            tags
            productType
          }
        }
      }
    }
  `;

  try {
    console.log("Fetching products from Shopify...");
    console.log("GraphQL Query:", query);

    const data = await client.request<{
      products: { edges: Array<{ node: ShopifyProduct }> };
    }>(query);
    console.log("Products fetched successfully:", data.products.edges.length);

    // Log all product types to see the exact values
    const products = data.products.edges.map(({ node }) => node);
    console.log(
      "All product types in Shopify:",
      products.map((p) => `"${p.productType}"`).join(", ")
    );

    return products;
  } catch (error) {
    console.error("Error fetching all products:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      // Check if error has a response property (GraphQL client error)
      const graphqlError = error as any;
      if (graphqlError.response) {
        console.error(
          "Response details:",
          JSON.stringify(graphqlError.response, null, 2)
        );
      }
    }

    console.log("Using mock products instead");
    return mockProducts;
  }
}

// Fetch products by category
export async function getProductsByCategory(category: string) {
  const client = getShopifyClient();

  // Map UI category names to query patterns using both tags and product types
  let queryFilter = "";

  if (category.toLowerCase() === "hats") {
    // Use both tag and product_type filters for hats
    queryFilter = "tag:hats OR product_type:hats";
  } else if (category.toLowerCase() === "t-shirts") {
    // Use both tag and product_type filters for t-shirts
    queryFilter = "tag:t-shirts OR product_type:t-shirts";
  } else if (category.toLowerCase() === "hoodies") {
    // Use both tag and product_type filters for hoodies
    queryFilter = "tag:hoodies OR product_type:hoodies";
  } else {
    // Default case - use the category as both tag and product_type
    queryFilter = `tag:${category.toLowerCase()} OR product_type:${category.toLowerCase()}`;
  }

  const query = `
    query {
      products(first: 50, sortKey: CREATED_AT, reverse: true, query: "${queryFilter}") {
        edges {
          node {
            id
            handle
            title
            description
            descriptionHtml
            createdAt
            priceRange {
              minVariantPrice {
                amount
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                  metafield(namespace: "custom", key: "color") {
                    value
                    type
                  }
                }
              }
            }
            options {
              name
              values
            }
            metafield(namespace: "custom", key: "color") {
              value
              type
            }
            tags
            productType
          }
        }
      }
    }
  `;

  try {
    console.log(
      `Fetching products for category: ${category} using filter: ${queryFilter}`
    );

    const data = await client.request<{
      products: { edges: Array<{ node: ShopifyProduct }> };
    }>(query);
    console.log(
      "Category products fetched successfully:",
      data.products.edges.length
    );

    const products = data.products.edges.map(({ node }) => node);

    // Log the product details that were found
    console.log("Found products:");
    products.forEach((p) => {
      console.log(
        `- ${p.title} (Type: "${p.productType}", Tags: ${p.tags.join(", ")})`
      );
    });

    return products;
  } catch (error) {
    console.error(`Error fetching products for category ${category}:`, error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      // Check if error has a response property (GraphQL client error)
      const graphqlError = error as any;
      if (graphqlError.response) {
        console.error(
          "Response details:",
          JSON.stringify(graphqlError.response, null, 2)
        );
      }
    }

    // Fallback to getting all products and filtering manually
    console.log(`Falling back to manual filtering for category: ${category}`);
    const allProducts = await getAllProducts();

    // Filter products by both tags and product type
    const filteredProducts = allProducts.filter((product) => {
      const normalizedTags = product.tags.map((tag) => tag.toLowerCase());
      const normalizedProductType = product.productType.toLowerCase();

      // Check if any tag or product type matches the category
      if (category.toLowerCase() === "hats") {
        return (
          normalizedTags.some(
            (tag) => tag.includes("hat") || tag.includes("cap")
          ) ||
          normalizedProductType.includes("hat") ||
          normalizedProductType.includes("cap")
        );
      } else if (category.toLowerCase() === "t-shirts") {
        return (
          normalizedTags.some((tag) => tag.includes("shirt")) ||
          normalizedProductType.includes("t-shirt")
        );
      } else if (category.toLowerCase() === "hoodies") {
        return (
          normalizedTags.some((tag) => tag.includes("hoodie")) ||
          normalizedProductType.includes("hoodie")
        );
      } else {
        return (
          normalizedTags.some((tag) => tag.includes(category.toLowerCase())) ||
          normalizedProductType.includes(category.toLowerCase())
        );
      }
    });

    console.log(
      `Fallback found ${filteredProducts.length} products for category: ${category}`
    );
    return filteredProducts;
  }
}

// Fetch a single product by handle
export async function getProductByHandle(handle: string) {
  // For mock data, return a mock product if the handle matches
  const mockProduct = mockProducts.find((p) => p.handle === handle);
  if (mockProduct) {
    return mockProduct;
  }

  const client = getShopifyClient();

  const query = `
    query GetProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        description
        descriptionHtml
        priceRange {
          minVariantPrice {
            amount
          }
        }
        images(first: 10) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 20) {
          edges {
            node {
              id
              title
              price {
                amount
              }
              availableForSale
              selectedOptions {
                name
                value
              }
              metafield(namespace: "custom", key: "color") {
                value
                type
              }
            }
          }
        }
        options {
          name
          values
        }
        metafield(namespace: "custom", key: "color") {
          value
          type
        }
        tags
        productType
      }
    }
  `;

  try {
    console.log(`Fetching product with handle: ${handle}`);
    console.log(`Using query: ${query}`);
    console.log(`With variables: ${JSON.stringify({ handle })}`);
    
    const data = await client.request<{ productByHandle: ShopifyProduct }>(
      query,
      { handle }
    );
    
    console.log(`API response received: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    
    if (!data || !data.productByHandle) {
      console.error(`No product found with handle: ${handle}`);
      // Return the first mock product as a fallback
      return mockProducts[0];
    }
    
    return data.productByHandle;
  } catch (error) {
    console.error("Error fetching product:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      // Check if error has a response property (GraphQL client error)
      const graphqlError = error as any;
      if (graphqlError.response) {
        console.error(
          "Response details:",
          JSON.stringify(graphqlError.response, null, 2)
        );
      }
    }

    // Return the first mock product as a fallback
    return mockProducts[0];
  }
}

// Create a checkout
export async function createShopifyCheckout(
  lineItems: Array<{ 
    variantId: string; 
    quantity: number; 
    size?: string;
    color?: string;
  }>
) {
  const client = getShopifyClient();

  // Use cartCreate instead of checkoutCreate (which is deprecated)
  const query = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Convert lineItems to the format expected by the Shopify API
  const formattedLineItems = lineItems.map((item) => {
    const lineItem: any = {
      merchandiseId: item.variantId,
      quantity: item.quantity,
    };
    
    // Add attributes array if we have color or size
    if (item.color || item.size) {
      lineItem.attributes = [];
      
      if (item.color) {
        lineItem.attributes.push({
          key: "Color",
          value: item.color
        });
      }
      
      if (item.size) {
        lineItem.attributes.push({
          key: "Size",
          value: item.size
        });
      }
    }
    
    return lineItem;
  });

  try {
    const variables = {
      input: {
        lines: formattedLineItems,
      },
    };

    console.log(
      "Creating cart with variables:",
      JSON.stringify(variables, null, 2)
    );

    const data = await client.request<{
      cartCreate: {
        cart: {
          id: string;
          checkoutUrl: string;
        };
        userErrors: Array<{
          field: string;
          message: string;
        }>;
      };
    }>(query, variables);

    console.log("Cart creation response:", JSON.stringify(data, null, 2));

    if (data.cartCreate.userErrors.length > 0) {
      console.error("Cart creation errors:", data.cartCreate.userErrors);
      throw new Error(data.cartCreate.userErrors[0].message);
    }

    // Get the original checkout URL from Shopify
    const originalCheckoutUrl = data.cartCreate.cart.checkoutUrl;
    console.log("Original checkout URL:", originalCheckoutUrl);

    // Instead of trying to parse and reconstruct the URL, use the original URL structure
    // but replace the domain with our custom checkout domain
    const redirectUrl = originalCheckoutUrl.replace(
      /https:\/\/[^\/]+/,
      "https://checkout.a-ok.shop"
    );

    console.log("Redirecting to:", redirectUrl);

    return redirectUrl;
  } catch (error) {
    console.error("Error creating checkout:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      // Check if error has a response property (GraphQL client error)
      const graphqlError = error as any;
      if (graphqlError.response) {
        console.error(
          "Response details:",
          JSON.stringify(graphqlError.response, null, 2)
        );
      }
    }

    throw new Error(
      "Unable to create checkout. Please try again or contact support."
    );
  }
}
