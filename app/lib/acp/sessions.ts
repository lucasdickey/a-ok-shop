import { randomUUID } from "crypto";

import { findItem, type AcpItem } from "@/app/lib/acp/items";
import { ACP_VERSION, AcpError, invalid } from "@/app/lib/acp/protocol";
import { getJson, setJson } from "@/app/lib/acp/store";
import { absoluteUrl } from "@/app/lib/site";
import { isClothing } from "@/app/lib/sizes";
import { MAX_QUANTITY_PER_ITEM, SHIPPING_COUNTRIES, shippingCentsFor } from "@/app/lib/store-checkout";

/*
 * ACP checkout sessions (spec 2026-04-17). The stored session keeps only what
 * the agent sent; prices, shipping, status and messages are worked out from
 * the catalog on every response, so the agent always sees current totals.
 */

const OPEN_TTL_SECONDS = 60 * 60 * 24;
const CLOSED_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_LINE_ITEMS = 20;
const SHIPPING_OPTION_ID = "standard";
export const PAYMENT_HANDLER_ID = "card_tokenized";

export type Address = {
  name: string;
  line_one: string;
  line_two?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

export type Buyer = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone_number?: string;
};

export type FulfillmentDetails = {
  name?: string;
  phone_number?: string;
  email?: string;
  address?: Address;
};

export type SessionOrder = { id: string; paymentIntentId: string; permalinkUrl: string };

export type StoredSession = {
  id: string;
  /** The caller that created it; other callers get a 404. */
  owner: string;
  state: "open" | "completed" | "canceled";
  lineItems: Array<{ id: string; quantity: number }>;
  buyer?: Buyer;
  fulfillmentDetails?: FulfillmentDetails;
  orderNotes?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  order?: SessionOrder;
  /** Why the last payment attempt failed; shown until the session changes. */
  paymentError?: string;
};

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldName(param: string): string {
  return param.split(".").pop() ?? param;
}

function text(
  value: unknown,
  param: string,
  { required = false, max = 200 }: { required?: boolean; max?: number } = {}
): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw invalid("missing", `${fieldName(param)} is required`, param);
    return undefined;
  }
  if (typeof value !== "string") throw invalid("invalid", `${fieldName(param)} must be a string`, param);
  const trimmed = value.trim();
  if (trimmed.length > max) throw invalid("invalid", `${fieldName(param)} must be at most ${max} characters`, param);
  if (!trimmed && required) throw invalid("missing", `${fieldName(param)} is required`, param);
  return trimmed || undefined;
}

function email(value: unknown, param: string, required: boolean): string | undefined {
  const address = text(value, param, { required, max: 254 });
  if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw invalid("invalid", `${fieldName(param)} must be an email address`, param);
  }
  return address;
}

function parseAddress(raw: unknown, param: string): Address {
  if (!isObject(raw)) throw invalid("invalid", "address must be an object", param);
  const country = text(raw.country, `${param}.country`, { required: true, max: 2 })!.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw invalid("invalid", "country must be a two-letter code such as US", `${param}.country`);
  }
  return {
    name: text(raw.name, `${param}.name`, { required: true })!,
    line_one: text(raw.line_one, `${param}.line_one`, { required: true })!,
    line_two: text(raw.line_two, `${param}.line_two`),
    city: text(raw.city, `${param}.city`, { required: true })!,
    state: text(raw.state, `${param}.state`, { required: true })!,
    country,
    postal_code: text(raw.postal_code, `${param}.postal_code`, { required: true, max: 20 })!,
  };
}

function parseBuyer(raw: unknown, param: string): Buyer {
  if (!isObject(raw)) throw invalid("invalid", "buyer must be an object", param);
  return {
    first_name: text(raw.first_name, `${param}.first_name`),
    last_name: text(raw.last_name, `${param}.last_name`),
    full_name: text(raw.full_name, `${param}.full_name`),
    email: email(raw.email, `${param}.email`, true)!,
    phone_number: text(raw.phone_number, `${param}.phone_number`, { max: 40 }),
  };
}

function parseFulfillmentDetails(raw: unknown, param: string): FulfillmentDetails {
  if (!isObject(raw)) throw invalid("invalid", "fulfillment_details must be an object", param);
  return {
    name: text(raw.name, `${param}.name`),
    phone_number: text(raw.phone_number, `${param}.phone_number`, { max: 40 }),
    email: email(raw.email, `${param}.email`, false),
    address:
      raw.address === undefined || raw.address === null
        ? undefined
        : parseAddress(raw.address, `${param}.address`),
  };
}

/** Checks the requested items against the catalog and merges repeated IDs. */
function parseLineItems(raw: unknown, param: string): StoredSession["lineItems"] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw invalid("missing", "line_items must list at least one item", param);
  }
  if (raw.length > MAX_LINE_ITEMS) {
    throw invalid("invalid", `A checkout can have at most ${MAX_LINE_ITEMS} line items`, param);
  }

  const merged = new Map<string, number>();
  raw.forEach((entry, index) => {
    const at = `${param}[${index}]`;
    if (!isObject(entry)) throw invalid("invalid", "Each line item must be an object", at);
    const id = text(entry.id, `${at}.id`, { required: true, max: 64 })!;
    // The 2026-04-17 Item schema has no quantity; agents following the RFC send one.
    const quantity = entry.quantity ?? 1;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      throw invalid("invalid", "quantity must be a whole number of at least 1", `${at}.quantity`);
    }

    const found = findItem(id);
    if (!found) {
      throw invalid(
        "invalid_item_id",
        `The item ID '${id}' does not exist. Every color and size has its own ID in ${absoluteUrl("/api/acp/products")}`,
        `${at}.id`
      );
    }
    if ("error" in found) throw invalid(found.code, found.error, `${at}.id`);

    const total = (merged.get(id) ?? 0) + quantity;
    if (total > MAX_QUANTITY_PER_ITEM) {
      throw invalid("invalid", `At most ${MAX_QUANTITY_PER_ITEM} of one item per order`, `${at}.quantity`);
    }
    merged.set(id, total);
  });

  return Array.from(merged, ([id, quantity]) => ({ id, quantity }));
}

/**
 * Applies a create or update body. Absent fields stay as they are; `null`
 * clears a field (spec §6.2).
 */
function applyRequest(session: StoredSession, body: Json, creating: boolean) {
  // `items` is the name the older RFC examples use.
  const itemsKey = body.line_items === undefined && body.items !== undefined ? "items" : "line_items";
  if (creating || body[itemsKey] !== undefined) {
    session.lineItems = parseLineItems(body[itemsKey], `$.${itemsKey}`);
  }

  if (creating) {
    const currency = text(body.currency, "$.currency", { max: 3 });
    if (currency && currency.toLowerCase() !== "usd") {
      throw invalid("invalid", "This shop sells in usd only", "$.currency");
    }
    session.locale = text(body.locale, "$.locale", { max: 35 });
  }

  if ("buyer" in body) {
    session.buyer = body.buyer === null ? undefined : parseBuyer(body.buyer, "$.buyer");
  }
  if ("fulfillment_details" in body) {
    session.fulfillmentDetails =
      body.fulfillment_details === null
        ? undefined
        : parseFulfillmentDetails(body.fulfillment_details, "$.fulfillment_details");
  }
  if ("order_notes" in body) {
    session.orderNotes =
      body.order_notes === null ? undefined : text(body.order_notes, "$.order_notes", { max: 500 });
  }

  const selected = body.selected_fulfillment_options;
  if (selected !== undefined && selected !== null) {
    if (!Array.isArray(selected)) {
      throw invalid("invalid", "selected_fulfillment_options must be a list", "$.selected_fulfillment_options");
    }
    selected.forEach((option, index) => {
      if (!isObject(option) || option.option_id !== SHIPPING_OPTION_ID) {
        throw invalid(
          "invalid",
          `The only fulfillment option is '${SHIPPING_OPTION_ID}'`,
          `$.selected_fulfillment_options[${index}].option_id`
        );
      }
    });
  }

  session.paymentError = undefined;
  session.updatedAt = new Date().toISOString();
}

/** Where the buyer can see the order: the store's order confirmation page. */
export function orderPermalink(sessionId: string): string {
  return absoluteUrl(`/checkout/success?session_id=${sessionId}`);
}

function sessionKey(id: string) {
  return `acp:session:${id}`;
}

export function createSession(owner: string, body: Json): StoredSession {
  const now = new Date();
  const session: StoredSession = {
    id: `cs_${randomUUID().replace(/-/g, "")}`,
    owner,
    state: "open",
    lineItems: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OPEN_TTL_SECONDS * 1000).toISOString(),
  };
  applyRequest(session, body, true);
  return session;
}

export function updateSession(session: StoredSession, body: Json) {
  assertOpen(session);
  applyRequest(session, body, false);
}

/** The buyer and order notes may also arrive with the payment (the complete request). */
export function applyCompletion(session: StoredSession, body: Json) {
  if (body.buyer !== undefined && body.buyer !== null) {
    session.buyer = parseBuyer(body.buyer, "$.buyer");
  }
  if (body.order_notes !== undefined && body.order_notes !== null) {
    session.orderNotes = text(body.order_notes, "$.order_notes", { max: 500 });
  }
}

export function assertOpen(session: StoredSession) {
  if (session.state !== "open") {
    throw invalid("invalid_state", `This checkout session is ${session.state} and can't be changed`);
  }
}

export async function saveSession(session: StoredSession) {
  const ttl =
    session.state === "open"
      ? Math.max(60, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000))
      : CLOSED_TTL_SECONDS;
  await setJson(sessionKey(session.id), session, ttl);
}

/** Loads a session for its owner; anyone else gets a 404, as if it didn't exist. */
export async function loadSession(id: string, owner: string): Promise<StoredSession> {
  const session = /^cs_[a-f0-9]{32}$/.test(id) ? await getJson<StoredSession>(sessionKey(id)) : null;
  if (!session || session.owner !== owner) {
    throw new AcpError(404, "invalid_request", "not_found", "Checkout session not found");
  }
  return session;
}

type Message = {
  type: "info" | "error";
  code?: string;
  param?: string;
  resolution?: "recoverable" | "requires_buyer_input" | "requires_buyer_review";
  content_type: "plain";
  content: string;
};

function problem(code: string, content: string, param: string | undefined, resolution: Message["resolution"]): Message {
  return { type: "error", code, ...(param ? { param } : {}), resolution, content_type: "plain", content };
}

export type PricedLine = { item: AcpItem; quantity: number };

export type Pricing = {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  /** Problems that keep the session from being paid. */
  problems: Message[];
};

/** Prices the session from the catalog and lists what still needs fixing. */
export function priceSession(session: StoredSession): Pricing {
  const lines: PricedLine[] = [];
  const problems: Message[] = [];

  session.lineItems.forEach(({ id, quantity }, index) => {
    const found = findItem(id);
    if (!found || "error" in found) {
      problems.push(problem("invalid", "This item is no longer sold. Remove it to continue.", `$.line_items[${index}]`, "recoverable"));
      return;
    }
    if (!found.available) {
      problems.push(
        problem(
          "out_of_stock",
          `${found.product.title}${found.color ? ` in ${found.color}` : ""} is sold out. Please choose a different color.`,
          `$.line_items[${index}]`,
          "requires_buyer_input"
        )
      );
    }
    lines.push({ item: found, quantity });
  });

  const address = session.fulfillmentDetails?.address;
  if (!address) {
    problems.push(problem("missing", "Add a shipping address in the US or Canada.", "$.fulfillment_details.address", "requires_buyer_input"));
  } else if (!(SHIPPING_COUNTRIES as readonly string[]).includes(address.country)) {
    problems.push(problem("region_restricted", "A-OK ships to the US and Canada only.", "$.fulfillment_details.address.country", "requires_buyer_input"));
  }

  if (paymentHandlers().length === 0) {
    problems.push(problem("unsupported", "This shop isn't taking agent payments yet.", undefined, "requires_buyer_review"));
  }

  const subtotal = lines.reduce((sum, line) => sum + line.item.unitAmount * line.quantity, 0);
  const shipping = shippingCentsFor(subtotal);
  return { lines, subtotal, shipping, total: subtotal + shipping, problems };
}

/** The card handler: the agent sends a Stripe shared payment token scoped to this shop's Stripe profile. */
function paymentHandlers() {
  const networkId = process.env.STRIPE_NETWORK_ID?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!networkId || !secretKey) return [];
  return [
    {
      id: PAYMENT_HANDLER_ID,
      name: "dev.acp.tokenized.card",
      display_name: "Card",
      version: "2026-01-22",
      spec: "https://acp.dev/handlers/tokenized.card",
      requires_delegate_payment: true,
      requires_pci_compliance: false,
      psp: "stripe",
      config_schema: "https://acp.dev/schemas/handlers/tokenized.card/config.json",
      instrument_schemas: ["https://acp.dev/schemas/handlers/tokenized.card/instrument.json"],
      config: {
        merchant_id: networkId,
        psp: "stripe",
        accepted_brands: ["visa", "mastercard", "amex", "discover"],
        accepted_funding_types: ["credit", "debit"],
        supports_3ds: false,
        // Secret (sk_) and restricted (rk_) keys both mark live mode with "_live_".
        environment: /^(sk|rk)_live_/.test(secretKey) ? "production" : "sandbox",
      },
    },
  ];
}

function money(type: string, display_text: string, amount: number) {
  return { type, display_text, amount };
}

function renderLine({ item, quantity }: PricedLine) {
  const options = [
    ...(item.color ? [{ name: "Color", value: item.color }] : []),
    ...(item.size ? [{ name: "Size", value: item.size }] : []),
  ];
  const images = item.product.images.edges.map((edge) => edge.node);
  const image = images.find((candidate) => candidate.color === item.color) ?? images[0];
  const amount = item.unitAmount * quantity;

  return {
    id: `li_${item.id}`,
    item: { id: item.id },
    quantity,
    name: item.product.title,
    ...(options.length > 0 ? { description: options.map((option) => option.value).join(" / ") } : {}),
    ...(image ? { images: [absoluteUrl(image.url)] } : {}),
    unit_amount: item.unitAmount,
    ...(isClothing(item.product.productType, item.product.tags)
      ? {
          disclosures: [
            {
              type: "disclaimer",
              content_type: "plain",
              content: "Printed when you order. Returns are for defects and wrong items only, reported within 7 days of delivery.",
            },
          ],
        }
      : {}),
    // Agents show custom_attributes; variant_options is the structured form of the same choice.
    custom_attributes: options.map((option) => ({ display_name: option.name, value: option.value })),
    variant_options: options,
    product_id: item.product.handle,
    variant_id: item.id,
    ...(item.variant.sku ? { sku: item.variant.sku } : {}),
    ...(item.product.productType ? { category: item.product.productType } : {}),
    availability_status: item.available ? "in_stock" : "out_of_stock",
    max_quantity_per_order: MAX_QUANTITY_PER_ITEM,
    totals: [
      money("items_base_amount", "Base amount", amount),
      money("subtotal", "Subtotal", amount),
      money("total", "Total", amount),
    ],
  };
}

function status(session: StoredSession, pricing: Pricing) {
  if (session.state !== "open") return session.state;
  return pricing.problems.length === 0 ? "ready_for_payment" : "not_ready_for_payment";
}

/** The full, authoritative session the agent sees on every response. */
export function renderSession(session: StoredSession) {
  const pricing = priceSession(session);
  const lineItems = pricing.lines.map(renderLine);
  const shippingTitle = pricing.shipping > 0 ? "Standard shipping" : "Free shipping";

  let messages: Message[] = [];
  if (session.state === "canceled") {
    messages = [{ type: "info", content_type: "plain", content: "Checkout session has been canceled." }];
  } else if (session.state === "open") {
    messages = [
      ...pricing.problems,
      ...(session.paymentError
        ? [problem("payment_declined", session.paymentError, "$.payment_data", "requires_buyer_input")]
        : []),
    ];
  }

  return {
    id: session.id,
    protocol: { version: ACP_VERSION },
    capabilities: {
      payment: { handlers: session.state === "open" ? paymentHandlers() : [] },
      interventions: { supported: [], required: [], enforcement: "optional" },
    },
    ...(session.buyer ? { buyer: session.buyer } : {}),
    status: status(session, pricing),
    currency: "usd",
    ...(session.locale ? { locale: session.locale } : {}),
    line_items: lineItems,
    ...(session.fulfillmentDetails ? { fulfillment_details: session.fulfillmentDetails } : {}),
    fulfillment_options: [
      {
        type: "shipping",
        id: SHIPPING_OPTION_ID,
        title: shippingTitle,
        description: "Printed to order and shipped within 3-5 business days. Free shipping from $50.",
        totals: [money("total", "Shipping", pricing.shipping)],
      },
    ],
    selected_fulfillment_options: [
      { type: "shipping", option_id: SHIPPING_OPTION_ID, item_ids: lineItems.map((line) => line.item.id) },
    ],
    totals: [
      money("items_base_amount", "Item(s) total", pricing.subtotal),
      money("subtotal", "Subtotal", pricing.subtotal),
      money("fulfillment", shippingTitle, pricing.shipping),
      money("total", "Total", pricing.total),
    ],
    messages,
    links: [
      { type: "terms_of_use", url: absoluteUrl("/terms") },
      { type: "privacy_policy", url: absoluteUrl("/privacy") },
      { type: "return_policy", url: absoluteUrl("/returns") },
    ],
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    expires_at: session.expiresAt,
    ...(session.order
      ? {
          order: {
            id: session.order.id,
            checkout_session_id: session.id,
            permalink_url: session.order.permalinkUrl,
          },
        }
      : {}),
  };
}
