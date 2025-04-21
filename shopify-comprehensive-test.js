// Comprehensive Shopify API test script
const { GraphQLClient } = require('graphql-request');
const fetch = require('node-fetch');

// Hardcoded credentials (same as in your shopify.ts file)
const storeDomain = 'aokstore.myshopify.com';
const token = '4b49c3f76d66c4c3e27116438c3470d3';

// Test multiple endpoint formats and API versions
async function testAllEndpointFormats() {
  console.log('=== COMPREHENSIVE SHOPIFY API TEST ===');
  console.log('Store Domain:', storeDomain);
  console.log('Token (first/last 4 chars):', token.substring(0, 4) + '...' + token.substring(token.length - 4));
  console.log('\n');

  // Test if the store exists by making a simple HTTP request to the storefront
  try {
    console.log(`Testing if store exists at https://${storeDomain}...`);
    const storeResponse = await fetch(`https://${storeDomain}`);
    console.log(`Store response status: ${storeResponse.status}`);
    if (storeResponse.status === 200) {
      console.log('✅ Store exists and is accessible');
    } else {
      console.log('⚠️ Store might not exist or is password protected');
    }
  } catch (error) {
    console.error('❌ Error checking store existence:', error.message);
  }
  
  console.log('\n=== TESTING DIFFERENT API ENDPOINT FORMATS ===\n');

  // Test various endpoint formats
  const endpointFormats = [
    // Standard versioned endpoints
    `https://${storeDomain}/api/2023-07/graphql.json`,
    `https://${storeDomain}/api/2023-10/graphql.json`,
    `https://${storeDomain}/api/2024-01/graphql.json`,
    
    // Without .json extension
    `https://${storeDomain}/api/2023-07/graphql`,
    
    // Unstable endpoint
    `https://${storeDomain}/api/unstable/graphql.json`,
    
    // Alternative formats
    `https://${storeDomain}/api/graphql`,
    `https://${storeDomain}/api/storefront/2023-07/graphql.json`,
    `https://${storeDomain}/api/storefront/2023-07/graphql`,
  ];
  
  // Different token header formats to try
  const tokenHeaders = [
    { 'X-Shopify-Storefront-Access-Token': token },
    { 'Shopify-Storefront-Private-Token': token },
    { 'X-Shopify-Access-Token': token },
  ];

  // Simple query to test connection
  const simpleQuery = `
    {
      shop {
        name
      }
    }
  `;
  
  // Test each combination of endpoint and header
  for (const endpoint of endpointFormats) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    
    for (const tokenHeader of tokenHeaders) {
      const headerName = Object.keys(tokenHeader)[0];
      console.log(`  With header: ${headerName}`);
      
      const client = new GraphQLClient(endpoint, {
        headers: {
          ...tokenHeader,
          'Content-Type': 'application/json',
        },
      });
      
      try {
        const data = await client.request(simpleQuery);
        console.log(`  ✅ SUCCESS with ${headerName}!`);
        console.log(`  Response:`, JSON.stringify(data, null, 2));
        
        // If successful, try to fetch products
        try {
          const productsQuery = `
            {
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
          
          const productsData = await client.request(productsQuery);
          console.log(`  ✅ Successfully fetched products!`);
          console.log(`  Found ${productsData.products.edges.length} products`);
          
          // Save the working configuration for future reference
          console.log('\n=== WORKING CONFIGURATION ===');
          console.log(`Endpoint: ${endpoint}`);
          console.log(`Header: ${headerName}: ${token}`);
          console.log('Query format:');
          console.log(productsQuery);
          
          return {
            success: true,
            endpoint,
            headerName,
            headerValue: token,
            products: productsData.products.edges
          };
        } catch (productError) {
          console.log(`  ❌ Connected to API but failed to fetch products: ${productError.message}`);
        }
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
  }
  
  return { success: false };
}

// Run the tests
testAllEndpointFormats()
  .then(result => {
    if (result.success) {
      console.log('\n=== FINAL RESULTS ===');
      console.log('Successfully connected to Shopify API!');
      console.log(`Found ${result.products.length} products`);
      console.log('\nUpdate your shopify.ts file with:');
      console.log(`endpoint = "${result.endpoint}";`);
      console.log(`headers = { "${result.headerName}": "${result.headerValue}" };`);
    } else {
      console.log('\n=== FINAL RESULTS ===');
      console.log('❌ Failed to connect to Shopify API with any configuration.');
      console.log('Please check:');
      console.log('1. Your Shopify store domain is correct');
      console.log('2. Your Storefront API token is valid');
      console.log('3. The Storefront API is enabled for your store');
      console.log('4. Your store is on a plan that includes Storefront API access');
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
  });
