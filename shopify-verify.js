// Verify Shopify API connection with correct store domain
const { GraphQLClient } = require('graphql-request');

// Use the correct store domain from the admin URL
const storeDomain = '19gpdr-ps.myshopify.com';
const token = '4b49c3f76d66c4c3e27116438c3470d3';
const endpoint = `https://${storeDomain}/api/2023-07/graphql.json`;

console.log('Testing Shopify API connection with:');
console.log('Store domain:', storeDomain);
console.log('API endpoint:', endpoint);
console.log('Token (first/last 4):', token.substring(0, 4) + '...' + token.substring(token.length - 4));

const client = new GraphQLClient(endpoint, {
  headers: {
    'X-Shopify-Storefront-Access-Token': token,
    'Content-Type': 'application/json',
  },
});

// Simple query to get products
const query = `
  {
    products(first: 10) {
      edges {
        node {
          id
          title
          handle
          description
          productType
        }
      }
    }
  }
`;

async function testConnection() {
  try {
    console.log('\nSending query to Shopify...');
    const data = await client.request(query);
    
    console.log('\n✅ SUCCESS! Connected to Shopify API');
    
    if (data.products && data.products.edges && data.products.edges.length > 0) {
      console.log(`Found ${data.products.edges.length} products:`);
      data.products.edges.forEach(({ node }, index) => {
        console.log(`\n${index + 1}. ${node.title}`);
        console.log(`   ID: ${node.id}`);
        console.log(`   Handle: ${node.handle}`);
        console.log(`   Type: ${node.productType}`);
        console.log(`   Description: ${node.description.substring(0, 50)}...`);
      });
    } else {
      console.log('No products found in your store.');
    }
  } catch (error) {
    console.error('❌ ERROR connecting to Shopify API:', error.message);
    if (error.response) {
      console.error('Response details:', JSON.stringify(error.response, null, 2));
    }
  }
}

testConnection();
