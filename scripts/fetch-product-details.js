// Script to fetch detailed product information from Shopify
const { GraphQLClient } = require('graphql-request');

// Initialize GraphQL client
const getShopifyClient = () => {
  // Hardcoded credentials for testing
  const storeDomain = '19gpdr-ps.myshopify.com';
  const token = '4b49c3f76d66c4c3e27116438c3470d3';
  
  // Shopify Storefront API endpoint
  const endpoint = `https://${storeDomain}/api/2023-07/graphql.json`;

  console.log('Connecting to Shopify API at:', endpoint);
  
  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Fetch all available product information
async function fetchProductDetails() {
  const client = getShopifyClient();
  
  // Query with expanded fields to get as much product data as possible
  const query = `
    query {
      products(first: 250) {
        edges {
          node {
            id
            handle
            title
            description
            descriptionHtml
            productType
            vendor
            tags
            options {
              id
              name
              values
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  id
                  url
                  altText
                  width
                  height
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  sku
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            collections(first: 5) {
              edges {
                node {
                  id
                  handle
                  title
                }
              }
            }
            onlineStoreUrl
            availableForSale
            createdAt
            updatedAt
            publishedAt
          }
        }
      }
    }
  `;

  try {
    console.log('Fetching detailed product information...');
    const data = await client.request(query);
    
    // Process and display the results
    const products = data.products.edges.map(({ node }) => node);
    
    console.log(`\nFound ${products.length} products:\n`);
    
    products.forEach((product, index) => {
      console.log(`\n===== PRODUCT ${index + 1} =====`);
      console.log(`ID: ${product.id}`);
      console.log(`Title: ${product.title}`);
      console.log(`Handle: ${product.handle}`);
      console.log(`Product Type: "${product.productType}"`);
      console.log(`Tags: ${product.tags.join(', ')}`);
      console.log(`Vendor: ${product.vendor}`);
      
      // Log collections
      if (product.collections && product.collections.edges.length > 0) {
        console.log('\nCollections:');
        product.collections.edges.forEach(({ node }) => {
          console.log(`  - ${node.title} (${node.handle})`);
        });
      }
      
      // Log variants
      if (product.variants && product.variants.edges.length > 0) {
        console.log('\nVariants:');
        product.variants.edges.forEach(({ node }) => {
          console.log(`  - ${node.title}: $${node.price.amount} (SKU: ${node.sku || 'N/A'})`);
          
          if (node.selectedOptions && node.selectedOptions.length > 0) {
            console.log('    Options:');
            node.selectedOptions.forEach(option => {
              console.log(`      ${option.name}: ${option.value}`);
            });
          }
        });
      }
      
      console.log('\n');
    });
    
    // Save full data to a JSON file for inspection
    const fs = require('fs');
    fs.writeFileSync('product-details.json', JSON.stringify(data, null, 2));
    console.log('Full product details saved to product-details.json');
    
  } catch (error) {
    console.error('Error fetching product details:', error);
    if (error.response) {
      console.error('Response details:', JSON.stringify(error.response, null, 2));
    }
  }
}

// Run the script
fetchProductDetails();
