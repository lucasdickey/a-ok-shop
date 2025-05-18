import { GraphQLClient } from 'graphql-request';

export function getAdminClient() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01';

  if (!storeDomain || !token) {
    throw new Error('Missing Shopify admin API credentials');
  }

  const endpoint = `https://${storeDomain}/admin/api/${version}/graphql.json`;

  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

export async function createOneOffDiscount() {
  const client = getAdminClient();

  const code = `AOK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const mutation = `
    mutation discountCodeBasicCreate($discount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $discount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    discount: {
      title: 'One-off 25% Discount',
      codes: [code],
      startsAt: now.toISOString(),
      endsAt: expires.toISOString(),
      customerGets: {
        items: { all: true },
        value: { percentage: 25 },
      },
      customerSelection: { all: true },
      usageLimit: 1,
    },
  };

  const data = await client.request(mutation, variables);
  if (data.discountCodeBasicCreate.userErrors.length > 0) {
    console.error(data.discountCodeBasicCreate.userErrors);
    throw new Error('Failed to create discount code');
  }
  return code;
}
