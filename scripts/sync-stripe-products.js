#!/usr/bin/env node

/**
 * Sync Stripe Products Script
 *
 * Creates/updates Stripe products and prices from product-catalog.json
 * Adds stripeProductId and stripePriceId to the catalog
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js
 *
 * Options:
 *   --dry-run    Show what would be created without making changes
 *   --update     Update existing Stripe products if they exist
 */

const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const CATALOG_PATH = path.join(__dirname, '..', 'product-catalog.json');
const DRY_RUN = process.argv.includes('--dry-run');
const UPDATE_MODE = process.argv.includes('--update');

async function main() {
  // Check for Stripe API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required');
    console.error('Usage: STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js');
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });

  console.log('🔄 Loading product catalog...');
  const catalogData = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const products = catalogData.products.edges;

  console.log(`📦 Found ${products.length} products`);

  if (DRY_RUN) {
    console.log('🏃 Running in DRY RUN mode - no changes will be made\n');
  }

  let stats = {
    productsCreated: 0,
    productsUpdated: 0,
    pricesCreated: 0,
    errors: 0,
  };

  for (let i = 0; i < products.length; i++) {
    const productEdge = products[i];
    const product = productEdge.node;

    console.log(`\n[${i + 1}/${products.length}] Processing: ${product.title}`);
    console.log(`   Handle: ${product.handle}`);

    try {
      // Get the first image URL for Stripe
      const imageUrl = product.images?.edges?.[0]?.node?.url;
      const fullImageUrl = imageUrl && imageUrl.startsWith('http')
        ? imageUrl
        : imageUrl
          ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://a-ok.shop'}${imageUrl}`
          : null;

      let stripeProduct;

      // Check if product already has a Stripe ID
      if (product.stripeProductId && UPDATE_MODE) {
        console.log(`   ⚡ Updating existing product: ${product.stripeProductId}`);
        if (!DRY_RUN) {
          stripeProduct = await stripe.products.update(product.stripeProductId, {
            name: product.title,
            description: product.description?.substring(0, 500) || '',
            images: fullImageUrl ? [fullImageUrl] : [],
            metadata: {
              handle: product.handle,
              productType: product.productType || '',
              vendor: product.vendor || '',
            },
            active: product.availableForSale !== false,
          });
          stats.productsUpdated++;
        }
      } else if (!product.stripeProductId) {
        console.log('   ✨ Creating new Stripe product...');
        if (!DRY_RUN) {
          stripeProduct = await stripe.products.create({
            name: product.title,
            description: product.description?.substring(0, 500) || '',
            images: fullImageUrl ? [fullImageUrl] : [],
            metadata: {
              handle: product.handle,
              productType: product.productType || '',
              vendor: product.vendor || '',
            },
            active: product.availableForSale !== false,
          });

          // Save the Stripe product ID back to the JSON
          product.stripeProductId = stripeProduct.id;
          stats.productsCreated++;
        }
        console.log(`   ✅ Product created: ${DRY_RUN ? '[DRY RUN]' : stripeProduct.id}`);
      } else {
        console.log(`   ⏭️  Product already has Stripe ID: ${product.stripeProductId} (use --update to update)`);
        stripeProduct = { id: product.stripeProductId };
      }

      // Process variants (create prices)
      const variants = product.variants?.edges || [];
      console.log(`   📊 Processing ${variants.length} variants...`);

      for (const variantEdge of variants) {
        const variant = variantEdge.node;
        const variantName = variant.selectedOptions
          ?.map(opt => opt.value)
          .join(' / ') || variant.title;

        // Check if variant already has a Stripe price ID
        if (variant.stripePriceId && !UPDATE_MODE) {
          console.log(`      ⏭️  Variant "${variantName}" already has price: ${variant.stripePriceId}`);
          continue;
        }

        const unitAmount = Math.round(parseFloat(variant.price.amount) * 100);

        console.log(`      💰 Creating price for "${variantName}": $${variant.price.amount}`);

        if (!DRY_RUN && stripeProduct) {
          const price = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: unitAmount,
            currency: variant.price.currencyCode?.toLowerCase() || 'usd',
            metadata: {
              variantId: variant.id,
              variantTitle: variant.title,
              sku: variant.sku || '',
              options: JSON.stringify(variant.selectedOptions || []),
            },
          });

          // Save the Stripe price ID back to the variant
          variant.stripePriceId = price.id;
          stats.pricesCreated++;
          console.log(`      ✅ Price created: ${price.id}`);
        } else {
          console.log(`      ✅ Price would be created [DRY RUN]`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Error processing product: ${error.message}`);
      stats.errors++;
    }
  }

  // Save updated catalog
  if (!DRY_RUN) {
    console.log('\n💾 Saving updated catalog...');
    fs.writeFileSync(
      CATALOG_PATH,
      JSON.stringify(catalogData, null, 2),
      'utf-8'
    );
    console.log('✅ Catalog saved!');
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`Products created:  ${stats.productsCreated}`);
  console.log(`Products updated:  ${stats.productsUpdated}`);
  console.log(`Prices created:    ${stats.pricesCreated}`);
  console.log(`Errors:            ${stats.errors}`);
  console.log('='.repeat(50));

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    console.log('Run without --dry-run to create Stripe products');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
