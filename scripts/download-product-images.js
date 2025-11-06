// Script to download all product images from Shopify CDN to local storage
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read the product details JSON
const productData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../product-details.json'), 'utf8')
);

// Directory to save images
const imagesDir = path.join(__dirname, '../public/images/products');

// Create directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`Created directory: ${imagesDir}`);
}

// Function to download an image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file if error
      reject(err);
    });
  });
}

// Function to generate safe filename from URL
function getFilenameFromUrl(url, productHandle, index) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const extension = path.extname(pathname) || '.jpg';

  // Create filename: productHandle-imageIndex.ext
  return `${productHandle}-${index}${extension}`;
}

// Main function to download all images
async function downloadAllImages() {
  console.log('Starting image download...\n');

  const products = productData.products.edges;
  let totalImages = 0;
  let downloadedImages = 0;
  const imageMapping = {}; // Store mapping of CDN URL to local path

  // Count total images
  products.forEach(({ node: product }) => {
    totalImages += product.images.edges.length;
  });

  console.log(`Found ${products.length} products with ${totalImages} total images\n`);

  // Process each product
  for (const { node: product } of products) {
    console.log(`Processing: ${product.title}`);

    // Download each image for this product
    for (let i = 0; i < product.images.edges.length; i++) {
      const imageNode = product.images.edges[i].node;
      const imageUrl = imageNode.url;

      const filename = getFilenameFromUrl(imageUrl, product.handle, i);
      const filepath = path.join(imagesDir, filename);
      const localPath = `/images/products/${filename}`;

      try {
        // Check if file already exists
        if (fs.existsSync(filepath)) {
          console.log(`  ✓ Image ${i + 1} already exists: ${filename}`);
          imageMapping[imageUrl] = localPath;
          downloadedImages++;
        } else {
          console.log(`  Downloading image ${i + 1}/${product.images.edges.length}: ${filename}`);
          await downloadImage(imageUrl, filepath);
          console.log(`  ✓ Downloaded: ${filename}`);
          imageMapping[imageUrl] = localPath;
          downloadedImages++;
        }
      } catch (error) {
        console.error(`  ✗ Failed to download ${filename}: ${error.message}`);
      }
    }

    console.log('');
  }

  console.log(`\nDownload complete: ${downloadedImages}/${totalImages} images`);

  // Save the image mapping for reference
  const mappingPath = path.join(__dirname, '../image-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(imageMapping, null, 2));
  console.log(`Image mapping saved to: ${mappingPath}`);

  return imageMapping;
}

// Run the download
downloadAllImages()
  .then(() => {
    console.log('\n✓ All images processed successfully!');
  })
  .catch((error) => {
    console.error('\n✗ Error during image download:', error);
    process.exit(1);
  });
