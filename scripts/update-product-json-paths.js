// Script to update product-details.json with local image paths
const fs = require('fs');
const path = require('path');

// Read the existing files
const productDataPath = path.join(__dirname, '../product-details.json');
const imageMappingPath = path.join(__dirname, '../image-mapping.json');

const productData = JSON.parse(fs.readFileSync(productDataPath, 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync(imageMappingPath, 'utf8'));

console.log('Updating product JSON with local image paths...\n');

let updatedCount = 0;
let totalImages = 0;

// Update each product's image URLs
productData.products.edges.forEach(({ node: product }) => {
  console.log(`Processing: ${product.title}`);

  product.images.edges.forEach((imageEdge, index) => {
    const originalUrl = imageEdge.node.url;
    totalImages++;

    if (imageMapping[originalUrl]) {
      imageEdge.node.url = imageMapping[originalUrl];
      console.log(`  ✓ Updated image ${index + 1}: ${imageMapping[originalUrl]}`);
      updatedCount++;
    } else {
      console.log(`  ✗ No mapping found for: ${originalUrl}`);
    }
  });

  console.log('');
});

console.log(`Updated ${updatedCount}/${totalImages} image URLs\n`);

// Save the updated product data
const outputPath = path.join(__dirname, '../product-catalog.json');
fs.writeFileSync(outputPath, JSON.stringify(productData, null, 2));

console.log(`✓ Updated catalog saved to: ${outputPath}`);
console.log(`✓ Original file preserved at: ${productDataPath}`);
