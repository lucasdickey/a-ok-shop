/**
 * Demonstration script for the Stripe MPP (Machine Payments Protocol) flow.
 *
 * Simulates an AI agent:
 *   1. Discovering products via GET /api/mpp/catalog
 *   2. Attempting a purchase via POST /api/mpp/purchase (receives 402 challenge)
 *   3. Inspecting the 402 challenge and decoding the base64url request
 *
 * Completing the purchase requires a Stripe Shared Payment Token (SPT) issued
 * by a Stripe Link AI wallet, which cannot be minted from this script. To run
 * the full charge step, use Stripe's `link-cli mpp` against the WWW-Authenticate
 * header printed below, then retry with `Authorization: Payment <base64url SPT>`.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
}

async function runDemo() {
  console.log(`Starting MPP Demonstration at ${BASE_URL}...`);

  // 1. Discover products
  console.log('\nStep 1: Discovering products via /api/mpp/catalog...');
  const catalogRes = await fetch(`${BASE_URL}/api/mpp/catalog`);
  if (!catalogRes.ok) {
    console.error('Catalog request failed:', catalogRes.status, await catalogRes.text());
    return;
  }
  const catalog = await catalogRes.json();

  if (!catalog.products?.length) {
    console.error('No products found in the agent catalog.');
    return;
  }

  const product = catalog.products[0];
  const variant = product.variants.find((v) => v.available) || product.variants[0];
  console.log(`Found product: ${product.title} (${variant.title})`);
  console.log(`Handle: ${product.handle}  |  Variant: ${variant.id}  |  Price: ${variant.price}`);
  console.log(`Catalog size: ${catalog.total} product(s)`);

  // 2. Attempt purchase -> expect 402 Payment Required
  console.log('\nStep 2: Attempting purchase via POST /api/mpp/purchase (expect 402)...');
  const purchaseRes = await fetch(`${BASE_URL}/api/mpp/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'demo-agent',
      email: 'agent@example.com',
      items: [{ handle: product.handle, variantId: variant.id, quantity: 1 }],
    }),
  });

  console.log(`Response Status: ${purchaseRes.status} ${purchaseRes.statusText}`);

  if (purchaseRes.status !== 402) {
    console.error('Expected a 402 challenge but got:', purchaseRes.status);
    console.error('Body:', await purchaseRes.text());
    console.error('\nTip: the 402 challenge requires STRIPE_SECRET_KEY and STRIPE_NETWORK_ID to be set.');
    return;
  }

  const challenge = await purchaseRes.json();
  const wwwAuthenticate = purchaseRes.headers.get('WWW-Authenticate');

  console.log('Received 402 Payment Required!');
  console.log(`Payment ID: ${challenge.id}`);
  console.log(`Amount: ${(challenge.amount / 100).toFixed(2)} ${challenge.currency} (includes shipping)`);
  console.log(`WWW-Authenticate: ${wwwAuthenticate}`);

  try {
    const decoded = decodeBase64Url(challenge.request);
    console.log('Decoded challenge request:');
    console.log(JSON.stringify(decoded, null, 2));
  } catch (err) {
    console.warn('Could not decode challenge.request:', err.message);
  }

  // 3. Explain the SPT step (cannot be automated without a Stripe Link wallet)
  console.log('\nStep 3: Completing the charge (manual)...');
  console.log('To finish the purchase, obtain a Stripe Shared Payment Token (SPT) from a');
  console.log('Stripe Link AI wallet and retry the request with:');
  console.log('  Authorization: Payment <base64url({ "payload": { "spt": "spt_...", "method": "stripe" } })>');
  console.log('The server then creates and confirms a PaymentIntent and returns the order.');

  console.log('\nDemo complete. The flow follows the MPP 402 + WWW-Authenticate pattern (paymentauth.org).');
}

runDemo().catch((err) => {
  console.error('Error during demo:', err);
  process.exit(1);
});
