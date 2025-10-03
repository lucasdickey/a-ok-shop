const { GraphQLClient } = require('graphql-request');
const fs = require('fs').promises;
const path = require('path');

// Initialize GraphQL client
const getShopifyClient = () => {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  if (!storeDomain || !token) {
    throw new Error('Missing Shopify API credentials');
  }

  const endpoint = `https://${storeDomain}/api/2024-01/graphql.json`;
  
  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
};

// GraphQL query to fetch all products with pagination
const PRODUCTS_QUERY = `
  query GetProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          title
          description
          descriptionHtml
          productType
          tags
          createdAt
          updatedAt
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 20) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                sku
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

// Fetch all products with pagination
async function fetchAllProducts() {
  const client = getShopifyClient();
  const allProducts = [];
  let hasNextPage = true;
  let cursor = null;
  
  console.log('Starting Shopify data extraction...');
  
  while (hasNextPage) {
    try {
      const data: any = await client.request(PRODUCTS_QUERY, { cursor });
      
      const products = data.products.edges.map((edge: any) => edge.node);
      allProducts.push(...products);
      
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      
      console.log(`Fetched ${products.length} products. Total: ${allProducts.length}`);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }
  
  return allProducts;
}

// Transform Shopify data to our database schema format
function transformProducts(shopifyProducts: any[]) {
  const products: any[] = [];
  const variants: any[] = [];
  const images: any[] = [];
  
  shopifyProducts.forEach((product, productIndex) => {
    // Extract product data
    const productId = `prod_${productIndex + 1}`;
    
    products.push({
      id: productId,
      handle: product.handle,
      title: product.title,
      description: product.description || '',
      description_html: product.descriptionHtml || '',
      product_type: product.productType || '',
      tags: product.tags,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      shopify_id: product.id // Keep original Shopify ID for reference
    });
    
    // Extract variants
    product.variants.edges.forEach((variantEdge: any, variantIndex: number) => {
      const variant = variantEdge.node;
      const variantId = `var_${productIndex + 1}_${variantIndex + 1}`;
      
      // Extract size and color from selectedOptions
      let size = null;
      let color = null;
      
      if (variant.selectedOptions) {
        variant.selectedOptions.forEach((option: any) => {
          if (option.name.toLowerCase() === 'size') {
            size = option.value;
          } else if (option.name.toLowerCase() === 'color') {
            color = option.value;
          }
        });
      }
      
      variants.push({
        id: variantId,
        product_id: productId,
        title: variant.title,
        price: parseFloat(variant.price.amount),
        size: size,
        color: color,
        available: variant.availableForSale,
        sku: variant.sku || `SKU_${productId}_${variantIndex + 1}`,
        shopify_id: variant.id // Keep original Shopify ID for reference
      });
    });
    
    // Extract images
    product.images.edges.forEach((imageEdge: any, imageIndex: number) => {
      const image = imageEdge.node;
      const imageId = `img_${productIndex + 1}_${imageIndex + 1}`;
      
      images.push({
        id: imageId,
        product_id: productId,
        url: image.url,
        alt_text: image.altText || product.title,
        position: imageIndex + 1
      });
    });
  });
  
  return { products, variants, images };
}

// Main extraction function
async function extractShopifyData() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data', 'shopify-export');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Fetch all products
    const shopifyProducts = await fetchAllProducts();
    console.log(`\nTotal products fetched: ${shopifyProducts.length}`);
    
    // Save raw Shopify data as backup
    const rawDataPath = path.join(dataDir, 'shopify-raw-data.json');
    await fs.writeFile(
      rawDataPath,
      JSON.stringify(shopifyProducts, null, 2)
    );
    console.log(`Raw Shopify data saved to: ${rawDataPath}`);
    
    // Transform data to our schema
    const { products, variants, images } = transformProducts(shopifyProducts);
    
    // Save transformed data
    const transformedDataPath = path.join(dataDir, 'transformed-data.json');
    await fs.writeFile(
      transformedDataPath,
      JSON.stringify({ products, variants, images }, null, 2)
    );
    console.log(`Transformed data saved to: ${transformedDataPath}`);
    
    // Save individual CSV files for easy database import
    const productsCSV = convertToCSV(products);
    await fs.writeFile(path.join(dataDir, 'products.csv'), productsCSV);
    
    const variantsCSV = convertToCSV(variants);
    await fs.writeFile(path.join(dataDir, 'variants.csv'), variantsCSV);
    
    const imagesCSV = convertToCSV(images);
    await fs.writeFile(path.join(dataDir, 'images.csv'), imagesCSV);
    
    console.log('\nCSV files created for database import');
    
    // Print summary
    console.log('\n=== Extraction Summary ===');
    console.log(`Products: ${products.length}`);
    console.log(`Variants: ${variants.length}`);
    console.log(`Images: ${images.length}`);
    console.log('\nData extraction complete!');
    
    return { products, variants, images };
  } catch (error) {
    console.error('Failed to extract Shopify data:', error);
    throw error;
  }
}

// Convert array of objects to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (Array.isArray(value)) {
        return `"${value.join(';')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

// Run the extraction if this file is executed directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  
  extractShopifyData()
    .then(() => {
      console.log('\n✅ Shopify data extraction successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Shopify data extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { extractShopifyData };