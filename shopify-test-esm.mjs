// ESM version of the Shopify API test script
import { GraphQLClient } from 'graphql-request';
import fetch from 'node-fetch';

// Hardcoded credentials (same as in your shopify.ts file)
const storeDomain = 'aokstore.myshopify.com';
const token = '4b49c3f76d66c4c3e27116438c3470d3';

// Test basic store access
async function testStoreAccess() {
  console.log('=== TESTING SHOPIFY STORE ACCESS ===');
  console.log(`Store domain: ${storeDomain}`);
  
  try {
    const response = await fetch(`https://${storeDomain}`);
    console.log(`Store response status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Store exists and is accessible');
      return true;
    } else {
      console.log(`❌ Store returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error accessing store:', error.message);
    return false;
  }
}

// Test Shopify Storefront API with the 2023-07 API version
async function testStorefrontAPI() {
  console.log('\n=== TESTING SHOPIFY STOREFRONT API ===');
  console.log(`API token (first/last 4): ${token.substring(0, 4)}...${token.substring(token.length - 4)}`);
  
  // Try the standard endpoint format
  const endpoint = `https://${storeDomain}/api/2023-07/graphql`;
  console.log(`Endpoint: ${endpoint}`);
  
  const client = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
  
  const query = `
    {
      products(first: 5) {
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
    console.log('Sending GraphQL query...');
    const data = await client.request(query);
    
    console.log('✅ Successfully connected to Shopify API!');
    if (data.products && data.products.edges) {
      console.log(`Found ${data.products.edges.length} products:`);
      data.products.edges.forEach(({ node }, index) => {
        console.log(`${index + 1}. ${node.title} (${node.handle})`);
      });
    } else {
      console.log('No products found in the response');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error connecting to Shopify API:', error.message);
    if (error.response) {
      console.error('Response details:', JSON.stringify(error.response, null, 2));
    }
    return { success: false, error };
  }
}

// Main function to run all tests
async function runTests() {
  const storeAccessible = await testStoreAccess();
  
  if (!storeAccessible) {
    console.log('\n⚠️ Warning: Could not access the store. API tests may still work if the API is enabled.');
  }
  
  const apiResult = await testStorefrontAPI();
  
  console.log('\n=== FINAL DIAGNOSIS ===');
  if (apiResult.success) {
    console.log('✅ Your Shopify Storefront API is working correctly!');
    console.log('Update your shopify.ts file with the working configuration.');
  } else {
    console.log('❌ Could not connect to the Shopify Storefront API.');
    console.log('\nPossible issues:');
    console.log('1. The Storefront API access token is invalid or expired');
    console.log('2. The Storefront API is not enabled for your store');
    console.log('3. Your store domain is incorrect');
    console.log('4. Your Shopify plan does not include Storefront API access');
    console.log('\nRecommended actions:');
    console.log('1. Verify your store domain is correct');
    console.log('2. Generate a new Storefront API token in your Shopify admin');
    console.log('3. Check that your Shopify plan includes API access');
    console.log('4. Contact Shopify support if issues persist');
  }
}

runTests().catch(error => {
  console.error('Unhandled error:', error);
});
