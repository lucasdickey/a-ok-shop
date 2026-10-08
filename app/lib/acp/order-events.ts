import { createHmac } from "crypto";
import type Stripe from "stripe";

import { parseItemList } from "@/app/lib/acp/items";
import { orderPermalink } from "@/app/lib/acp/sessions";
import { absoluteUrl } from "@/app/lib/site";

/*
 * ACP order events: tells the agent platform about each paid order
 * (order_create), signed with Merchant-Signature as the ACP webhook spec asks.
 * Off unless ACP_WEBHOOK_URL and ACP_WEBHOOK_SECRET are set. Sent from the
 * Stripe webhook, so a failed delivery is retried with it.
 */

function totals(subtotal: number, shipping: number, total: number) {
  return [
    { type: "items_base_amount", display_text: "Item(s) total", amount: subtotal },
    { type: "subtotal", display_text: "Subtotal", amount: subtotal },
    { type: "fulfillment", display_text: shipping > 0 ? "Standard shipping" : "Free shipping", amount: shipping },
    { type: "total", display_text: "Total", amount: total },
  ];
}

/** The full Order for a paid ACP PaymentIntent (see app/lib/acp/payment.ts for its metadata). */
function orderFromPayment(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata ?? {};
  const sessionId = metadata.checkout_session_id || paymentIntent.id;
  const lines = parseItemList(metadata.items).map(({ itemId, quantity, item }) => ({
    id: `li_${itemId}`,
    title: item
      ? [item.product.title, [item.color, item.size].filter(Boolean).join(" / ")].filter(Boolean).join(" - ")
      : itemId,
    ...(item
      ? {
          product_id: item.product.handle,
          url: absoluteUrl(`/products/${item.product.handle}`),
          unit_price: item.unitAmount,
          subtotal: item.unitAmount * quantity,
        }
      : {}),
    quantity: { ordered: quantity, current: quantity, fulfilled: 0 },
  }));
  const subtotal = Number(metadata.amount_subtotal) || 0;
  const shipping = Number(metadata.amount_shipping) || 0;

  return {
    type: "order",
    id: paymentIntent.id,
    checkout_session_id: sessionId,
    permalink_url: orderPermalink(sessionId),
    // Paid; each item is printed to order and then shipped.
    status: "confirmed",
    line_items: lines,
    totals: totals(subtotal, shipping, paymentIntent.amount),
  };
}

export async function sendOrderCreated(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const url = process.env.ACP_WEBHOOK_URL?.trim();
  const secret = process.env.ACP_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return;

  const order = orderFromPayment(paymentIntent);
  const body = JSON.stringify({ type: "order_create", data: order });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Merchant-Signature": `t=${timestamp},v1=${signature}`,
      "Request-Id": `order_create_${order.checkout_session_id}`,
      Timestamp: new Date(timestamp * 1000).toISOString(),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`ACP order event for ${order.checkout_session_id} failed: ${response.status}`);
  }
  console.log(`[ACP] order_create sent for ${order.checkout_session_id}`);
}
