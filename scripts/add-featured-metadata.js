#!/usr/bin/env node

/**
 * Add Featured Metadata Script
 *
 * Adds featured and featuredOrder fields to products in product-catalog.json
 * based on the featuredProducts array from siteConfig
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', 'product-catalog.json');

// Featured products from siteConfig (in order)
const featuredProductHandles = [
  'a-ok-monkey-master',
  'ape-logo-embroidered',
  'same-vibes-but-more'
];

function main() {
  console.log('📝 Loading product catalog...');
  const catalogData = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

  let updatedCount = 0;

  catalogData.products.edges.forEach((edge) => {
    const product = edge.node;
    const featuredIndex = featuredProductHandles.indexOf(product.handle);

    if (featuredIndex !== -1) {
      product.featured = true;
      product.featuredOrder = featuredIndex + 1;
      console.log(`✨ Marked "${product.title}" as featured (order: ${product.featuredOrder})`);
      updatedCount++;
    }
  });

  console.log(`\n💾 Saving catalog with ${updatedCount} featured products...`);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalogData, null, 2), 'utf-8');
  console.log('✅ Done!');
}

main();
