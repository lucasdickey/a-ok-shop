// Script to check which products are missing color options
import { getAllProducts } from '../app/lib/shopify.js';

async function checkProductColors() {
  console.log('Checking all products for color options...');
  
  try {
    // Get all products
    const products = await getAllProducts();
    console.log(`Found ${products.length} products total.`);
    
    const productsWithoutColors = [];
    const productsWithColors = [];
    
    // Check each product for color options
    for (const product of products) {
      let hasColorOption = false;
      
      // Check in product options
      if (product.options) {
        const colorOption = product.options.find(option => 
          option.name.toLowerCase() === 'color'
        );
        
        if (colorOption && colorOption.values.length > 0) {
          hasColorOption = true;
          productsWithColors.push({
            title: product.title,
            handle: product.handle,
            colors: colorOption.values
          });
          continue;
        }
      }
      
      // Check in variants
      if (product.variants && product.variants.edges.length > 0) {
        const colorSet = new Set();
        
        for (const { node: variant } of product.variants.edges) {
          if (variant.selectedOptions) {
            const colorOpt = variant.selectedOptions.find(opt => 
              opt.name.toLowerCase() === 'color'
            );
            
            if (colorOpt) {
              colorSet.add(colorOpt.value);
            }
          }
        }
        
        if (colorSet.size > 0) {
          hasColorOption = true;
          productsWithColors.push({
            title: product.title,
            handle: product.handle,
            colors: Array.from(colorSet)
          });
          continue;
        }
      }
      
      // If no color options found
      if (!hasColorOption) {
        productsWithoutColors.push({
          title: product.title,
          handle: product.handle,
          productType: product.productType,
          tags: product.tags
        });
      }
    }
    
    // Display results
    console.log('\n=== Products WITH Color Options ===');
    console.log(`Total: ${productsWithColors.length}`);
    productsWithColors.forEach(product => {
      console.log(`- ${product.title} (${product.handle})`);
      console.log(`  Colors: ${product.colors.join(', ')}`);
    });
    
    console.log('\n=== Products WITHOUT Color Options ===');
    console.log(`Total: ${productsWithoutColors.length}`);
    productsWithoutColors.forEach(product => {
      console.log(`- ${product.title} (${product.handle})`);
      console.log(`  Type: "${product.productType}", Tags: ${product.tags.join(', ')}`);
    });
    
    console.log('\nSummary:');
    console.log(`Total products: ${products.length}`);
    console.log(`Products with color options: ${productsWithColors.length}`);
    console.log(`Products without color options: ${productsWithoutColors.length}`);
    
  } catch (error) {
    console.error('Error checking product colors:', error);
  }
}

// Run the function
checkProductColors()
  .catch(error => {
    console.error('Error in script execution:', error);
  });
