require('dotenv').config({ path: '/Users/lucasdickey/Documents/VibePOCs/a-ok-store/.env' });
const { writeFile } = require('fs/promises');
const path = require('path');
const { GraphQLClient } = require('graphql-request');

async function exportShopifyProducts() {
  try {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

    console.log('Store Domain:', storeDomain);
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!storeDomain || !token) {
      throw new Error('Missing Shopify API credentials');
    }

    const client = new GraphQLClient(`https://${storeDomain}/api/2024-01/graphql.json`, {
      headers: {
        "X-Shopify-Storefront-Access-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    // GraphQL query to fetch all products with comprehensive details
    const query = `
      query {
        products(first: 250, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              handle
              title
              description
              descriptionHtml
              createdAt
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
                    originalSrc
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                    }
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                    metafield(namespace: "custom", key: "color") {
                      value
                      type
                    }
                  }
                }
              }
              options {
                name
                values
              }
              metafield(namespace: "custom", key: "color") {
                value
                type
              }
              tags
              productType
            }
          }
        }
      }
    `;

    console.log('Fetching products from Shopify...');
    const data = await client.request(query);
    const products = data.products.edges.map(({ node }) => node);

    console.log(`Found ${products.length} products`);

    // Generate a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `shopify-products-export-${timestamp}.json`;
    const exportPath = path.join('/Users/lucasdickey/Documents/VibePOCs/a-ok-store/database-migration', filename);
    
    console.log(`Writing products to ${exportPath}`);
    
    // Write products to a JSON file with pretty printing
    await writeFile(exportPath, JSON.stringify(products, null, 2));
    
    console.log('Product export completed successfully!');
    return exportPath;
  } catch (error) {
    console.error('Failed to export products:', error);
    throw error;
  }
}

// Run the export if this script is directly executed
if (require.main === module) {
  exportShopifyProducts().catch(console.error);
}

module.exports = exportShopifyProducts;