# Stripe Catalog Sync

This document explains the hybrid catalog management approach for A-OK Shop.

## Architecture

**Hybrid Approach:**
- **Stripe** = Source of truth for pricing and product IDs
- **JSON (`product-catalog.json`)** = Source of truth for content (descriptions, images, metadata)
- **Checkout** = Uses Stripe price IDs when available, falls back to `price_data`

## Metadata Storage

### Stored in Stripe
- Product names (canonical)
- Pricing (base prices)
- Product and Price IDs
- Active/inactive status
- Variant information

### Stored in Local JSON
- Rich HTML descriptions
- Product handles (for routing)
- Local image paths
- Featured product flags
- Featured product display order
- Tags and categories
- Display metadata

## Syncing Products to Stripe

### Prerequisites
You need a Stripe secret key set as an environment variable:

```bash
export STRIPE_SECRET_KEY=sk_test_...
```

### Running the Sync

**Dry run (preview changes):**
```bash
STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js --dry-run
```

**Create new products and prices:**
```bash
STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js
```

**Update existing products:**
```bash
STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js --update
```

### What the Sync Does

1. Reads `product-catalog.json`
2. For each product:
   - Creates a Stripe product (if not exists)
   - For each variant, creates a Stripe price
3. Saves `stripeProductId` and `stripePriceId` back to the JSON
4. Prints a summary of changes

### After Syncing

Once products are synced:
- The checkout route will automatically use Stripe price IDs
- Products without Stripe IDs will fall back to `price_data`
- You can update prices in Stripe Dashboard without code deploys

## Featured Products

Featured products are now managed in the JSON catalog instead of hardcoded config.

**Adding a featured product:**

Edit `product-catalog.json` and add these fields to a product:
```json
{
  "handle": "product-handle",
  "featured": true,
  "featuredOrder": 1
}
```

Or use the script:
```bash
node scripts/add-featured-metadata.js
```

## Workflow

### Adding a New Product

1. Add product to Stripe Dashboard (or use API)
2. Run sync script to add to `product-catalog.json`:
   ```bash
   STRIPE_SECRET_KEY=sk_... node scripts/sync-stripe-products.js
   ```
3. Optionally mark as featured in the JSON
4. Commit and deploy

### Updating Prices

**Option 1: Update in Stripe**
- Change price in Stripe Dashboard
- Create new Price (Stripe prices are immutable)
- Run sync script to update JSON with new price ID

**Option 2: Update in JSON**
- Edit `product-catalog.json`
- Run sync script with `--update` flag

### Updating Content

- Edit `product-catalog.json` directly
- No need to sync to Stripe (content lives in JSON)
- Commit and deploy

## Benefits

1. **Performance**: Fast reads from local JSON (no API calls)
2. **Flexibility**: Rich content in JSON, pricing authority in Stripe
3. **Cost**: Reduced API usage
4. **Management**: Update prices in Stripe Dashboard
5. **Analytics**: Better sales tracking with Stripe price IDs
6. **Tax calculation**: More accurate with proper Stripe products

## Files

- `scripts/sync-stripe-products.js` - Main sync script
- `scripts/add-featured-metadata.js` - Helper to mark products as featured
- `product-catalog.json` - Product catalog with Stripe IDs
- `app/lib/catalog.ts` - Catalog functions including `getFeaturedProducts()`
- `app/api/catalog/checkout/route.ts` - Checkout route (uses price IDs)

## Migration Status

- [x] Add Stripe fields to TypeScript types
- [x] Create sync script
- [x] Update checkout to use price IDs
- [x] Add featured product metadata
- [x] Update homepage to use `getFeaturedProducts()`
- [ ] Run initial sync to Stripe (requires STRIPE_SECRET_KEY)
- [ ] Verify checkout with real Stripe products
