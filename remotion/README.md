# Machine Payment Protocol — Request → Payment Workflow (Remotion)

An animated visualization of how an autonomous **AI agent** checks out on
**a-ok.shop** using the **Machine Payment Protocol (MPP)** over HTTP `402`,
settling through a **Stripe** Shared Payment Token (SPT).

It mirrors the real implementation in
[`app/api/mpp/purchase/route.ts`](../app/api/mpp/purchase/route.ts),
[`app/lib/mpp-payment-verifier.ts`](../app/lib/mpp-payment-verifier.ts) and
[`app/types/mpp.ts`](../app/types/mpp.ts).

## The 7-step flow

| # | Message | Meaning |
|---|---------|---------|
| 1 | `GET /api/mpp/catalog` → `200 products[]` | Agent discovers the machine-readable feed |
| 2 | `POST /api/mpp/purchase { items }` | Agent attempts to buy; server validates & totals |
| 3 | `402 Payment Required` + `WWW-Authenticate: Payment …` | Server issues the payment challenge |
| 4 | `mint SPT` (Stripe wallet) | Amount-capped, single-merchant `spt_…` token |
| 5 | `POST … Authorization: Payment <base64url(spt)>` | Agent retries with the credential |
| 6 | `stripe.paymentIntents.create({ confirm:true, shared_payment_granted_token })` → `succeeded` | Server settles via Stripe |
| 7 | `200 OK` + `Payment-Receipt` | Order persisted and delivered |

## Develop

```bash
npm run remotion:studio       # interactive Remotion Studio (opens in your browser)
```

## Render

> Headless rendering downloads Chrome Headless Shell on first run, so it must
> be run in an environment with outbound network access (e.g. your local
> machine).

```bash
npm run remotion:render       # -> out/machine-payment-workflow.mp4 (1920x1080, 30fps)
npm run remotion:still        # -> out/machine-payment-workflow.png (single frame)
```

## Files

- `index.ts` — registers the Remotion root
- `Root.tsx` — the `<Composition>` definition
- `MachinePaymentWorkflow.tsx` — scene timeline
- `scenes.tsx` — intro, the 7 workflow steps, and outro
- `components.tsx` — reusable Stage / Packet / HttpCard / Caption primitives
- `theme.ts` — colors, fonts, actor + lane layout (system fonts only, no extra deps)
