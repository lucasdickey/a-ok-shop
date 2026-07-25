/**
 * Order notification emails.
 *
 * Two things go out for every paid order:
 *   1. A confirmation to the customer.
 *   2. An alert to the shop operator, so no order sits unnoticed.
 *
 * Transient delivery failures throw so the webhook can return a non-2xx and let
 * Stripe retry. Missing configuration does not throw — retrying cannot fix it —
 * but is logged loudly.
 */

export type OrderItem = {
  description: string;
  quantity: number;
  size?: string;
  color?: string;
  amountTotal?: number | null;
};

export type OrderAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type OrderNotification = {
  orderId: string;
  source: string;
  customerEmail?: string | null;
  customerName?: string | null;
  shippingName?: string | null;
  shippingAddress?: OrderAddress | null;
  items: OrderItem[];
  amountTotal?: number | null;
  amountSubtotal?: number | null;
  amountTax?: number | null;
  amountShipping?: number | null;
  currency?: string | null;
};

// Thrown when Resend is reachable but the send failed — worth a Stripe retry.
export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export function formatAmount(cents?: number | null, currency = "usd"): string {
  const value = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}

function describeItem(item: OrderItem): string {
  const details = [
    item.size ? `Size: ${item.size}` : null,
    item.color ? `Color: ${item.color}` : null,
  ].filter(Boolean);

  const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
  return `${item.description} x${item.quantity}${suffix}`;
}

export function formatAddress(address?: OrderAddress | null): string {
  if (!address) {
    return "No shipping address on file";
  }

  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function storeNameFor(source: string): string {
  return source === "monthly-deals" ? "A-OK Monthly Deal" : "A-OK Shop";
}

function customerEmailText(order: OrderNotification, storeName: string): string {
  const currency = order.currency || "usd";
  const lines = [
    `Thanks for your ${storeName} order.`,
    "",
    `Order ID: ${order.orderId}`,
  ];

  if (order.items.length > 0) {
    lines.push("", "Items:", ...order.items.map((item) => `- ${describeItem(item)}`));
  }

  lines.push("", `Subtotal: ${formatAmount(order.amountSubtotal, currency)}`);

  if (order.amountShipping) {
    lines.push(`Shipping: ${formatAmount(order.amountShipping, currency)}`);
  }
  if (order.amountTax) {
    lines.push(`Tax: ${formatAmount(order.amountTax, currency)}`);
  }

  lines.push(`Total: ${formatAmount(order.amountTotal, currency)}`);

  if (order.shippingAddress) {
    lines.push("", "Shipping to:", formatAddress(order.shippingAddress));
  }

  lines.push("", "Your items will ship within 3-5 business days.");

  return lines.join("\n");
}

function customerEmailHtml(order: OrderNotification, storeName: string): string {
  const currency = order.currency || "usd";
  const itemRows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;">${escapeHtml(describeItem(item))}</td>` +
        `<td style="padding:6px 0;text-align:right;">${formatAmount(
          item.amountTotal,
          currency
        )}</td></tr>`
    )
    .join("");

  const totalRow = (label: string, amount?: number | null, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;" : ""}">${label}</td>` +
    `<td style="padding:4px 0;text-align:right;${bold ? "font-weight:bold;" : ""}">` +
    `${formatAmount(amount, currency)}</td></tr>`;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5;max-width:560px;">
      <h1 style="font-size:22px;margin-bottom:4px;">Thanks for your ${escapeHtml(storeName)} order.</h1>
      <p style="color:#555;margin-top:0;">Order ID: ${escapeHtml(order.orderId)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${itemRows}
        <tr><td colspan="2"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;" /></td></tr>
        ${totalRow("Subtotal", order.amountSubtotal)}
        ${order.amountShipping ? totalRow("Shipping", order.amountShipping) : ""}
        ${order.amountTax ? totalRow("Tax", order.amountTax) : ""}
        ${totalRow("Total", order.amountTotal, true)}
      </table>
      ${
        order.shippingAddress
          ? `<p style="margin:0 0 4px;"><strong>Shipping to</strong></p>
             <p style="margin:0;white-space:pre-line;color:#555;">${escapeHtml(
               formatAddress(order.shippingAddress)
             )}</p>`
          : ""
      }
      <p style="margin-top:20px;">Your items will ship within 3-5 business days.</p>
    </div>
  `;
}

function operatorEmailText(order: OrderNotification): string {
  const currency = order.currency || "usd";

  return [
    `New paid order — ${storeNameFor(order.source)}`,
    "",
    `Order ID: ${order.orderId}`,
    `Source: ${order.source}`,
    `Customer: ${order.customerName || "n/a"} <${order.customerEmail || "no email"}>`,
    `Total: ${formatAmount(order.amountTotal, currency)}`,
    "",
    "Items to fulfill:",
    ...order.items.map((item) => `- ${describeItem(item)}`),
    "",
    `Ship to: ${order.shippingName || order.customerName || "n/a"}`,
    formatAddress(order.shippingAddress),
  ].join("\n");
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      `[orders] RESEND_API_KEY is not set — "${params.subject}" to ${params.to} was NOT sent`
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM || "A-OK Shop <orders@a-ok.shop>",
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.html ? { html: params.html } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = `Resend returned ${response.status} for "${params.subject}": ${body}`;

    // 4xx (other than rate limiting) means the request itself is wrong — a bad
    // address, an unverified sender. Retrying cannot fix it, so log loudly
    // rather than making Stripe redeliver the event for three days.
    const isPermanent =
      response.status >= 400 && response.status < 500 && response.status !== 429;

    if (isPermanent) {
      console.error(`[orders] Permanent email failure, not retrying — ${message}`);
      return;
    }

    throw new EmailDeliveryError(message);
  }
}

/**
 * Send the customer confirmation and the operator alert.
 *
 * The operator alert is attempted even if the customer email fails, so a bad
 * customer address never hides an order from fulfillment.
 */
export async function sendOrderNotifications(
  order: OrderNotification
): Promise<void> {
  const storeName = storeNameFor(order.source);
  const failures: string[] = [];

  if (order.customerEmail) {
    try {
      await sendEmail({
        to: order.customerEmail,
        subject: `Your ${storeName} Order Confirmation`,
        text: customerEmailText(order, storeName),
        html: customerEmailHtml(order, storeName),
      });
    } catch (error) {
      failures.push(`customer confirmation: ${(error as Error).message}`);
    }
  } else {
    console.error(`[orders] Order ${order.orderId} has no customer email`);
  }

  const operatorEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  if (operatorEmail) {
    try {
      await sendEmail({
        to: operatorEmail,
        subject: `[Fulfill] New order ${order.orderId} — ${formatAmount(
          order.amountTotal,
          order.currency || "usd"
        )}`,
        text: operatorEmailText(order),
      });
    } catch (error) {
      failures.push(`operator alert: ${(error as Error).message}`);
    }
  } else {
    console.warn(
      "[orders] ORDER_NOTIFICATION_EMAIL is not set — no fulfillment alert was sent"
    );
  }

  if (failures.length > 0) {
    throw new EmailDeliveryError(failures.join("; "));
  }
}
