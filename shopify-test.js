// Simple script to test Shopify API connection
const { GraphQLClient } = require('graphql-request');

// Hardcoded credentials (same as in your shopify.ts file)
const storeDomain = 'aokstore.myshopify.com';
const token = '4b49c3f76d66c4c3e27116438c3470d3';

// Try different API versions to see which one works
const apiVersions = ['2023-04', '2023-07', '2023-10', '2024-01'];

async function testShopifyConnection() {
  console.log('Testing Shopify API connection...');
  
  for (const version of apiVersions) {
    const endpoint = `https://${storeDomain}/api/${version}/graphql.json`;
    
    console.log(`\nTrying API version: ${version}`);
    console.log(`Endpoint: ${endpoint}`);
    
    const client = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Storefront-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });
    
    const query = `
      query {
        shop {
          name
          primaryDomain {
            url
          }
        }
      }
    `;
    
    try {
      const data = await client.request(query);
      console.log('SUCCESS! Connection established.');
      console.log('Shop data:', JSON.stringify(data, null, 2));
      
      // If we got here, try fetching products with this version
      const productsQuery = `
        query {
          products(first: 5) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `;
      
      try {
        const productsData = await client.request(productsQuery);
        console.log('Products data:', JSON.stringify(productsData, null, 2));
        console.log(`✅ API version ${version} works for both shop and products!`);
      } catch (productError) {
        console.error(`❌ Could connect to shop but failed to fetch products with API version ${version}:`, productError.message);
      }
      
    } catch (error) {
      console.error(`❌ Failed with API version ${version}:`, error.message);
    }
  }
}

testShopifyConnection().catch(error => {
  console.error('Unhandled error:', error);
});
