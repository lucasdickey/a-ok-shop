# Order flow findings

Checked at commit `4191481` with `node verification/run.mjs` (models in `verification/models/`,
how to use them in `.claude/skills/verify-order-flow/SKILL.md`). No product code was changed.

Each finding names the rule it breaks, why it matters, the shortest way it happens, and the
code it traces to. `node verification/run.mjs --paths` prints every path.

## Real bugs

### B1. Monthly deals checkout charges whatever price the browser sends
- **Rule broken:** every line is charged its catalog price; orders under $50 pay shipping;
  every paid garment is in a size its blank comes in.
- **Why it matters:** anyone can post a cart with a price of $0.01 (or any made-up name and
  size) to `/api/monthly-deals/create-checkout-session` and Stripe will charge exactly that.
  Lucas then gets an owner email saying "place it with the vendor" for an order that paid a
  cent. Sending a subtotal of 100 also skips the $9.99 shipping on a small order.
- **Steps:** one request: a tee, price sent 1 cent.
- **Code:** `app/api/monthly-deals/create-checkout-session/route.ts:28-43` takes `title`,
  `price`, `size` and `quantity` from the request; `:46` decides shipping from the
  request's `subtotal`. The store's own checkout gets this right by re-pricing every line
  from the catalog (`app/lib/store-checkout.ts:143-179`).
- **Suggested fix:** have the monthly deals route call `parseCartItems` and
  `createStoreCheckoutSession` like `app/api/catalog/checkout/route.ts` does (it can still
  pass its own success URL and `source: "monthly-deals"` metadata), or remove the route if
  monthly deals is over. Its metadata still says `month: "2025-01"` (`:80`).

### B2. An agent (MPP) order can be charged twice
- **Rules broken:** an agent order is charged at most once; the shop never tells an agent
  "failed" after charging it.
- **Why it matters:** the customer pays twice and Lucas gets two owner emails for what was
  meant to be one order.
- **Steps (charged twice):** the agent sends its paid request; Stripe charges the card;
  the answer never reaches the agent (timeout); the agent tries again; Stripe charges again.
- **Steps (told it failed):** the agent sends its paid request; Stripe charges the card;
  saving the order to Redis fails; the server answers 500 "Payment processing failed", so a
  sensible agent tries again and is charged again.
- **Code:** `app/api/mpp/purchase/route.ts:302` makes a new random `orderId` on every
  request, and `app/lib/mpp-payment-verifier.ts:52-54` uses it as Stripe's idempotency key,
  so the key never repeats and can't stop a second charge (its comment says it should).
  `route.ts:341` saves the order after the charge, and any error there lands in the catch at
  `:363-365`, which answers 500. `saveOrder` rethrows Redis errors
  (`app/lib/mpp-order-store.ts:40-43`).
- **Suggested fix:** key the payment on something that stays the same when the agent
  retries the same purchase, such as the 402 challenge id the agent sends back; and once the
  card is charged, answer with the order even if saving it fails (log the save error).
  `node verification/run.mjs checkout --variant fix-agent-stable-key` shows both rules
  holding with that change.

### B3. Lucas's order email leaves out line 11 onwards
- **Why it matters:** the owner email is what Lucas uses to place the order with the
  printer. An order with more than 10 different lines (item, size, color) arrives with only
  the first 10, so the rest never get made.
- **Code:** `app/api/stripe/webhook/route.ts:126-128` re-reads the session with
  `expand: ["line_items..."]`, and `toOrder` (`:148`) uses `session.line_items.data` as the
  whole order. Stripe includes only the first page of line items that way, 10 by default
  (Stripe API reference, "Retrieve a Checkout Session's line items"). Nothing limits the
  number of lines in a cart (`app/lib/store-checkout.ts:28-52`).
- **Found by:** reading the code and Stripe's docs, not by a model (the models treat an
  order as a whole).
- **Suggested fix:** list the session's line items with
  `stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] })`
  and page through `has_more`, or cap a cart at 10 lines.

### B4. Agents can buy sizes the printer can't make
- **Rule broken:** every paid garment is in a size its blank comes in.
- **Why it matters:** the Fuzzy Spectrum and Blueprint sweatshirts don't come in XS
  (`product-catalog.json:7205`, `:7407`), but an agent order for an XS one is accepted and
  paid, and Lucas has to refund or substitute.
- **Steps:** one request: sweatshirt, size XS.
- **Code:** `app/api/mpp/purchase/route.ts:131` checks against the shop-wide size list
  (`CLOTHING_SIZES`) instead of the blank's own list. The store checkout uses
  `getClothingSizes(product)` (`app/lib/store-checkout.ts:80`).
- **Suggested fix:** use `getClothingSizes(product)` at `route.ts:128-133`.

### B5. Agent customers get a confirmation email on every webhook retry
- **Rule broken:** the agent's customer gets one confirmation email.
- **Why it matters:** each retry or duplicate delivery of the same paid event emails the
  customer again. If the owner alert keeps failing (for example a missing
  `ORDER_NOTIFICATION_EMAIL`), Stripe retries for up to 3 days and the customer gets a
  confirmation every time.
- **Steps:** Stripe delivers the paid event twice (Stripe allows duplicates); each delivery
  emails the customer.
- **Code:** `app/api/stripe/webhook/route.ts:539-541` sends the confirmation outside
  `runOnce` and with no idempotency key (`:432-445`), before the owner alert at `:562`,
  whose failure makes Stripe retry.
- **Suggested fix:** send it through `runOnce(\`order-confirmation:${paymentIntent.id}\`, ...)`
  and give the Resend call an `Idempotency-Key` like the owner alert's. The
  `fix-confirmation-once` variant shows the rule holding with that change.

### B6. After paying, the cart can still hold the order's items
- **Rule broken:** after a paid order the cart is empty.
- **Why it matters:** the cart badge still shows the old items after checkout, and the next
  thing the shopper adds saves them all back, so it is easy to buy the same things twice.
- **Steps:** the shopper lands on `/checkout/success`; the cart loads the saved items into
  memory; the success page removes the saved copy from the browser, but not the copy in
  memory; the next add saves the old items again.
- **Code:** `app/checkout/success/page.tsx:31` only calls `localStorage.removeItem('cart')`.
  The page content sits inside `<Suspense>` (`:113`), so it most likely runs after
  `CartProvider` has already loaded the cart (`CartProvider.tsx:50-61`); the next change is
  written back by `CartProvider.tsx:64-68`.
- **Confidence:** likely. Which runs first depends on how React renders the Suspense
  section; a test purchase in Stripe test mode would confirm it in a minute.
- **Suggested fix:** call `clearCart()` from `useCart()` on the success page.

## Smaller cart issues

These only affect carts saved before a size list changed.

### M1. Picking a new size for a saved line keeps the old line's id
- **Rules broken:** each item and size is on one cart line; no item and size goes over
  the per-line cap.
- **What happens:** a saved tee in a retired size is changed to M while the cart already has
  a tee in M. Now there are two M lines, which can add up to more than 20.
- **Code:** `app/components/cart/CartProvider.tsx:129-141` changes `size` but not `id`
  (ids are built as `variant:size:color`, `ProductPageClient.tsx:211-213`).
- **Suggested fix:** in `updateSize`, rebuild the id and merge into an existing line.

### M2. The drawer and checkout disagree on which sizes are fine
- **Rule broken:** checkout takes every line, or the drawer shows how to fix it.
- **What happens:** a saved XS Fuzzy Spectrum sweatshirt shows as "Size: XS" with no way to
  change it, and checkout refuses it. The retired-size picker also offers XS for it.
- **Code:** `app/components/cart/CartDrawer.tsx:246-262` uses the shop-wide `CLOTHING_SIZES`;
  checkout uses the blank's list (`app/lib/store-checkout.ts:80`).
- **Suggested fix:** carry the blank's sizes on the cart line (or look them up) and use
  them in the drawer.

## Edge case, unconfirmed

### E1. A rare crash can send the customer a second Stripe receipt
- **Rule broken:** the customer gets one Stripe receipt.
- **What happens:** two deliveries of the same event overlap, both read the order before
  the receipt address is set, and the first run stops right after setting it (before
  marking it done). Five minutes later the claim expires and the second run sets it again.
  Without `REDIS_URL` the overlap alone is enough.
- **Code:** `app/api/stripe/webhook/route.ts:126` reads once, `:190-202` decides from that
  read; `app/lib/kv.ts:15, 31-43`.
- **Why unconfirmed:** it assumes Stripe sends another receipt when `receipt_email` is set
  again to the same address. If it doesn't, this can't happen.

## What holds

- Lucas is always emailed before Stripe stops retrying a paid order, with or without Redis.
- Lucas gets one owner alert per order. With Redis, that is thanks to the Resend
  idempotency key as much as `runOnce`: if a run stops after sending but before marking the
  step done, the claim expires and the step runs again
  (`--variant broken-no-resend-key` shows the duplicate). Keep that header.
- The store checkout charges catalog prices, adds shipping under $50 from its own total,
  and only accepts sizes the blank comes in, whatever the browser sends.
- Agent purchases charge catalog prices and add shipping correctly.

Every rule above was also seen failing on a deliberately broken variant
(`--variant broken-...`), so a pass is not just the check being unable to fail.

## Worth a look, not bugs

- Free shipping is decided before discounts (`app/lib/store-checkout.ts:178-179`), so a
  $55 order with the game's 25% code pays $41.25 and ships free. Fine if intended.
- If the owner alert fails for longer than Stripe retries (about 3 days), Stripe stops and
  the order exists only in the Stripe dashboard. Worth a look if Resend settings change.

## What the models leave out

Discount codes, the ACP route's own request handling, delayed payment methods, Stripe's
hosted checkout page, and anything after the owner email. Bounds are in the skill file.
