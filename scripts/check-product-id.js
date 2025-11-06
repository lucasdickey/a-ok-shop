// Script to check if a product ID exists in the Shopify store
const { GraphQLClient } = require('graphql-request');

const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const productId = '8871269892315'; // The ID to check

// Initialize GraphQL client
const client = new GraphQLClient(
  `https://${SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  }
);

// Query to get product by ID
const query = `
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      productType
      tags
    }
  }
`;

async function checkProductId() {
  try {
    // First try with the raw ID
    let data = await client.request(query, { id: productId });
    
    if (!data.product) {
      // If not found, try with the gid format
      data = await client.request(query, { id: `gid://shopify/Product/${productId}` });
    }
    
    if (data.product) {
      console.log('Product found:');
      console.log('- ID:', data.product.id);
      console.log('- Title:', data.product.title);
      console.log('- Handle:', data.product.handle);
      console.log('- Type:', data.product.productType);
      console.log('- Tags:', data.product.tags.join(', '));
    } else {
      console.log('No product found with ID:', productId);
      
      // Fetch all products to see what's available
      const allProductsQuery = `
        query {
          products(first: 20) {
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
      
      const allData = await client.request(allProductsQuery);
      console.log('\nAvailable products:');
      allData.products.edges.forEach(({ node }) => {
        console.log(`- ${node.title} (ID: ${node.id}, Handle: ${node.handle})`);
      });
    }
  } catch (error) {
    console.error('Error checking product ID:', error);
  }
}

checkProductId();
