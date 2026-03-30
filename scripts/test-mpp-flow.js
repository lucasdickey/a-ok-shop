/**
 * Demonstration script for the Stripe MPP and x402 payment flow.
 * This script simulates an AI agent discovering products and completing a purchase.
 */

async function runDemo() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  console.log(`Starting MPP Demonstration at ${BASE_URL}...`);

  try {
    // 1. Discover products
    console.log('\nStep 1: Discovering products for agents...');
    const productsRes = await fetch(`${BASE_URL}/api/mpp/products`);
    const productsData = await productsRes.json();

    if (productsData.products && productsData.products.length > 0) {
      const product = productsData.products[0];
      const variant = product.variants[0];
      console.log(`Found product: ${product.title} (${variant.title})`);
      console.log(`Price: ${variant.price} ${variant.currency}`);
      console.log(`Capabilities: ${product.capabilities.paymentProtocols.join(', ')}`);

      // 2. Initial attempt to buy (will return 402)
      console.log('\nStep 2: Attempting to buy without payment...');
      const buyRes = await fetch(`${BASE_URL}/api/mpp/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variantId: variant.id,
          quantity: 1,
        }),
      });

      console.log(`Response Status: ${buyRes.status} ${buyRes.statusText}`);

      if (buyRes.status === 402) {
        const challenge = await buyRes.json();
        const wwwAuthenticate = buyRes.headers.get('WWW-Authenticate');

        console.log('Received 402 Payment Required!');
        console.log(`Challenge ID: ${challenge.challengeId}`);
        console.log(`WWW-Authenticate Header: ${wwwAuthenticate}`);
        console.log('Payment Methods Offered:');
        challenge.methods.forEach(method => {
          console.log(` - ${method.type.toUpperCase()}: Pay ${challenge.detail} to ${method.recipient || method.payTo} on ${method.network}`);
        });

        // 3. Simulate payment completion
        console.log('\nStep 3: Simulating payment on-chain/via Stripe...');
        const payRes = await fetch(`${BASE_URL}/api/mpp/buy/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            challengeId: challenge.challengeId,
          }),
        });
        const payData = await payRes.json();
        console.log('Payment status updated:', payData.message);

        // 4. Retry with credential
        console.log('\nStep 4: Retrying request with authorization credential...');
        const retryRes = await fetch(`${BASE_URL}/api/mpp/buy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `MPP ${challenge.challengeId}`,
          },
          body: JSON.stringify({
            variantId: variant.id,
            quantity: 1,
          }),
        });

        console.log(`Response Status: ${retryRes.status} ${retryRes.statusText}`);

        if (retryRes.status === 200) {
          const order = await retryRes.json();
          console.log('SUCCESS! Order received:');
          console.log(JSON.stringify(order, null, 2));
        } else {
          console.error('Expected a 200 response but got:', retryRes.status);
          const errorBody = await retryRes.text();
          console.error('Error Body:', errorBody);
        }

        console.log('\nDemo complete. The flow follows the standard HTTP 402 pattern for agentic commerce.');
      } else {
        console.error('Expected a 402 response but got:', buyRes.status);
      }
    } else {
      console.error('No products found in the agent feed.');
    }
  } catch (error) {
    console.error('Error during demo:', error.message);
  }
}

runDemo();
