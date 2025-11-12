const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'a-ok-shop', '.env.local') });

// Import from the shopify.ts file using relative path
const { getAllProducts } = require('../a-ok-shop/app/lib/shopify');

const IMAGE_SIZES = [
  { width: 64, suffix: 'thumbnail' },
  { width: 256, suffix: 'small' },
  { width: 512, suffix: 'medium' },
  { width: 1024, suffix: 'large' }
];

// Enhanced logging mechanism
class ImageLogger {
  private logFile: string;

  constructor() {
    const logDir = path.join(__dirname, 'logs');
    fs.mkdir(logDir, { recursive: true });
    this.logFile = path.join(logDir, `product-images-${new Date().toISOString().replace(/:/g, '-')}.log`);
  }

  async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    await fs.appendFile(this.logFile, logMessage);
    console.log(message);
  }

  async logError(productHandle: string, imageUrl: string, error: Error): Promise<void> {
    const errorMessage = `ERROR: Product ${productHandle} - Failed to process image ${imageUrl}
      Error Details: ${error.message}
      Stack Trace: ${error.stack}\n`;
    
    await fs.appendFile(this.logFile, errorMessage);
    console.error(errorMessage);
  }
}

async function downloadImage(url: string, filepath: string, logger: ImageLogger, productHandle: string): Promise<boolean> {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000 // 10 seconds timeout
    });

    const writer = createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.log(`Successfully downloaded image: ${filepath}`);
        resolve(true);
      });
      writer.on('error', (err: any) => {
        logger.logError(productHandle, url, err);
        reject(err);
      });
    });
  } catch (error) {
    await logger.logError(productHandle, url, error as Error);
    throw error;
  }
}

async function processProductImages(): Promise<void> {
  const logger = new ImageLogger();
  
  await logger.log('Starting product image download and processing');

  const products = await getAllProducts();
  const publicDir = path.join(__dirname, '..', 'a-ok-shop', 'public', 'images', 'products');

  // Track overall processing stats
  const processingStats = {
    totalProducts: products.length,
    processedProducts: 0,
    skippedProducts: 0,
    totalImages: 0,
    processedImages: 0,
    failedImages: 0
  };

  for (const product of products) {
    try {
      // Create product-specific directory
      const productDir = path.join(publicDir, product.handle);
      await fs.mkdir(productDir, { recursive: true });

      // Skip products with no images
      if (product.images.edges.length === 0) {
        await logger.log(`SKIP: No images found for product ${product.handle}`);
        processingStats.skippedProducts++;
        continue;
      }

      // Fetch all images for the product
      for (const [index, imageEdge] of product.images.edges.entries()) {
        try {
          const imageUrl = imageEdge.node.url;
          const imageExtension = path.extname(imageUrl) || '.jpg';
          const imageName = `${product.handle}_${index + 1}${imageExtension}`;

          // Original image download with product-specific naming
          const originalPath = path.join(productDir, imageName);
          await downloadImage(imageUrl, originalPath, logger, product.handle);

          // Resize images while maintaining aspect ratio
          for (const size of IMAGE_SIZES) {
            const resizedPath = path.join(productDir, `${product.handle}_${size.suffix}${imageExtension}`);
            
            await sharp(originalPath)
              .resize(size.width, size.width, { 
                fit: 'inside',  // Preserves aspect ratio
                withoutEnlargement: true  // Prevents upscaling smaller images
              })
              .toFile(resizedPath);
          }

          processingStats.processedImages++;
        } catch (imageError) {
          processingStats.failedImages++;
          await logger.logError(product.handle, imageEdge.node.url, imageError as Error);
        }
      }

      processingStats.processedProducts++;
    } catch (productError) {
      await logger.logError(product.handle, 'PRODUCT_PROCESSING', productError as Error);
    }
  }

  // Log final processing stats
  await logger.log(`
PROCESSING COMPLETE
------------------
Total Products:     ${processingStats.totalProducts}
Processed Products: ${processingStats.processedProducts}
Skipped Products:   ${processingStats.skippedProducts}
Total Images:       ${processingStats.totalImages}
Processed Images:   ${processingStats.processedImages}
Failed Images:      ${processingStats.failedImages}
`);

  console.log('Product images processed successfully');
}

processProductImages().catch(console.error);