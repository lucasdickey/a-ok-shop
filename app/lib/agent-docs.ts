import { getAllProducts, getFeaturedProducts, getProductByHandle, getProductsByCategory, type SimpleProduct } from "@/app/lib/catalog";
import { formatDropDate, getChaosMonkeys, getLatestDrop, type ChaosMonkey } from "@/app/lib/chaos-monkeys";
import { absoluteUrl, SITE_URL } from "@/app/lib/site";
import { CLOTHING_SIZES, getClothingSizes, isClothing } from "@/app/lib/sizes";

/*
 * Plain-text versions of the shop for AI agents: /llms.txt, the markdown pages
 * (/index.md, /products/<handle>.md, /chaos-monkeys.md) and the structured data on product
 * pages. Everything is built from the catalog and the Chaos Monkeys manifest, so it stays
 * in step with the site. Like the shop pages, it never lists agent-only items.
 */

const CATEGORIES = [
  { id: "t-shirts", label: "Tees" },
  { id: "hoodies", label: "Hoodies & sweatshirts" },
  { id: "hats", label: "Hats" },
] as const;

export const MARKDOWN_HEADERS = { "Content-Type": "text/markdown; charset=utf-8" };

/** Keeps catalog text from breaking markdown link labels. */
const label = (text: string) => text.replace(/([[\]\\])/g, "\\$1");
const money = (amount: number, currency: string) =>
  `${currency === "USD" ? "$" : ""}${amount.toFixed(2)}${currency === "USD" ? "" : ` ${currency}`}`;

export const productUrl = (handle: string) => `${SITE_URL}/products/${handle}`;
export const productMarkdownUrl = (handle: string) => `${productUrl(handle)}.md`;

/** The facts a shopper picks from: price, sellable colors and sizes. */
export function describeProduct(product: SimpleProduct) {
  const variants = product.variants.edges.map(({ node }) => {
    const option = (name: string) => node.selectedOptions?.find((o) => o.name.toLowerCase() === name)?.value;
    return { id: node.id, color: option("color"), size: option("size"), available: node.availableForSale };
  });
  const colorOption = product.options?.find((o) => o.name.toLowerCase() === "color")?.values ?? [];
  const category = CATEGORIES.find((c) => getProductsByCategory(c.id).some((p) => p.id === product.id));
  return {
    price: Number(product.priceRange.minVariantPrice.amount),
    currency: product.priceRange.minVariantPrice.currencyCode,
    category: category?.label ?? product.productType,
    colors: colorOption.filter((color) => variants.some((v) => v.color === color && v.available)),
    sizes: isClothing(product.productType, product.tags) ? [...getClothingSizes(product)] : [],
    variants,
    images: product.images.edges.map(({ node }) => ({ ...node, url: absoluteUrl(node.url) })),
  };
}

function productLine(product: SimpleProduct) {
  const { price, currency, colors } = describeProduct(product);
  const facts = [money(price, currency), colors.length > 0 ? `${colors.length} color${colors.length > 1 ? "s" : ""}` : null];
  return `- [${label(product.title)}](${productMarkdownUrl(product.handle)}): ${facts.filter(Boolean).join(", ")}`;
}

const HOW_AGENTS_CAN_SHOP = `## For AI agents

- **Markdown pages.** The home page, every product page and the Chaos Monkeys page have a markdown version: add \`.md\` to the address (for example ${SITE_URL}/index.md).
- **In the browser (WebMCP).** In a browser that supports WebMCP, every page offers tools: \`search_products\`, \`get_product\`, \`add_to_cart\`, \`view_cart\`, \`update_cart_item\`, \`begin_checkout\`, \`list_chaos_monkeys\`, \`request_print\` and \`open_page\`. Tees and hoodies need a size; ask the shopper rather than guessing. \`begin_checkout\` opens Stripe's checkout page, where the shopper enters shipping and payment.
- **Product data.** [Product feed (JSON)](${SITE_URL}/api/feed/products.json), [Agentic Commerce Protocol manifest](${SITE_URL}/.well-known/acp.json), [OpenAPI description](${SITE_URL}/.well-known/openapi.json).`;

/** /llms.txt: what the shop is, and where everything is. */
export function buildLlmsTxt(): string {
  const sections = CATEGORIES.map((category) => {
    const products = getProductsByCategory(category.id);
    return products.length > 0 ? `## ${category.label}\n\n${products.map(productLine).join("\n")}` : null;
  }).filter(Boolean);

  return `# A-OK

> A-OK (Apes On Keys) sells nerd streetwear "for the confidently incorrect": print-on-demand tees and hoodies, plus Chaos Monkeys, a daily series of AI-made ape posters that shoppers can ask us to print. Prices are in US dollars, checkout runs on Stripe, and orders ship to the US and Canada.

Every tee and hoodie is printed when it's ordered, in sizes ${CLOTHING_SIZES.join(", ")}, in the colors listed on its page. Because each item is made to order, returns are for defects and wrong items only, reported within 7 days of delivery.

${HOW_AGENTS_CAN_SHOP}

## Pages

- [Home](${SITE_URL}/index.md): what A-OK is, featured products and the latest Chaos Monkeys
- [Chaos Monkeys](${SITE_URL}/chaos-monkeys.md): every monkey so far, newest first
- [Shop](${SITE_URL}/products): every product

${sections.join("\n\n")}

## Optional

- [Returns policy](${SITE_URL}/returns)
- [Terms](${SITE_URL}/terms)
- [Privacy](${SITE_URL}/privacy)
- [The game](${SITE_URL}/game): a Pac-Man and Snake mashup; winners get a discount code
- [Art archive](${SITE_URL}/gallery)
`;
}

function monkeyBlock(monkey: ChaosMonkey) {
  return `### #${monkey.id}: ${monkey.title}

${formatDropDate(monkey.date)}. "${monkey.slogan}"

${monkey.joke}

![${label(monkey.alt)}](${absoluteUrl(monkey.image)})

Page: ${SITE_URL}/chaos-monkeys#n${monkey.id}`;
}

/** /index.md: the home page. */
export function buildHomeMarkdown(): string {
  const featured = getFeaturedProducts();
  const latest = getLatestDrop();
  return `# A-OK: Good taste.

For the confidently incorrect. The creatively misaligned.

Apes On Keys makes clothes for humans who make things with machines. Bring your strange ideas. Keep the interesting mistakes.

Web page: ${SITE_URL}/

## Featured

${featured.map(productLine).join("\n")}

All products: ${SITE_URL}/llms.txt

## Latest Chaos Monkeys${latest[0] ? ` (${formatDropDate(latest[0].date)})` : ""}

A new batch of AI-made apes every day. Shoppers can ask us to print one as a tee.

${latest.map(monkeyBlock).join("\n\n")}

All of them: ${SITE_URL}/chaos-monkeys.md

${HOW_AGENTS_CAN_SHOP}
`;
}

/** /chaos-monkeys.md: every monkey, newest first. */
export function buildChaosMonkeysMarkdown(): string {
  const monkeys = getChaosMonkeys();
  return `# Chaos Monkeys

A daily series of AI-made ape posters from A-OK. ${monkeys.length} so far, newest first. Shoppers can ask us to print any of them as a tee with the "Print this" button on the page, or the \`request_print\` tool in a WebMCP browser.

Web page: ${SITE_URL}/chaos-monkeys

${monkeys.map(monkeyBlock).join("\n\n")}
`;
}

/** /products/<handle>.md: one product. Returns null for unknown or agent-only products. */
export function buildProductMarkdown(handle: string): string | null {
  const product = getProductByHandle(handle);
  if (!product || !getAllProducts().some((p) => p.id === product.id)) return null;
  const { price, currency, category, colors, sizes, variants, images } = describeProduct(product);

  const facts = [
    `- Price: ${money(price, currency)}`,
    `- Category: ${category}`,
    colors.length > 0 ? `- Colors: ${colors.join(", ")}` : null,
    sizes.length > 0 ? `- Sizes: ${sizes.join(", ")} (printed to order, so every size is available)` : null,
    `- Web page: ${productUrl(product.handle)}`,
  ].filter(Boolean);

  const toolExample = JSON.stringify({
    handle: product.handle,
    ...(colors[0] ? { color: colors[0] } : {}),
    ...(sizes.length > 0 ? { size: "<shopper's size>" } : {}),
    quantity: 1,
  });

  return `# ${product.title}

${facts.join("\n")}

${product.description.trim()}

## Photos

${images.map((image) => `![${label(image.altText || product.title)}](${image.url})${image.color ? ` (${image.color})` : ""}`).join("\n")}

## How to buy

- On the web page: pick a color${sizes.length > 0 ? " and size" : ""}, add it to the cart, then check out with Stripe.
- In a WebMCP browser: \`add_to_cart\` with \`${toolExample}\`, then \`begin_checkout\`.
- Through the [ACP checkout](${SITE_URL}/.well-known/openapi.json): POST ${SITE_URL}/api/acp/checkout with \`{"cart":{"items":[{"variantId":"<a variant ID below>"${sizes.length > 0 ? ',"size":"<shopper\'s size>"' : ""},"quantity":1}]}}\`, then send the shopper to the returned \`checkout_session.url\`.

## Variants

| Variant ID | Color | Size | Available |
| --- | --- | --- | --- |
${variants.map((v) => `| ${v.id} | ${v.color ?? ""} | ${v.size ?? (sizes.length > 0 ? "any" : "")} | ${v.available ? "yes" : "no"} |`).join("\n")}
`;
}

/** schema.org Product data for a product page, so search engines and agents read the price and stock. */
export function buildProductJsonLd(product: SimpleProduct) {
  const { price, currency, colors, images } = describeProduct(product);
  const available = product.variants.edges.some(({ node }) => node.availableForSale);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description.slice(0, 5000),
    url: productUrl(product.handle),
    image: images.slice(0, 10).map((image) => image.url),
    brand: { "@type": "Brand", name: "A-OK" },
    ...(colors.length > 0 ? { color: colors.join(", ") } : {}),
    offers: {
      "@type": "Offer",
      url: productUrl(product.handle),
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
