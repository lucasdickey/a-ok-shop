# Shopify Discount Code Setup Guide

This guide explains how to set up real Shopify discount code generation for the A-OK Store application.

## Current Implementation

The discount API (`/api/discount`) now supports both mock and real discount code generation:

- **Without Admin API credentials**: Returns mock discount codes (e.g., `AOK-ABC123`)
- **With Admin API credentials**: Creates real discount codes in your Shopify store

## How to Enable Real Discount Codes

### 1. Create a Private App in Shopify

1. Log in to your Shopify admin panel
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps**
4. Click **Create an app**
5. Give your app a name (e.g., "A-OK Store Discount Generator")
6. Click **Create app**

### 2. Configure Admin API Scopes

1. In your app, click **Configure Admin API scopes**
2. Enable the following scopes:
   - `write_discounts` - Required to create discount codes
   - `read_discounts` - Required to query existing discounts
3. Click **Save**

### 3. Generate Admin API Access Token

1. Click **Install app**
2. Click **Reveal token once** and copy the Admin API access token
3. **Important**: Save this token securely - you won't be able to see it again!

### 4. Add Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Existing Storefront API token (for products)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN=your-existing-storefront-token

# New Admin API token (for discounts)
SHOPIFY_ADMIN_API_TOKEN=your-admin-api-access-token
```

### 5. Restart Your Development Server

```bash
npm run dev
```

## How It Works

When a user clicks "Get Your Discount Code" on the Special Offer component:

1. The API checks if Admin API credentials are configured
2. If yes, it creates a real discount in Shopify with:
   - 10% off all products
   - Valid for 30 days
   - Single use per customer
   - Usage limit of 1
3. If no credentials, it returns a mock discount code with a note

## Discount Configuration

The current implementation creates discounts with these settings:

- **Discount Type**: Percentage (10% off)
- **Applies To**: All products
- **Customer Eligibility**: All customers
- **Usage Limits**: Once per customer, total usage limit of 1
- **Duration**: 30 days from creation

To modify these settings, edit the `variables` object in `/app/api/discount/route.ts`:

```typescript
const variables = {
  basicCodeDiscount: {
    title: `A-OK Store Discount ${discountCode}`,
    code: discountCode,
    startsAt: startsAt,
    endsAt: endsAt.toISOString(),
    customerSelection: {
      all: true, // Change to specific customer segments if needed
    },
    customerGets: {
      value: {
        percentage: 0.1, // Change discount percentage (0.10 = 10%)
      },
      items: {
        all: true, // Change to specific products/collections if needed
      },
    },
    appliesOncePerCustomer: true,
    usageLimit: 1, // Change total usage limit
  },
};
```

## Testing

1. **Without Admin API**: The app will show mock codes with a note
2. **With Admin API**: Real codes will be created in your Shopify admin
3. Check created discounts: Shopify Admin → Discounts

## Troubleshooting

### "Missing Shopify Admin API credentials" error

- Ensure both `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_API_TOKEN` are set
- Check for typos in environment variable names

### "Access denied" or permission errors

- Verify your app has the `write_discounts` scope enabled
- Regenerate the access token if needed

### Discount codes not working at checkout

- Check the discount is active in Shopify Admin → Discounts
- Verify the discount hasn't expired or reached usage limits
- Ensure the customer/products meet the discount conditions

## Security Notes

- **Never commit API tokens** to version control
- Use environment variables for all sensitive credentials
- Consider implementing rate limiting for the discount endpoint
- Monitor discount usage to prevent abuse

## Advanced Features

To implement more complex discount logic, you can:

1. **Different discount types**:

   - Fixed amount: Use `discountAmount` instead of `percentage`
   - Free shipping: Use `discountCodeFreeShippingCreate` mutation
   - Buy X Get Y: Use `discountCodeBxgyCreate` mutation

2. **Conditional discounts**:

   - Minimum purchase requirements
   - Specific product/collection targeting
   - Customer segment targeting

3. **Integration with customer accounts**:
   - Track discount usage per customer
   - Create personalized discount codes
   - Implement loyalty programs

For more information, see the [Shopify Admin API Discount documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeBasicCreate).
