// Checkout: how a cart becomes a charge.
//
// Part 1, "agent purchase": app/api/mpp/purchase/route.ts with createStripePaymentFromSPT
// and parsePaymentAuthorization (app/lib/mpp-payment-verifier.ts) and saveOrder/getOrder
// (app/lib/mpp-order-store.ts). One agent wants one order. After a failure it may send the
// paid request again (MAX_PAID_REQUESTS in all), with the same payment token or a new one.
// The server looks for a saved order with the same id, charges the card through Stripe
// (which remembers each key: the same key and token give back the first result, the same
// key with a new token is refused), saves the order, then answers. Any answer sent after
// the charge can be lost on the way back (timeout), which the agent sees as a failure.
// The agent is assumed to echo the shop's payment request id, as the payment protocol
// asks; the "request id left out" config shows what happens when it doesn't.
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
// The monthly deal hoodie (app/lib/monthly-deal.ts): $50, offered in every shop size. It
// isn't in the catalog, so its "catalog price" here is the price in that file. Only the
// monthly deals checkout sells it.
PRODUCTS.deal = { priceCents: 5000, sizes: CLOTHING_SIZES };
const MONTHLY_DEAL = PRODUCTS.deal;
const FREE_SHIPPING_FROM_CENTS = 5000;
const SHIPPING_CENTS = 999;

function agentSpec({ redis, echoesRequest = true, variant }) {
  const init = [
    {
      agent: "wants to buy",
      requestsSent: 0,
      tokens: 1,
      server: null,
      charges: 0,
      stripeSeen: {}, // idempotency key -> { token, outcome }
      saved: [], // order ids saved to Redis
      answeredFailedAfterCharge: false,
    },
  ];
  const copy = (s) => structuredClone(s);

  // route.ts buildOrderId: the order id (and Stripe key) comes from the echoed 402 payment
  // request id, or from the token when the agent leaves the id out. The old code made a
  // fresh random id per request (variant randomKey).
  const keyFor = (s) =>
    variant.randomKey ? `order-${s.requestsSent}` : echoesRequest ? "request" : `token-${s.tokens}`;

  function next(s) {
    const moves = [];
    const push = (step, t) => moves.push({ step, state: t });

    if (s.server === null && (s.agent === "wants to buy" || s.agent === "saw a failure") && s.requestsSent < MAX_PAID_REQUESTS) {
      for (const newToken of s.requestsSent === 0 ? [false] : [false, true]) {
        const t = copy(s);
        t.requestsSent++;
        if (newToken) t.tokens++;
        t.server = { pc: redis && !variant.randomKey ? "lookup" : "charge", key: keyFor(t), token: t.tokens, charged: false };
        t.agent = "waiting";
        push(
          s.requestsSent === 0
            ? "the agent sends its paid request"
            : newToken
              ? "the agent tries again with a new payment token"
              : "the agent sends the same paid request again",
          t
        );
      }
    }
    if (s.agent === "saw a failure") {
      const t = copy(s);
      t.agent = "gave up";
      push("the agent gives up", t);
    }

    const srv = s.server;
    if (srv) {
      const answer = (t, kind, label) => {
        if (kind === "failed" && t.charges > 0) t.answeredFailedAfterCharge = true;
        t.server = null;
        t.agent = { paid: "told it paid", failed: "saw a failure", used: "told the request was already used" }[kind];
        push(label, t);
      };
      // Once the card may have been charged, the answer can be lost on the way back.
      if (srv.pc !== "charge" && srv.pc !== "lookup") {
        const t = copy(s);
        t.server = null;
        t.agent = "saw a failure";
        push("the answer never reaches the agent (timeout)", t);
      }
      if (srv.pc === "lookup") {
        // route.ts: getOrder(orderId) before charging.
        if (s.saved.includes(srv.key)) {
          answer(copy(s), "paid", "the order is already saved, so it is answered as paid without charging");
        } else {
          const t = copy(s);
          t.server.pc = "charge";
          push("no saved order with this id, so go on to charge", t);
        }
      } else if (srv.pc === "charge") {
        const seen = s.stripeSeen[srv.key];
        if (!seen) {
          const ok = copy(s);
          ok.charges++;
          ok.stripeSeen[srv.key] = { token: srv.token, outcome: "charged" };
          ok.server.charged = true;
          ok.server.pc = "save";
          push("Stripe charges the card (mpp-payment-verifier.ts)", ok);
          const declined = copy(s);
          declined.stripeSeen[srv.key] = { token: srv.token, outcome: "declined" };
          answer(declined, "failed", "the card is declined, answered 401");
        } else if (seen.token === srv.token) {
          const t = copy(s);
          if (seen.outcome === "charged") {
            t.server.charged = true;
            t.server.pc = "save";
            push("Stripe sees the same request again and returns the earlier payment, no new charge", t);
          } else {
            answer(t, "failed", "Stripe returns the earlier decline, answered 401");
          }
        } else {
          answer(copy(s), "used", "Stripe refuses the same key with a new token, nothing charged, answered 409 'already used'");
        }
      } else if (srv.pc === "save") {
        const ok = copy(s);
        ok.server.pc = "answer";
        if (redis) ok.saved.push(srv.key);
        push(redis ? "the order is saved to Redis (mpp-order-store.ts)" : "no REDIS_URL, so saving is skipped (mpp-order-store.ts)", ok);
        if (redis) {
          const bad = copy(s);
          if (variant.failedIfSaveFails) {
            answer(bad, "failed", "saving to Redis fails, so the server answers 500 'Payment processing failed'");
          } else {
            bad.server.pc = "answer";
            push("saving fails; the error is logged and the order still answered as paid", bad);
          }
        }
      } else {
        answer(copy(s), "paid", "the server answers 200 'Order completed'");
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
    if (variant.dealsTrustBrowser) {
      // The old route used the browser's price and size, and decided shipping from the
      // browser's subtotal.
      const unit = req.clientPriceCents;
      const shipping = req.clientSubtotalCents < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0;
      return { unit, shipping, size: req.size };
    }
    // monthly-deals/create-checkout-session/route.ts: catalog items in the cart are priced
    // like the store checkout; the deal line is checked against the deal's own sizes and
    // priced from app/lib/monthly-deal.ts; shipping is decided by createStoreCheckoutSession
    // from the server's subtotal.
    if (req.item !== "deal") return handle("store", req, {});
    if (!MONTHLY_DEAL.sizes.includes(req.size)) return { rejected: true };
    const unit = MONTHLY_DEAL.priceCents;
    return { unit, shipping: unit < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0, size: req.size };
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
    for (const item of Object.keys(PRODUCTS).filter((i) => i !== "deal" || endpoint === "monthly deals")) {
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
  { label: "agent purchase, request id left out", part: "agent", redis: true, echoesRequest: false },
  { label: "store checkout charges", part: "charge", endpoint: "store" },
  { label: "agent purchase charges", part: "charge", endpoint: "agent purchase" },
  { label: "monthly deals checkout charges", part: "charge", endpoint: "monthly deals" },
];

export const variants = {
  "broken-store-trusts-browser": { storeTrustsBrowser: true },
  // The code before the fixes in this branch: a random order id per request, a 500 when
  // saving fails after charging, and monthly deals priced from the browser.
  "broken-before-money-fixes": { randomKey: true, failedIfSaveFails: true, dealsTrustBrowser: true },
  "fix-agent-blank-sizes": { agentChecksBlankSizes: true },
};

export const covers = [
  "app/api/mpp/purchase/route.ts: POST, handlePaymentAuthorization",
  "app/lib/mpp-payment-verifier.ts: createStripePaymentFromSPT, parsePaymentAuthorization",
  "app/lib/mpp-order-store.ts: saveOrder, getOrder",
  "app/lib/monthly-deal.ts: MONTHLY_DEAL",
  "app/lib/store-checkout.ts: resolveVariant, createStoreCheckoutSession",
  "app/api/catalog/checkout/route.ts: POST",
  "app/api/monthly-deals/create-checkout-session/route.ts: POST",
];
