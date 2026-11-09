---
name: verify-order-flow
description: "Check a change to the A-OK shop's cart, checkout or order fulfillment against the order-flow models in verification/. Use before committing any change to the cart (CartProvider, CartDrawer, product page cart ids), the checkout routes (catalog, monthly deals, ACP, MPP purchase), store-checkout.ts, the Stripe webhook, runOnce in kv.ts, or the MPP order store, and whenever someone asks whether orders can be lost, charged twice, mispriced or emailed twice."
---

# Verify the order flow

`verification/` holds three small models of how an order moves through the shop: the
cart in the browser, checkout (how a cart becomes a charge), and fulfillment (what the
Stripe webhook does once an order is paid). A checker walks every state each model can
reach and reports, for each rule, either that it holds or the shortest list of steps
that breaks it. It is plain Node with no packages; the whole run takes under a second.

## Does my change touch this?

Yes if it changes any of these (the same list is in each model's `covers` export):

| Model | Files and functions |
|---|---|
| `verification/models/cart.mjs` | `app/components/cart/CartProvider.tsx` (load, save, addToCart, updateQuantity, updateSize, removeFromCart); `app/components/cart/CartDrawer.tsx` (size picker for retired sizes); `app/products/[handle]/ProductPageClient.tsx` (`cartLineId`); `app/checkout/success/page.tsx` (`CheckoutSuccessContent`) |
| `verification/models/checkout.mjs` | `app/api/mpp/purchase/route.ts` (`POST`, `handlePaymentAuthorization`); `app/lib/mpp-payment-verifier.ts` (`createStripePaymentFromSPT`); `app/lib/mpp-order-store.ts` (`saveOrder`); `app/lib/store-checkout.ts` (`resolveVariant`, `createStoreCheckoutSession`); `app/api/catalog/checkout/route.ts`; `app/api/monthly-deals/create-checkout-session/route.ts` |
| `verification/models/fulfillment.mjs` | `app/api/stripe/webhook/route.ts` (`POST`, `handlePaidCheckoutSession`, `ensureCustomerReceipt`, `sendOwnerOrderAlert`, `sendConfirmationEmail`, `handleMPPPaymentSucceeded`); `app/lib/kv.ts` (`runOnce`) |

Not covered: the ACP checkout route's own request parsing, discount codes, the catalog
data itself, Stripe's hosted checkout page, and what Lucas does after the owner email.

Sync commit: `4191481ecef7e9e4ea40c32c1460d0a336a063b3`

That is the last commit at which someone read the covered code and confirmed the models
describe it. To see what changed since:

```
node verification/run.mjs --stale
```

## Run the check

```
node verification/run.mjs              # every model
node verification/run.mjs fulfillment  # one model: cart, checkout or fulfillment
node verification/run.mjs --paths      # also print the steps for known findings
```

Exit code 0 means every rule holds except the known findings in `verification/FINDINGS.md`,
and each of those still shows up. A rule marked `[NEW]` prints the steps that break it.
"Known finding no longer reproduces" means someone fixed it: update `FINDINGS.md` and
remove its lines from `KNOWN` in `verification/run.mjs`.

Needs Node 18 or newer and git. Nothing to install.

## When the check reports something

Each step in a printed path names the code it stands for (`route.ts:302`, `kv.ts:31`).
Open those lines and walk the steps in the real code.

- **Real bug:** every step matches what the code does, and the end state is something a
  customer or Lucas would mind (charged twice, an order Lucas never hears about, a wrong
  price, a size the printer can't make). Report it with the steps in the code's words. Do
  not weaken the rule or the model to make it pass, and don't change product code unless
  you were asked to.
- **Modeling error:** a step in the path is something the code can't do, or the model has
  drifted from the code. Fix the model, then rerun.

## When you change covered code on purpose

1. Run `node verification/run.mjs --stale` and read the diff of each file it lists.
2. Change the matching model so each step still matches the code. Keep the code line
   references in step labels and comments current.
3. Run `node verification/run.mjs`. A new break is either a real bug in your change or
   a model you got wrong; decide which as above.
4. Show that any rule you touched can still fail: run the matching broken variant
   (`--variant <name>`; each model lists its `variants`) and see it break.
5. Only after the models describe the new code, move the sync commit above to the new
   commit.

## What a pass means

A pass covers the model, under these bounds and assumptions, not the whole system:

- Fulfillment: one order, up to 3 deliveries of Stripe's paid event, at most 2 webhook
  runs at once; any run can stop at any step. A stuck Redis claim expires only after the
  run holding it has stopped (real calls finish well inside the 300-second claim).
  Assumes Resend drops a repeat of an idempotency key it has seen, and that Stripe sends
  a receipt each time `receipt_email` is set on a paid PaymentIntent. Delayed payment
  methods (`async_payment_succeeded`) are not modeled.
- Checkout: one agent order, up to 2 paid requests; two products (a tee in XS to 2XL and
  a sweatshirt from S up); sizes XS and M; a caller may send any price or subtotal.
- Cart: a tee and the sweatshirt, sizes XS and M, a per-line cap of 3 instead of 20
  (the capping code is the same for any number), one color.
