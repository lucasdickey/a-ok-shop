import { NextResponse } from "next/server";

// Shopify Admin API client configuration
async function getShopifyAdminClient() {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminApiToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const apiVersion = "2024-10"; // Latest stable version

  if (!shopDomain || !adminApiToken) {
    throw new Error("Missing Shopify Admin API credentials");
  }

  const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

  return {
    endpoint,
    headers: {
      "X-Shopify-Access-Token": adminApiToken,
      "Content-Type": "application/json",
    },
  };
}

// Generate a unique discount code
function generateDiscountCode() {
  const code = `AOK-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
  return code;
}

// Create a price rule and discount code using Shopify Admin API
async function createShopifyDiscount() {
  try {
    const { endpoint, headers } = await getShopifyAdminClient();
    const discountCode = generateDiscountCode();

    // GraphQL mutation to create a basic percentage discount
    const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                  items {
                    ... on AllDiscountItems {
                      allItems
                    }
                  }
                }
                startsAt
                endsAt
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    // Calculate dates
    const startsAt = new Date().toISOString();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30); // Valid for 30 days

    const variables = {
      basicCodeDiscount: {
        title: `A-OK Store Discount ${discountCode}`,
        code: discountCode,
        startsAt: startsAt,
        endsAt: endsAt.toISOString(),
        customerSelection: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: 0.25, // 25% discount
          },
          items: {
            all: true,
          },
        },
        appliesOncePerCustomer: true,
        usageLimit: 1,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    if (data.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
      throw new Error(
        `User errors: ${JSON.stringify(
          data.data.discountCodeBasicCreate.userErrors
        )}`
      );
    }

    const createdDiscount =
      data.data?.discountCodeBasicCreate?.codeDiscountNode;

    if (!createdDiscount) {
      throw new Error("Failed to create discount code");
    }

    console.log("Successfully created Shopify discount:", {
      id: createdDiscount.id,
      code: discountCode,
      title: createdDiscount.codeDiscount.title,
    });

    return {
      code: discountCode,
      id: createdDiscount.id,
      percentage: 25,
      expiresAt: endsAt.toISOString(),
    };
  } catch (error) {
    console.error("Error creating Shopify discount:", error);
    throw error;
  }
}

// Mock discount code generation for development
function generateMockDiscountCode() {
  const code = `AOK-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
  console.log("Generated mock discount code:", code);
  return code;
}

export async function POST() {
  try {
    // Check if we have Admin API credentials
    const hasAdminApiAccess =
      process.env.SHOPIFY_ADMIN_API_TOKEN && process.env.SHOPIFY_STORE_DOMAIN;

    if (!hasAdminApiAccess) {
      // No Admin API access - return mock discount
      console.log(
        "Admin API credentials not configured - returning mock discount code"
      );
      const mockCode = generateMockDiscountCode();

      return NextResponse.json({
        code: mockCode,
        percentage: 25,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
        note: "Mock discount code - configure SHOPIFY_ADMIN_API_TOKEN to create real discounts",
      });
    }

    // Create real Shopify discount
    console.log("Creating real Shopify discount code...");
    const discount = await createShopifyDiscount();

    return NextResponse.json({
      code: discount.code,
      percentage: discount.percentage,
      expiresAt: discount.expiresAt,
      id: discount.id,
    });
  } catch (error) {
    console.error("Error in discount code generation:", error);

    // Fall back to mock code on error
    const fallbackCode = generateMockDiscountCode();

    return NextResponse.json(
      {
        code: fallbackCode,
        percentage: 25,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        note: "Mock discount code generated due to error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
