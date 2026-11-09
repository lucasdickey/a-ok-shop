// Fulfillment: what happens after Stripe says an order is paid.
// Code: app/api/stripe/webhook/route.ts and runOnce in app/lib/kv.ts.
//
// One paid order. Stripe delivers its event up to MAX_DELIVERIES times (retries after a
// failure, plus duplicate deliveries, which Stripe allows), and at most two runs of the
// webhook overlap. Any run can stop at any point (function timeout or crash), which Stripe
// sees as a failure and retries. A Redis claim left "pending" by a run that stopped expires
// after 300 seconds (kv.ts:15); the model lets it expire only once no live run holds it.

const MAX_DELIVERIES = 3;
const MAX_OVERLAP = 2;

/** What one webhook run does, in order, for each kind of order. */
function program(order, variant) {
  if (order === "checkout") {
    // handlePaidCheckoutSession, route.ts:124-142
    return [
      { kind: "retrieve" }, // route.ts:126 re-reads the session, including the charge's receipt_email
      { kind: "once", step: "receipt" }, // route.ts:138 runOnce(order-receipt) -> ensureCustomerReceipt
      { kind: "once", step: "alert" }, // route.ts:141 runOnce(order-alert) -> sendOwnerOrderAlert
      { kind: "ack" }, // route.ts:93 responds 200, so Stripe stops
    ];
  }
  // Agent (MPP) payment: handleMPPPaymentSucceeded, route.ts:509-563
  return [
    variant.fixConfirmationOnce
      ? { kind: "once", step: "confirm" } // proposed fix: confirmation inside runOnce, with a Resend key
      : { kind: "unguarded", step: "confirm" }, // route.ts:539-541, errors swallowed at 555-557
    { kind: "resolve" }, // route.ts:560 looks the email up again; a Stripe error here fails the run
    { kind: "once", step: "alert" }, // route.ts:562
    { kind: "ack" },
  ];
}

export function spec(config) {
  const { order, redis, variant = {} } = config;
  const ops = program(order, variant);

  const init = [
    {
      claims: { receipt: "none", alert: "none", confirm: "none" }, // Redis once:* keys
      receiptEmailSet: false, // Stripe charge.receipt_email
      resendSeen: { alert: false, confirm: false }, // Resend idempotency keys already used
      sent: { receipt: 0, alert: 0, confirm: 0 }, // emails that actually reach someone
      acked: false,
      deliveriesLeft: MAX_DELIVERIES,
      runs: [],
    },
  ];

  const copy = (s) => structuredClone(s);
  const sortRuns = (s) => {
    s.runs.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return s;
  };

  /** The side effect of one step, when its call succeeds. */
  function effect(s, run, step) {
    if (step === "receipt") {
      // ensureCustomerReceipt, route.ts:190-202: skip if the charge already has receipt_email,
      // otherwise set it on the PaymentIntent and Stripe emails the receipt.
      // Assumption: each such update makes Stripe send a receipt.
      if (run.saw && !variant.noReceiptGuard) return;
      s.sent.receipt++;
      s.receiptEmailSet = true;
    } else if (step === "alert") {
      // sendOwnerOrderAlert sends with Idempotency-Key order-alert-<id> (route.ts:308);
      // Resend drops a repeat of a key it has seen (within 24 hours).
      if (!variant.noResendKey && s.resendSeen.alert) return;
      s.sent.alert++;
      s.resendSeen.alert = true;
    } else if (step === "confirm") {
      // sendConfirmationEmail, route.ts:432-445: no idempotency key today.
      if (variant.fixConfirmationOnce && s.resendSeen.confirm) return;
      s.sent.confirm++;
      s.resendSeen.confirm = true;
    }
  }

  function next(s) {
    const moves = [];
    const push = (step, t) => moves.push({ step, state: sortRuns(t) });

    if (s.deliveriesLeft > 0 && s.runs.length < MAX_OVERLAP) {
      const t = copy(s);
      t.deliveriesLeft--;
      t.runs.push({ op: 0, phase: "claim", saw: false, holds: null });
      push("Stripe delivers the paid event (route.ts:17)", t);
    }

    for (const key of ["receipt", "alert", "confirm"]) {
      if (s.claims[key] === "pending" && !s.runs.some((r) => r.holds === key)) {
        const t = copy(s);
        t.claims[key] = "none";
        push(`the stuck "${key}" claim expires after 300s (kv.ts:15)`, t);
      }
    }

    s.runs.forEach((run, i) => {
      const op = ops[run.op];
      const finish = (t, why) => {
        t.runs.splice(i, 1);
        return why;
      };

      // Any run can stop at any point; Stripe will retry.
      {
        const t = copy(s);
        const label = finish(t, `a webhook run stops (timeout or crash) during ${op.kind}${op.step ? ` ${op.step}` : ""}`);
        push(label, t);
      }

      if (op.kind === "retrieve") {
        const t = copy(s);
        t.runs[i].saw = s.receiptEmailSet;
        t.runs[i].op++;
        push("a run re-reads the session from Stripe (route.ts:126)", t);
      } else if (op.kind === "resolve") {
        const ok = copy(s);
        ok.runs[i].op++;
        push("a run looks up the customer email again (route.ts:560)", ok);
        const bad = copy(s);
        push(finish(bad, "that Stripe lookup fails, so the run returns 500 (route.ts:83-91)"), bad);
      } else if (op.kind === "unguarded") {
        const ok = copy(s);
        effect(ok, run, op.step);
        ok.runs[i].op++;
        push("a run emails the customer a confirmation (route.ts:540)", ok);
        const bad = copy(s);
        bad.runs[i].op++;
        push("the confirmation email fails and the error is swallowed (route.ts:452-454)", bad);
      } else if (op.kind === "ack") {
        const t = copy(s);
        t.acked = true;
        finish(t, "");
        push("the run answers 200 and Stripe stops retrying (route.ts:93)", t);
      } else if (op.kind === "once") {
        const key = op.step;
        if (run.phase === "claim") {
          if (!redis) {
            const t = copy(s);
            t.runs[i].phase = "run";
            push(`no REDIS_URL, so runOnce runs "${key}" every time (kv.ts:25-28)`, t);
          } else if (s.claims[key] === "none") {
            const t = copy(s);
            t.claims[key] = "pending";
            t.runs[i].phase = "run";
            t.runs[i].holds = key;
            push(`a run claims "${key}" (kv.ts:31)`, t);
          } else if (s.claims[key] === "done") {
            const t = copy(s);
            t.runs[i].op++;
            push(`"${key}" is already done, so the run skips it (kv.ts:33)`, t);
          } else {
            const t = copy(s);
            push(finish(t, `"${key}" is claimed by another run, so this run returns 500 (kv.ts:34)`), t);
          }
        } else if (run.phase === "run") {
          const ok = copy(s);
          effect(ok, run, key);
          ok.runs[i].phase = "mark";
          push(`a run sends "${key}" (${key === "alert" ? "route.ts:302" : key === "receipt" ? "route.ts:198" : "route.ts:432"})`, ok);

          const bad = copy(s);
          if (key === "alert" && variant.alertErrorsSwallowed) {
            // Broken variant: the owner alert's failure is caught and the run carries on.
            bad.runs[i].phase = "mark";
            push(`sending "${key}" fails but the error is ignored`, bad);
          } else {
            if (redis) bad.claims[key] = "none";
            push(finish(bad, `sending "${key}" fails, the claim is released and the run returns 500 (kv.ts:39-41)`), bad);
          }
        } else {
          const t = copy(s);
          if (redis) t.claims[key] = "done";
          t.runs[i].holds = null;
          t.runs[i].op++;
          t.runs[i].phase = "claim";
          push(`a run marks "${key}" done (kv.ts:43)`, t);
        }
      }
    });
    return moves;
  }

  const rules = {
    "Lucas is emailed before Stripe stops retrying": (s) => !s.acked || s.sent.alert >= 1,
    "Lucas gets one alert per order": (s) => s.sent.alert <= 1,
  };
  if (order === "checkout") rules["The customer gets one Stripe receipt"] = (s) => s.sent.receipt <= 1;
  if (order === "mpp") rules["The agent's customer gets one confirmation email"] = (s) => s.sent.confirm <= 1;

  return { init, next, rules };
}

export const covers = [
  "app/api/stripe/webhook/route.ts: POST, handlePaidCheckoutSession, ensureCustomerReceipt, sendOwnerOrderAlert, sendConfirmationEmail, handleMPPPaymentSucceeded",
  "app/lib/kv.ts: runOnce",
];

export const configs = [
  { label: "checkout, Redis on", order: "checkout", redis: true },
  { label: "checkout, no Redis", order: "checkout", redis: false },
  { label: "agent (MPP), Redis on", order: "mpp", redis: true },
  { label: "agent (MPP), no Redis", order: "mpp", redis: false },
];

/** Variants: "broken" ones prove a rule can fail; "fix" ones show a proposed fix makes it hold. */
export const variants = {
  "broken-alert-errors-ignored": { alertErrorsSwallowed: true },
  "broken-no-resend-key": { noResendKey: true },
  "broken-no-receipt-guard": { noReceiptGuard: true },
  "fix-confirmation-once": { fixConfirmationOnce: true },
};
