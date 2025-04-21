import { GraphQLClient } from 'graphql-request';

// Types for Shopify API responses
export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
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
const getShopifyClient = () => {
  // Get credentials from environment variables or use hardcoded values for development
  // The correct store domain is from the admin URL: 19gpdr-ps
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || '19gpdr-ps.myshopify.com';
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN || '4b49c3f76d66c4c3e27116438c3470d3';
  
  // Correct Shopify Storefront API endpoint format
  const endpoint = `https://${storeDomain}/api/2023-07/graphql.json`;

  if (!endpoint || !token) {
    throw new Error('Shopify API credentials are missing');
  }

  console.log('Connecting to Shopify API at:', endpoint);
  console.log('Using token:', token.substring(0, 4) + '...' + token.substring(token.length - 4));
  
  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Mock products for development when API is not available
const mockProducts: ShopifyProduct[] = [
  {
    id: 'gid://shopify/Product/1',
    handle: 'mock-tshirt-1',
    title: 'A-OK T-Shirt',
    description: 'A comfortable t-shirt with the A-OK logo',
    priceRange: {
      minVariantPrice: {
        amount: '29.99',
      },
    },
    images: {
      edges: [
        {
          node: {
            url: '/images/product-placeholder.jpg',
            altText: 'A-OK T-Shirt',
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/1',
            title: 'Default',
            price: {
              amount: '29.99',
            },
            availableForSale: true,
          },
        },
      ],
    },
    tags: ['t-shirt', 'apparel'],
    productType: 'T-Shirts',
  },
  {
    id: 'gid://shopify/Product/2',
    handle: 'mock-hoodie-1',
    title: 'A-OK Hoodie',
    description: 'A warm hoodie with the A-OK logo',
    priceRange: {
      minVariantPrice: {
        amount: '49.99',
      },
    },
    images: {
      edges: [
        {
          node: {
            url: '/images/product-placeholder.jpg',
            altText: 'A-OK Hoodie',
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/2',
            title: 'Default',
            price: {
              amount: '49.99',
            },
            availableForSale: true,
          },
        },
      ],
    },
    tags: ['hoodie', 'apparel'],
    productType: 'Hoodies',
  },
  {
    id: 'gid://shopify/Product/3',
    handle: 'mock-cap-1',
    title: 'A-OK Cap',
    description: 'A stylish cap with the A-OK logo',
    priceRange: {
      minVariantPrice: {
        amount: '19.99',
      },
    },
    images: {
      edges: [
        {
          node: {
            url: '/images/product-placeholder.jpg',
            altText: 'A-OK Cap',
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/3',
            title: 'Default',
            price: {
              amount: '19.99',
            },
            availableForSale: true,
          },
        },
      ],
    },
    tags: ['cap', 'accessories'],
    productType: 'Accessories',
  },
];

// Fetch all products
export async function getAllProducts() {
  const client = getShopifyClient();
  
  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            handle
            title
            description
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
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                  }
                  availableForSale
                }
              }
            }
            tags
            productType
          }
        }
      }
    }
  `;

  try {
    console.log('Fetching products from Shopify...');
    console.log('GraphQL Query:', query);
    
    const data = await client.request<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(query);
    console.log('Products fetched successfully:', data.products.edges.length);
    return data.products.edges.map(({ node }) => node);
  } catch (error) {
    console.error('Error fetching products from Shopify API:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      // @ts-ignore
      if (error.response) {
        // @ts-ignore
        console.error('Response details:', JSON.stringify(error.response, null, 2));
      }
    }
    
    console.log('Using mock products instead');
    return mockProducts;
  }
}

// Fetch a single product by handle
export async function getProductByHandle(handle: string) {
  // For mock data, return a mock product if the handle matches
  const mockProduct = mockProducts.find(p => p.handle === handle);
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
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
              }
              availableForSale
            }
          }
        }
        tags
        productType
      }
    }
  `;

  try {
    const data = await client.request<{ productByHandle: ShopifyProduct }>(query, { handle });
    return data.productByHandle;
  } catch (error) {
    console.error('Error fetching product:', error);
    // Return the first mock product as a fallback
    return mockProducts[0];
  }
}

// Create a checkout
export async function createShopifyCheckout(lineItems: Array<{ variantId: string; quantity: number }>) {
  const client = getShopifyClient();
  
  const query = `
    mutation CheckoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout {
          id
          webUrl
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  // Convert lineItems to the format expected by the Shopify API
  const formattedLineItems = lineItems.map(item => ({
    variantId: item.variantId,
    quantity: item.quantity
  }));

  try {
    const variables = {
      input: {
        lineItems: formattedLineItems,
      },
    };

    const data = await client.request<{
      checkoutCreate: {
        checkout: {
          id: string;
          webUrl: string;
        };
        checkoutUserErrors: Array<{
          code: string;
          field: string;
          message: string;
        }>;
      };
    }>(query, variables);

    if (data.checkoutCreate.checkoutUserErrors.length > 0) {
      throw new Error(data.checkoutCreate.checkoutUserErrors[0].message);
    }

    return data.checkoutCreate.checkout.webUrl;
  } catch (error) {
    console.error('Error creating checkout:', error);
    // Return a mock checkout URL
    return 'https://aokstore.myshopify.com/checkout';
  }
}
