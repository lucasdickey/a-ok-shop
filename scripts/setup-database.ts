#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database configuration from environment
const getDatabaseConfig = () => {
  // For local development, you can use a local PostgreSQL instance
  // For production, this will be your AWS RDS connection string
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres:password@localhost:5432/aok_shop';
  
  return connectionString;
};

// Create database tables
async function createTables(client: any) {
  try {
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    console.log('Creating database tables...');
    await client.query(schema);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Import data from CSV files
async function importData(client: any) {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'shopify-export');
    
    // Read the transformed data
    const transformedDataPath = path.join(dataDir, 'transformed-data.json');
    const transformedData = JSON.parse(await fs.readFile(transformedDataPath, 'utf-8'));
    
    console.log('Importing products...');
    // Import products
    for (const product of transformedData.products) {
      await client.query(
        `INSERT INTO products (id, handle, title, description, description_html, product_type, tags, shopify_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          product.id,
          product.handle,
          product.title,
          product.description,
          product.description_html,
          product.product_type,
          product.tags || [],
          product.shopify_id,
          product.created_at || new Date(),
          product.updated_at || new Date()
        ]
      );
    }
    console.log(`✅ Imported ${transformedData.products.length} products`);
    
    console.log('Importing variants...');
    // Import variants
    for (const variant of transformedData.variants) {
      await client.query(
        `INSERT INTO product_variants (id, product_id, title, price, size, color, available, sku, shopify_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          variant.id,
          variant.product_id,
          variant.title,
          variant.price,
          variant.size,
          variant.color,
          variant.available,
          variant.sku,
          variant.shopify_id
        ]
      );
    }
    console.log(`✅ Imported ${transformedData.variants.length} variants`);
    
    console.log('Importing images...');
    // Import images
    for (const image of transformedData.images) {
      await client.query(
        `INSERT INTO product_images (id, product_id, url, alt_text, position)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [
          image.id,
          image.product_id,
          image.url,
          image.alt_text,
          image.position
        ]
      );
    }
    console.log(`✅ Imported ${transformedData.images.length} images`);
    
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

// Main setup function
async function setupDatabase() {
  const client = new Client(getDatabaseConfig());
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    // Create tables
    await createTables(client);
    
    // Import data
    await importData(client);
    
    // Verify the import
    const productCount = await client.query('SELECT COUNT(*) FROM products');
    const variantCount = await client.query('SELECT COUNT(*) FROM product_variants');
    const imageCount = await client.query('SELECT COUNT(*) FROM product_images');
    
    console.log('\n=== Database Setup Complete ===');
    console.log(`Products: ${productCount.rows[0].count}`);
    console.log(`Variants: ${variantCount.rows[0].count}`);
    console.log(`Images: ${imageCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Export for use in other scripts
module.exports = { setupDatabase, getDatabaseConfig };

// Run if executed directly
if (require.main === module) {
  console.log('=== A-OK Shop Database Setup ===\n');
  
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  No DATABASE_URL found in environment.');
    console.warn('   Using default local PostgreSQL connection.');
    console.warn('   For AWS RDS, set DATABASE_URL in .env.local\n');
  }
  
  setupDatabase()
    .then(() => {
      console.log('\n✅ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database setup failed:', error);
      process.exit(1);
    });
}