import {
  buildValidatedCheckout,
  CheckoutValidationError,
} from "../app/lib/checkout-pricing";
import { getAllProducts } from "../app/lib/catalog";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL: ${msg}`);
  }
}

const products = getAllProducts();
const product = products.find((p) => p.variants.edges.length > 0)!;
const variant = product.variants.edges[0].node;
const catalogPriceCents = Math.round(parseFloat(variant.price.amount) * 100);

console.log(
  `Using product "${product.title}" variant ${variant.id} @ $${variant.price.amount} (${catalogPriceCents}c), stripePriceId=${variant.stripePriceId ?? "none"}`
);

// 1. Tampered client price is ignored; catalog price is authoritative.
console.log("\n[1] Tampered price is ignored");
{
  const { lineItems, subtotalCents } = buildValidatedCheckout([
    { variantId: variant.id, quantity: 2, price: 0.01 } as any,
  ]);
  assert(
    subtotalCents === catalogPriceCents * 2,
    `subtotal uses catalog price (${subtotalCents} === ${catalogPriceCents * 2})`
  );
  const li: any = lineItems[0];
  if (variant.stripePriceId) {
    assert(
      li.price === variant.stripePriceId && li.price_data === undefined,
      "line item uses server stripePriceId, not client price"
    );
  } else {
    assert(
      li.price_data.unit_amount === catalogPriceCents,
      `line item unit_amount uses catalog price (${li.price_data.unit_amount})`
    );
  }
}

// 2. Unknown variant is rejected.
console.log("\n[2] Unknown variant rejected");
{
  let threw = false;
  try {
    buildValidatedCheckout([
      { variantId: "gid://shopify/ProductVariant/000000", quantity: 1 },
    ]);
  } catch (e) {
    threw = e instanceof CheckoutValidationError;
  }
  assert(threw, "throws CheckoutValidationError for unknown variant");
}

// 3. Invalid quantities rejected.
console.log("\n[3] Invalid quantities rejected");
for (const q of [0, -1, 1.5, 99999, "3" as any]) {
  let threw = false;
  try {
    buildValidatedCheckout([{ variantId: variant.id, quantity: q }]);
  } catch (e) {
    threw = e instanceof CheckoutValidationError;
  }
  // "3" as a string is Number-coerced to 3 and is valid, so expect NO throw there.
  const expectThrow = !(typeof q === "string" && Number.isInteger(Number(q)));
  assert(
    threw === expectThrow,
    `quantity ${JSON.stringify(q)} -> ${threw ? "rejected" : "accepted"} (expected ${expectThrow ? "rejected" : "accepted"})`
  );
}

// 4. Empty / missing cart rejected.
console.log("\n[4] Empty cart rejected");
{
  let threw = false;
  try {
    buildValidatedCheckout([]);
  } catch (e) {
    threw = e instanceof CheckoutValidationError;
  }
  assert(threw, "throws for empty cart");
}

// 5. Free-shipping threshold uses authoritative subtotal.
console.log("\n[5] Subtotal drives shipping threshold");
{
  const { subtotalCents } = buildValidatedCheckout([
    { variantId: variant.id, quantity: 1 },
  ]);
  assert(
    subtotalCents === catalogPriceCents,
    `single-item subtotal is authoritative (${subtotalCents})`
  );
}

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
