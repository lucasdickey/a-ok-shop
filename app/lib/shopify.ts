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
  const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  if (!endpoint || !token) {
    throw new Error('Shopify API credentials are missing');
  }

  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
    },
  });
};

// Fetch all products
export async function getAllProducts() {
  const client = getShopifyClient();
  
  const query = `
    query GetAllProducts {
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
    const data = await client.request<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(query);
    return data.products.edges.map(({ node }) => node);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Fetch a single product by handle
export async function getProductByHandle(handle: string) {
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
    return null;
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
    return null;
  }
}
