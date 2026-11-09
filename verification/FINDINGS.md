# Order flow findings

First checked at commit `4191481` with `node verification/run.mjs` (models in
`verification/models/`, how to use them in `.claude/skills/verify-order-flow/SKILL.md`).
B1 and B2 were then fixed on the `fix-checkout-money-bugs` branch; see "Fixed" below.

Each finding names the rule it breaks, why it matters, the shortest way it happens, and the
code it traces to. `node verification/run.mjs --paths` prints every path.

## Real bugs

### B2b. An agent that leaves out the payment request id can still be charged twice
- **Rules broken:** an agent order is charged at most once; the shop never tells an agent
  "failed" after charging it.
- **What happens:** the B2 fix ties an agent's payment to the shop's payment request id,
  which the agent is supposed to send back with its payment. An agent that leaves the id
  out falls back to its payment token, so if its answer times out and it retries with a
  new token, the second token is charged too.
- **Steps:** the agent sends its paid request without the request id; Stripe charges the
  card; the answer never reaches the agent; the agent tries again with a new token; Stripe
  charges again.
- **Code:** `app/api/mpp/purchase/route.ts` (`buildOrderId` falls back to `token:`), and
  `app/lib/mpp-payment-verifier.ts` (`readChallengeId`).
- **Why it's left:** the payment protocol has agents send the request back, so a
  well-behaved agent is covered. Refusing payments without it would also refuse agents that
  use the older direct `spt` field. Worth closing if logs show credentials without it.

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

## Fixed on this branch

### B1. Monthly deals checkout charged whatever price the browser sent (fixed)
- **Was:** `app/api/monthly-deals/create-checkout-session/route.ts` took the title, price,
  size and quantity from the request and decided shipping from the request's subtotal, so
  anyone could post a cart at $0.01 and Stripe would charge exactly that.
- **Now:** the deal lives in `app/lib/monthly-deal.ts`, shared by the page and the route.
  The route reads only ids, sizes, colors and quantities from the browser. A deal line must
  use one of the deal's sizes and colors and is priced from that file; any other item in the
  cart is priced from the catalog, the same way the store checkout does it. Shipping is
  worked out from the server's own total by `createStoreCheckoutSession`, which now takes
  these server-priced deal lines (`serverPricedLines`).
- **Also changes:** monthly deals orders now get the store checkout's shipping option,
  phone number field and promo code box, and shipping shows as shipping in Stripe instead
  of as a "Shipping" product line. The order's month now comes from the deal file (still
  "2025-01", so the deal itself may be stale).
- **Check:** `node verification/run.mjs checkout` shows all three pricing rules holding for
  monthly deals; `--variant broken-before-money-fixes` shows them failing on the old code.

### B2. An agent (MPP) order could be charged twice (fixed)
- **Was:** `app/api/mpp/purchase/route.ts` made a new random order id on every request and
  used it as the key Stripe uses to spot a repeat, so a retry looked new and was charged
  again. A Redis error after the charge also answered 500 "Payment processing failed",
  which invites the agent to pay again.
- **Now:** the order id is built from the shop's payment request id that the agent sends
  back (or its payment token if it leaves that out) plus the exact order. A retry of the
  same order gets the same id, so Stripe returns the first payment instead of charging
  again; a retry with a new token is refused by Stripe and answered 409 "already used" with
  the order id. A saved order with that id is answered without charging, which covers
  retries after Stripe's 24-hour memory runs out (when Redis is on). Once the card is
  charged, a failed save is logged and the order is still answered as paid. A second copy
  of a request that's still being charged gets 409 with "try again in a moment".
- **Check:** `node verification/run.mjs checkout` shows both rules holding with and without
  Redis; `--variant broken-before-money-fixes` shows both failing on the old code. B2b
  above is the case this doesn't cover.

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
- Monthly deals checkout charges the deal's own price and catalog prices for anything else
  in the cart, and adds shipping under $50 from its own total.
- An agent order is charged once however often the agent retries, as long as it sends back
  the payment request id (B2b covers the case where it doesn't).

Every rule above was also seen failing on a deliberately broken variant
(`--variant broken-...`), so a pass is not just the check being unable to fail.

## Worth a look, not bugs

- The monthly deal still says January 2025 (`app/lib/monthly-deal.ts`). Its real blank
  sizes aren't in the catalog, so the size rule can only check it against the deal's own
  list.
- A deal hoodie in the cart can only be checked out from a `/monthly-deals` page; the cart
  drawer elsewhere sends it to the store checkout, which says it's no longer available.
  This was already the case before the fix.
- Free shipping is decided before discounts (`app/lib/store-checkout.ts:178-179`), so a
  $55 order with the game's 25% code pays $41.25 and ships free. Fine if intended.
- If the owner alert fails for longer than Stripe retries (about 3 days), Stripe stops and
  the order exists only in the Stripe dashboard. Worth a look if Resend settings change.

## What the models leave out

Discount codes, the ACP route's own request handling, delayed payment methods, Stripe's
hosted checkout page, and anything after the owner email. Bounds are in the skill file.
