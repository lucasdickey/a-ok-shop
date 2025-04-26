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
  // Get credentials from environment variables
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
  
  if (!storeDomain || !token) {
    console.error('Missing Shopify API credentials');
    throw new Error('Shopify API credentials are missing. Please check your environment variables.');
  }
  
  // Correct Shopify Storefront API endpoint format
  const endpoint = `https://${storeDomain}/api/2023-07/graphql.json`;

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
    
    // Log all product types to see the exact values
    const products = data.products.edges.map(({ node }) => node);
    console.log('All product types in Shopify:', products.map(p => `"${p.productType}"`).join(', '));
    
    return products;
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

// Fetch products by category
export async function getProductsByCategory(category: string) {
  const client = getShopifyClient();
  
  // Map UI category names to query patterns using both tags and product types
  let queryFilter = '';
  
  if (category.toLowerCase() === 'hats') {
    // Use both tag and product_type filters for hats
    queryFilter = 'tag:hats OR product_type:hats';
  } else if (category.toLowerCase() === 't-shirts') {
    // Use both tag and product_type filters for t-shirts
    queryFilter = 'tag:t-shirts OR product_type:t-shirts';
  } else if (category.toLowerCase() === 'hoodies') {
    // Use both tag and product_type filters for hoodies
    queryFilter = 'tag:hoodies OR product_type:hoodies';
  } else {
    // Default case - use the category as both tag and product_type
    queryFilter = `tag:${category.toLowerCase()} OR product_type:${category.toLowerCase()}`;
  }
  
  const query = `
    query {
      products(first: 50, query: "${queryFilter}") {
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
    console.log(`Fetching products for category: ${category} using filter: ${queryFilter}`);
    
    const data = await client.request<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(query);
    console.log('Category products fetched successfully:', data.products.edges.length);
    
    const products = data.products.edges.map(({ node }) => node);
    
    // Log the product details that were found
    console.log('Found products:');
    products.forEach(p => {
      console.log(`- ${p.title} (Type: "${p.productType}", Tags: ${p.tags.join(', ')})`);
    });
    
    return products;
  } catch (error) {
    console.error(`Error fetching products for category ${category}:`, error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      // @ts-ignore
      if (error.response) {
        // @ts-ignore
        console.error('Response details:', JSON.stringify(error.response, null, 2));
      }
    }
    
    // Fallback to getting all products and filtering manually
    console.log(`Falling back to manual filtering for category: ${category}`);
    const allProducts = await getAllProducts();
    
    // Filter products by both tags and product type
    const filteredProducts = allProducts.filter(product => {
      const normalizedTags = product.tags.map(tag => tag.toLowerCase());
      const normalizedProductType = product.productType.toLowerCase();
      
      // Check if any tag or product type matches the category
      if (category.toLowerCase() === 'hats') {
        return normalizedTags.some(tag => tag.includes('hat') || tag.includes('cap')) || 
               normalizedProductType.includes('hat') || 
               normalizedProductType.includes('cap');
      } else if (category.toLowerCase() === 't-shirts') {
        return normalizedTags.some(tag => tag.includes('shirt')) || 
               normalizedProductType.includes('t-shirt');
      } else if (category.toLowerCase() === 'hoodies') {
        return normalizedTags.some(tag => tag.includes('hoodie')) || 
               normalizedProductType.includes('hoodie');
      } else {
        return normalizedTags.some(tag => tag.includes(category.toLowerCase())) || 
               normalizedProductType.includes(category.toLowerCase());
      }
    });
    
    console.log(`Fallback found ${filteredProducts.length} products for category: ${category}`);
    return filteredProducts;
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

    console.log('Creating checkout with variables:', JSON.stringify(variables, null, 2));
    
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

    console.log('Checkout response:', JSON.stringify(data, null, 2));
    
    if (data.checkoutCreate.checkoutUserErrors.length > 0) {
      console.error('Checkout creation errors:', data.checkoutCreate.checkoutUserErrors);
      throw new Error(data.checkoutCreate.checkoutUserErrors[0].message);
    }

    // Get the original checkout URL from Shopify
    const originalCheckoutUrl = data.checkoutCreate.checkout.webUrl;
    console.log('Original checkout URL:', originalCheckoutUrl);
    
    // Extract the checkout token from the original URL
    // Original format: https://store-name.myshopify.com/checkouts/c/token
    // We need to extract just the token part
    const urlParts = originalCheckoutUrl.split('/');
    const checkoutToken = urlParts[urlParts.length - 1];
    
    // Construct the new checkout URL with the subdomain
    const redirectUrl = `https://checkout.a-ok.shop/checkouts/${checkoutToken}`;
    console.log('Redirecting to:', redirectUrl);
    
    return redirectUrl;
  } catch (error) {
    console.error('Error creating checkout:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      // @ts-ignore
      if (error.response) {
        // @ts-ignore
        console.error('Response details:', JSON.stringify(error.response, null, 2));
      }
    }
    
    throw new Error('Unable to create checkout. Please try again or contact support.');
  }
}
