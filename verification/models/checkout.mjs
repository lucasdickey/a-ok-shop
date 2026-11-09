// Checkout: how a cart becomes a charge.
//
// Part 1, "agent purchase": app/api/mpp/purchase/route.ts with createStripePaymentFromSPT
// (app/lib/mpp-payment-verifier.ts) and saveOrder (app/lib/mpp-order-store.ts). One agent
// wants one order. It may send the paid request again after a failure (MAX_PAID_REQUESTS
// in all). The server charges the card, saves the order, then answers. Any answer can be
// lost on the way back (timeout), which the agent sees as a failure.
//
// Part 2, "what Stripe is asked to charge": the three ways in, given whatever the caller
// sends: the store's checkout (app/api/catalog/checkout + app/lib/store-checkout.ts), the
// monthly deals checkout (app/api/monthly-deals/create-checkout-session), and the agent
// purchase above. A browser or agent can send any price, subtotal and size it likes.

const MAX_PAID_REQUESTS = 2;

// Two products from product-catalog.json: a tee whose blank comes in XS-2XL, and the
// Fuzzy Spectrum Sweatshirt, whose blank starts at S (supportedSizes, product-catalog.json:7205).
const PRODUCTS = {
  tee: { priceCents: 3000, sizes: ["XS", "S", "M", "L", "XL", "2XL"] },
  sweatshirt: { priceCents: 6000, sizes: ["S", "M", "L", "XL", "2XL"] },
};
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL"]; // app/lib/sizes.ts:4
const FREE_SHIPPING_FROM_CENTS = 5000;
const SHIPPING_CENTS = 999;

function agentSpec({ redis, variant }) {
  const init = [
    { agent: "wants to buy", requestsSent: 0, server: null, charges: 0, keysCharged: [], answeredFailedAfterCharge: false },
  ];
  const copy = (s) => structuredClone(s);

  function next(s) {
    const moves = [];
    const push = (step, t) => moves.push({ step, state: t });

    if (s.server === null && (s.agent === "wants to buy" || s.agent === "saw a failure") && s.requestsSent < MAX_PAID_REQUESTS) {
      const t = copy(s);
      t.requestsSent++;
      // route.ts:302 makes a fresh random orderId per request; the verifier uses it as the
      // Stripe idempotency key (mpp-payment-verifier.ts:52-54). The fix keys on the 402 challenge.
      const key = variant.stableKey ? "challenge" : `order-${t.requestsSent}`;
      t.server = { pc: "charge", key, charged: false };
      t.agent = "waiting";
      push(s.requestsSent === 0 ? "the agent sends its paid request (route.ts:177-179)" : "the agent tries again with a new payment token", t);
    }
    if (s.agent === "saw a failure") {
      const t = copy(s);
      t.agent = "gave up";
      push("the agent gives up", t);
    }

    const srv = s.server;
    if (srv) {
      const answer = (t, ok, label) => {
        if (!ok && t.server.charged) t.answeredFailedAfterCharge = true;
        t.server = null;
        t.agent = ok ? "told it paid" : "saw a failure";
        push(label, t);
      };
      // The answer can be lost once the card may have been charged.
      if (srv.pc !== "charge") {
        const t = copy(s);
        t.server = null;
        t.agent = "saw a failure";
        push("the answer never reaches the agent (timeout)", t);
      }
      if (srv.pc === "charge") {
        const ok = copy(s);
        if (!s.keysCharged.includes(srv.key)) {
          ok.charges++;
          ok.keysCharged.push(srv.key);
        }
        ok.server.charged = true;
        ok.server.pc = "save";
        push(s.keysCharged.includes(srv.key)
          ? "Stripe sees the same idempotency key and returns the earlier payment, no new charge"
          : "Stripe charges the card (mpp-payment-verifier.ts:58-79)", ok);
        const declined = copy(s);
        answer(declined, false, "the card is declined, answered 401 (route.ts:315-318)");
      } else if (srv.pc === "save") {
        const ok = copy(s);
        ok.server.pc = "answer";
        push(redis ? "the order is saved to Redis (mpp-order-store.ts:34)" : "no REDIS_URL, so saving is skipped (mpp-order-store.ts:27-30)", ok);
        if (redis) {
          const bad = copy(s);
          if (variant.answerPaidEvenIfSaveFails) {
            bad.server.pc = "answer";
            push("saving fails; the error is logged and the order still answered as paid", bad);
          } else {
            answer(bad, false, "saving to Redis fails, so the server answers 500 'Payment processing failed' (route.ts:341, 363-365)");
          }
        }
      } else {
        answer(copy(s), true, "the server answers 200 'Order completed' (route.ts:356)");
      }
    }
    return moves;
  }

  return {
    init,
    next,
    rules: {
      "An agent order is charged at most once": (s) => s.charges <= 1,
      "The shop never tells an agent 'failed' after charging it": (s) => !s.answeredFailedAfterCharge,
    },
  };
}

/** What each way in asks Stripe for, given what the caller sent. */
function handle(endpoint, req, variant) {
  const product = PRODUCTS[req.item];
  if (endpoint === "store") {
    // store-checkout.ts:77-84 checks the size against this blank; 150 takes the price from the catalog.
    if (!variant.storeTrustsBrowser && !product.sizes.includes(req.size)) return { rejected: true };
    const unit = variant.storeTrustsBrowser ? req.clientPriceCents : product.priceCents;
    const subtotal = variant.storeTrustsBrowser ? req.clientSubtotalCents : unit;
    const shipping = subtotal < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0; // store-checkout.ts:178-179
    return { unit, shipping, size: req.size };
  }
  if (endpoint === "monthly deals") {
    // monthly-deals/create-checkout-session/route.ts:28-43 uses the browser's price and size;
    // :46 decides shipping from the browser's subtotal.
    const unit = req.clientPriceCents;
    const shipping = req.clientSubtotalCents < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0;
    return { unit, shipping, size: req.size };
  }
  // agent purchase: mpp/purchase/route.ts:127-133 checks the size against the shop-wide list;
  // :150 takes the price from the catalog; :171 adds shipping under $50.
  const allowed = variant.agentChecksBlankSizes ? product.sizes : CLOTHING_SIZES;
  if (!allowed.includes(req.size)) return { rejected: true };
  const unit = product.priceCents;
  return { unit, shipping: unit < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0, size: req.size };
}

function chargeSpec({ endpoint, variant }) {
  const init = [];
  {
    for (const item of Object.keys(PRODUCTS)) {
      for (const size of ["XS", "M"]) {
        for (const clientPriceCents of [PRODUCTS[item].priceCents, 1]) {
          for (const clientSubtotalCents of [PRODUCTS[item].priceCents, 10000]) {
            init.push({ endpoint, req: { item, size, clientPriceCents, clientSubtotalCents }, result: null });
          }
        }
      }
    }
  }
  const next = (s) =>
    s.result
      ? []
      : [{
          step: `the ${s.endpoint} checkout handles: ${s.req.item}, size ${s.req.size}, price sent ${s.req.clientPriceCents}c, subtotal sent ${s.req.clientSubtotalCents}c`,
          state: { ...s, result: handle(s.endpoint, s.req, variant) },
        }];
  const charged = (s) => s.result && !s.result.rejected;
  return {
    init,
    next,
    rules: {
      "Every line is charged its catalog price": (s) => !charged(s) || s.result.unit === PRODUCTS[s.req.item].priceCents,
      "Orders under $50 pay shipping": (s) =>
        !charged(s) || PRODUCTS[s.req.item].priceCents >= FREE_SHIPPING_FROM_CENTS || s.result.shipping === SHIPPING_CENTS,
      "Every paid garment is in a size its blank comes in": (s) => !charged(s) || PRODUCTS[s.req.item].sizes.includes(s.result.size),
    },
  };
}

export function spec(config) {
  const variant = config.variant ?? {};
  return config.part === "agent" ? agentSpec({ ...config, variant }) : chargeSpec({ ...config, variant });
}

export const configs = [
  { label: "agent purchase, Redis on", part: "agent", redis: true },
  { label: "agent purchase, no Redis", part: "agent", redis: false },
  { label: "store checkout charges", part: "charge", endpoint: "store" },
  { label: "agent purchase charges", part: "charge", endpoint: "agent purchase" },
  { label: "monthly deals checkout charges", part: "charge", endpoint: "monthly deals" },
];

export const variants = {
  "broken-store-trusts-browser": { storeTrustsBrowser: true },
  "fix-agent-stable-key": { stableKey: true, answerPaidEvenIfSaveFails: true, agentChecksBlankSizes: true },
};

export const covers = [
  "app/api/mpp/purchase/route.ts: POST, handlePaymentAuthorization",
  "app/lib/mpp-payment-verifier.ts: createStripePaymentFromSPT",
  "app/lib/mpp-order-store.ts: saveOrder",
  "app/lib/store-checkout.ts: resolveVariant, createStoreCheckoutSession",
  "app/api/catalog/checkout/route.ts: POST",
  "app/api/monthly-deals/create-checkout-session/route.ts: POST",
];
