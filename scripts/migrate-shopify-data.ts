import { readFile } from 'fs/promises';
import path from 'path';
import { Client } from 'pg';

// Helper function to extract database connection details from environment
function getDatabaseConfig() {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  const database = process.env.DATABASE_NAME || 'a_ok_shop';

  return { host, port, user, password, database };
}

async function migrateShopifyData() {
  // Find the latest export file
  const migrationDir = path.join(__dirname, '..', 'database-migration');
  const exportFiles = await readdir(migrationDir);
  const latestExportFile = exportFiles
    .filter(file => file.startsWith('shopify-products-export-') && file.endsWith('.json'))
    .sort()
    .pop();

  if (!latestExportFile) {
    throw new Error('No Shopify product export file found');
  }

  const exportPath = path.join(migrationDir, latestExportFile);
  
  console.log(`Loading products from ${exportPath}`);
  const productsData = JSON.parse(await readFile(exportPath, 'utf-8'));

  // Create database client
  const client = new Client(getDatabaseConfig());
  await client.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Insert products
    for (const product of productsData) {
      // Insert product
      const productQuery = `
        INSERT INTO products (
          id, handle, title, description, description_html, 
          created_at, product_type, tags, color_metafield, min_variant_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE 
        SET 
          handle = EXCLUDED.handle,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          description_html = EXCLUDED.description_html,
          product_type = EXCLUDED.product_type,
          tags = EXCLUDED.tags,
          color_metafield = EXCLUDED.color_metafield,
          min_variant_price = EXCLUDED.min_variant_price
      `;
      
      const productParams = [
        product.id,
        product.handle,
        product.title,
        product.description,
        product.descriptionHtml,
        product.createdAt,
        product.productType,
        product.tags,
        product.metafield ? { value: product.metafield.value, type: product.metafield.type } : null,
        parseFloat(product.priceRange.minVariantPrice.amount)
      ];

      await client.query(productQuery, productParams);

      // Insert product variants
      const variantsQuery = `
        INSERT INTO product_variants (
          id, product_id, title, price, available_for_sale, 
          selected_options, color_metafield
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          available_for_sale = EXCLUDED.available_for_sale,
          selected_options = EXCLUDED.selected_options,
          color_metafield = EXCLUDED.color_metafield
      `;

      for (const variant of product.variants.edges) {
        const variantParams = [
          variant.node.id,
          product.id,
          variant.node.title,
          parseFloat(variant.node.price.amount),
          variant.node.availableForSale,
          variant.node.selectedOptions,
          variant.node.metafield ? { value: variant.node.metafield.value, type: variant.node.metafield.type } : null
        ];

        await client.query(variantsQuery, variantParams);
      }

      // Insert product images
      const imagesQuery = `
        INSERT INTO product_images (product_id, url, alt_text)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `;

      for (const [index, image] of product.images.edges.entries()) {
        const imageParams = [
          product.id,
          image.node.url,
          image.node.altText
        ];

        await client.query(imagesQuery, imageParams);
      }

      // Insert product options
      const optionsQuery = `
        INSERT INTO product_options (product_id, name, values)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `;

      for (const option of (product.options || [])) {
        const optionParams = [
          product.id,
          option.name,
          option.values
        ];

        await client.query(optionsQuery, optionParams);
      }
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Successfully migrated ${productsData.length} products`);
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Standalone execution
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  migrateShopifyData().catch(console.error);
}

export default migrateShopifyData;

// Import readdir with a fallback to support both ESM and CommonJS
function readdir(path: string): Promise<string[]> {
  try {
    // Try to use the default import
    return require('fs/promises').readdir(path);
  } catch {
    // Fallback to global import
    return (global as any).require('fs').promises.readdir(path);
  }
}