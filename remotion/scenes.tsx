import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { ACTORS, ActorKey, COLORS, FONTS, VIDEO } from './theme';
import { Caption, HttpCard, Packet, ProgressRail, Stage } from './components';

const TOTAL_STEPS = 7;
const REQ_Y = 290;
const RES_Y = 360;
const CARD_TOP = 440;

/** Generic request → (optional) response scene built on the shared Stage. */
export const MessageScene: React.FC<{
  step: number;
  active: ActorKey[];
  request: { from: ActorKey; to: ActorKey; label: string; color: string };
  response?: { from: ActorKey; to: ActorKey; label: string; color: string; at: number };
  card: React.ComponentProps<typeof HttpCard>;
  caption: { title: string; body: string; accent: string };
}> = ({ step, active, request, response, card, caption }) => {
  return (
    <Stage active={active}>
      <ProgressRail step={step} total={TOTAL_STEPS} />
      <Packet
        from={request.from}
        to={request.to}
        y={REQ_Y}
        label={request.label}
        color={request.color}
        startFrame={10}
      />
      {response ? (
        <Packet
          from={response.from}
          to={response.to}
          y={RES_Y}
          label={response.label}
          color={response.color}
          startFrame={response.at}
        />
      ) : null}
      <HttpCard {...card} />
      <Caption step={step} total={TOTAL_STEPS} {...caption} />
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* Step 1 — Discover catalog                                           */
/* ------------------------------------------------------------------ */
export const StepDiscover: React.FC = () => (
  <MessageScene
    step={1}
    active={['agent', 'server']}
    request={{ from: 'agent', to: 'server', label: 'GET /api/mpp/catalog', color: COLORS.agent }}
    response={{ from: 'server', to: 'agent', label: '200 · products[]', color: COLORS.server, at: 48 }}
    caption={{
      title: 'Discover the catalog',
      body: 'The agent fetches a machine-readable product feed — no payment required yet.',
      accent: COLORS.server,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'response',
      title: '/api/mpp/catalog',
      status: '200 OK',
      statusColor: COLORS.success,
      accent: COLORS.server,
      delay: 40,
      width: 760,
      lines: [
        '{',
        '  "products": [',
        '    { "handle": "a-ok-glitch-tee",',
        '      "variants": [{ "id": "var_123",',
        '        "price": "50.00", "available": true }] }',
        '  ],',
        '  "total": 24',
        '}',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Step 2 — Purchase attempt                                           */
/* ------------------------------------------------------------------ */
export const StepPurchase: React.FC = () => (
  <MessageScene
    step={2}
    active={['agent', 'server']}
    request={{ from: 'agent', to: 'server', label: 'POST /api/mpp/purchase', color: COLORS.agent }}
    caption={{
      title: 'Attempt the purchase',
      body: 'The agent posts the items it wants to buy. The server validates stock and totals the order.',
      accent: COLORS.agent,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'request',
      title: 'POST /api/mpp/purchase',
      accent: COLORS.agent,
      delay: 30,
      width: 720,
      lines: [
        '{',
        '  "agentId": "agent-7f3a",',
        '  "items": [',
        '    { "handle": "a-ok-glitch-tee",',
        '      "variantId": "var_123", "quantity": 1 }',
        '  ]',
        '}',
        '// server: subtotal 50.00 + shipping 9.99',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Step 3 — 402 Payment Required challenge                             */
/* ------------------------------------------------------------------ */
export const StepChallenge: React.FC = () => (
  <MessageScene
    step={3}
    active={['agent', 'server']}
    request={{
      from: 'server',
      to: 'agent',
      label: '402 Payment Required',
      color: COLORS.warn,
    }}
    caption={{
      title: 'Server issues a payment challenge',
      body: 'HTTP 402 carries a WWW-Authenticate: Payment header — the heart of the Machine Payment Protocol.',
      accent: COLORS.warn,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'response',
      title: '/api/mpp/purchase',
      status: '402 PAYMENT REQUIRED',
      statusColor: COLORS.warn,
      accent: COLORS.warn,
      delay: 34,
      width: 880,
      lines: [
        'WWW-Authenticate: Payment realm="a-ok.shop",',
        '  id="pi_mpp_1718…", method="stripe",',
        '  intent="charge", request="<base64url>"',
        '',
        '{ "id": "pi_mpp_1718…",',
        '  "amount": 5999, "currency": "USD",',
        '  "paymentMethods": { "stripe": { "intent": "charge" } } }',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Step 4 — Mint Shared Payment Token (Stripe wallet)                  */
/* ------------------------------------------------------------------ */
export const StepMintSPT: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 60, fps, config: { damping: 180 } });
  return (
    <Stage active={['agent', 'stripe']}>
      <ProgressRail step={4} total={TOTAL_STEPS} />
      <Packet
        from="agent"
        to="stripe"
        y={REQ_Y}
        label="authorize spend ≤ $59.99"
        color={COLORS.agent}
        startFrame={10}
      />
      <Packet
        from="stripe"
        to="agent"
        y={RES_Y}
        label="spt_1Nf…  (scoped token)"
        color={COLORS.stripe}
        startFrame={50}
      />

      {/* Token chip */}
      <div
        style={{
          position: 'absolute',
          left: VIDEO.width / 2,
          top: CARD_TOP + 30,
          transform: `translate(-50%,0) scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
          opacity: pop,
          width: 760,
          padding: '30px 36px',
          borderRadius: 22,
          background: 'linear-gradient(135deg, #1a2410, #0f160a)',
          border: `1.5px solid ${COLORS.stripe}`,
          boxShadow: `0 0 60px ${COLORS.stripe}33`,
          fontFamily: FONTS.sans,
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 2, color: COLORS.stripe, fontWeight: 800 }}>
          SHARED PAYMENT TOKEN
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 34,
            color: COLORS.text,
            margin: '14px 0 18px',
            fontWeight: 700,
          }}
        >
          spt_1NfQ9k2eZvKYlo2C…
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {['max_amount: $59.99', 'currency: usd', 'single merchant', 'risk-scored'].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 18,
                color: COLORS.textDim,
                padding: '6px 14px',
                borderRadius: 999,
                border: `1px solid ${COLORS.panelBorder}`,
                background: '#0e141d',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <Caption
        step={4}
        total={TOTAL_STEPS}
        title="Mint a Shared Payment Token"
        body="The agent's wallet issues a Stripe SPT — a single-merchant, amount-capped credential. No raw card data is ever shared."
        accent={COLORS.stripe}
      />
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* Step 5 — Authorized retry                                           */
/* ------------------------------------------------------------------ */
export const StepRetry: React.FC = () => (
  <MessageScene
    step={5}
    active={['agent', 'server']}
    request={{
      from: 'agent',
      to: 'server',
      label: 'POST + Authorization: Payment',
      color: COLORS.agent,
    }}
    caption={{
      title: 'Retry with the credential',
      body: 'The agent replays the request, attaching the SPT inside a base64url Authorization: Payment header.',
      accent: COLORS.agent,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'request',
      title: 'POST /api/mpp/purchase',
      accent: COLORS.agent,
      delay: 30,
      width: 820,
      lines: [
        'Authorization: Payment <base64url({',
        '  "challenge": "pi_mpp_1718…",',
        '  "payload": { "method": "stripe",',
        '               "spt": "spt_1NfQ9k…" }',
        '})>',
        '',
        '// same body: items[] + agentId',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Step 6 — Confirm PaymentIntent with SPT                             */
/* ------------------------------------------------------------------ */
export const StepPayment: React.FC = () => (
  <MessageScene
    step={6}
    active={['server', 'stripe']}
    request={{
      from: 'server',
      to: 'stripe',
      label: 'paymentIntents.create · confirm:true',
      color: COLORS.server,
    }}
    response={{
      from: 'stripe',
      to: 'server',
      label: 'status: succeeded',
      color: COLORS.success,
      at: 52,
    }}
    caption={{
      title: 'Settle through Stripe',
      body: 'The server creates and confirms a PaymentIntent with shared_payment_granted_token in one atomic, idempotent call.',
      accent: COLORS.stripe,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'request',
      title: 'stripe.paymentIntents.create',
      status: 'succeeded',
      statusColor: COLORS.success,
      accent: COLORS.stripe,
      delay: 34,
      width: 820,
      lines: [
        'await stripe.paymentIntents.create({',
        '  amount: 5999, currency: "usd",',
        '  confirm: true,',
        '  shared_payment_granted_token: "spt_1NfQ9k…",',
        '  metadata: { source: "mpp-agent", orderId }',
        '}, { idempotencyKey: orderId })',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Step 7 — Order confirmation + receipt                               */
/* ------------------------------------------------------------------ */
export const StepConfirm: React.FC = () => (
  <MessageScene
    step={7}
    active={['agent', 'server']}
    request={{
      from: 'server',
      to: 'agent',
      label: '200 OK · Payment-Receipt',
      color: COLORS.success,
    }}
    caption={{
      title: 'Deliver the order',
      body: 'The server persists the order and returns 200 with a Payment-Receipt header. The machine-to-machine purchase is complete.',
      accent: COLORS.success,
    }}
    card={{
      x: VIDEO.width / 2,
      y: CARD_TOP,
      kind: 'response',
      title: '/api/mpp/purchase',
      status: '200 OK',
      statusColor: COLORS.success,
      accent: COLORS.success,
      delay: 34,
      width: 780,
      lines: [
        'Payment-Receipt: receipt-mpp_1718…',
        '',
        '{ "orderId": "mpp_1718…",',
        '  "status": "completed",',
        '  "amount": 59.99, "currency": "USD",',
        '  "paymentMethod": "stripe-spt",',
        '  "message": "Order completed successfully" }',
      ],
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 16, fps, config: { damping: 200 } });
  const chips = spring({ frame: frame - 30, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 0%, ${COLORS.bgGradientTop}, ${COLORS.bgGradientBottom})`,
        fontFamily: FONTS.sans,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
          fontSize: 22,
          letterSpacing: 8,
          color: COLORS.server,
          fontWeight: 800,
        }}
      >
        MACHINE PAYMENT PROTOCOL
      </div>
      <div
        style={{
          opacity: title,
          transform: `translateY(${(1 - title) * 40}px)`,
          fontSize: 96,
          fontWeight: 900,
          color: COLORS.text,
          margin: '18px 0 6px',
          textAlign: 'center',
          lineHeight: 1.05,
        }}
      >
        Request → Payment
      </div>
      <div
        style={{
          opacity: sub,
          fontSize: 32,
          color: COLORS.textDim,
          marginBottom: 50,
        }}
      >
        How an AI agent checks out on a-ok.shop over HTTP 402
      </div>
      <div style={{ display: 'flex', gap: 26, opacity: chips }}>
        {(Object.keys(ACTORS) as ActorKey[]).map((k) => {
          const a = ACTORS[k];
          return (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 28px',
                borderRadius: 16,
                background: COLORS.panel,
                border: `1px solid ${a.color}`,
                boxShadow: `0 0 30px ${a.color}22`,
              }}
            >
              <span style={{ fontSize: 34 }}>{a.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text }}>{a.label}</div>
                <div style={{ fontSize: 16, color: a.color }}>{a.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Outro — recap of the full flow                                      */
/* ------------------------------------------------------------------ */
const RECAP = [
  ['GET /catalog', 'discover products'],
  ['POST /purchase', 'attempt to buy'],
  ['402 + WWW-Authenticate', 'payment challenge'],
  ['mint SPT', 'scoped wallet token'],
  ['POST + Authorization', 'retry with credential'],
  ['PaymentIntent · confirm', 'settle via Stripe'],
  ['200 + receipt', 'order completed'],
];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 0%, ${COLORS.bgGradientTop}, ${COLORS.bgGradientBottom})`,
        fontFamily: FONTS.sans,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: head,
          transform: `translateY(${(1 - head) * 24}px)`,
          fontSize: 64,
          fontWeight: 900,
          color: COLORS.text,
          marginBottom: 46,
          textAlign: 'center',
        }}
      >
        One request. <span style={{ color: COLORS.warn }}>402.</span>{' '}
        <span style={{ color: COLORS.success }}>Paid.</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 16,
          width: '100%',
          maxWidth: 1680,
        }}
      >
        {RECAP.map(([code, desc], i) => {
          const e = spring({ frame: frame - 14 - i * 7, fps, config: { damping: 200 } });
          const accent =
            i === 2 ? COLORS.warn : i === 6 ? COLORS.success : i === 3 ? COLORS.stripe : COLORS.server;
          return (
            <div
              key={i}
              style={{
                opacity: e,
                transform: `translateY(${(1 - e) * 26}px)`,
                background: COLORS.panel,
                border: `1px solid ${COLORS.panelBorder}`,
                borderTop: `3px solid ${accent}`,
                borderRadius: 14,
                padding: '20px 16px',
                minHeight: 168,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{i + 1}</div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 19,
                  color: COLORS.text,
                  margin: '10px 0',
                  lineHeight: 1.3,
                  fontWeight: 600,
                }}
              >
                {code}
              </div>
              <div style={{ fontSize: 17, color: COLORS.textDim, marginTop: 'auto' }}>{desc}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 54,
          fontSize: 24,
          color: COLORS.textDim,
          fontFamily: FONTS.mono,
          opacity: interpolate(frame, [70, 95], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.ease),
          }),
        }}
      >
        a-ok.shop · /api/mpp/purchase · Stripe SPT
      </div>
    </AbsoluteFill>
  );
};
