// Updated script to test Shopify API connection with correct URL format
const { GraphQLClient } = require('graphql-request');

// Hardcoded credentials (same as in your shopify.ts file)
const storeDomain = 'aokstore.myshopify.com';
const token = '4b49c3f76d66c4c3e27116438c3470d3';

// The correct Shopify Storefront API endpoint format
const endpoint = `https://${storeDomain}/api/2023-07/graphql`;

async function testShopifyConnection() {
  console.log('Testing Shopify API connection...');
  console.log(`Endpoint: ${endpoint}`);
  
  const client = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
  
  const query = `
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `;
  
  try {
    const data = await client.request(query);
    console.log('SUCCESS! Products retrieved:');
    
    if (data.products && data.products.edges) {
      console.log(`Found ${data.products.edges.length} products:`);
      data.products.edges.forEach(({ node }, index) => {
        console.log(`${index + 1}. ${node.title} (${node.handle})`);
      });
    } else {
      console.log('No products found in the response.');
    }
    
    return data;
  } catch (error) {
    console.error('Error connecting to Shopify API:', error.message);
    if (error.response) {
      console.error('Response details:', JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
}

testShopifyConnection().catch(error => {
  console.error('Unhandled error:', error);
});
