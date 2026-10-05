"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MAX_QUANTITY_PER_ITEM, useCart, type CartItem } from "@/app/components/cart/CartProvider";
import { getPrintRequests, setPrintRequest } from "@/app/components/PrintRequestButton";

/*
 * WebMCP: the shop's own actions, offered as tools to AI agents running in the visitor's browser
 * (https://webmachinelearning.github.io/webmcp/). Browsers without WebMCP skip all of this.
 *
 * Tools act through the same code as the page: the cart is the site's cart, checkout goes through
 * the same route as the cart's button, and "Print this" uses the buttons' own store. Checkout is
 * marked consequential, and payment still happens on Stripe's page with the shopper.
 */

type StoreProduct = {
  handle: string;
  title: string;
  url: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  image: string | null;
  colors: Array<{ name: string; swatch: string | null; image: string | null }>;
  sizes: string[];
  variants: Array<{ id: string; color?: string; size?: string; available: boolean }>;
};
type StoreMonkey = { id: string; title: string; slogan: string; joke: string; date: string; image: string; url: string };
type Storefront = { products: StoreProduct[]; chaosMonkeys: StoreMonkey[] };

type ToolInput = Record<string, unknown>;
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  execute: (input: ToolInput) => Promise<unknown>;
};
type ModelContext = {
  registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => unknown;
  unregisterTool?: (name: string) => unknown;
};

let storefront: Promise<Storefront> | null = null;
function loadStorefront() {
  storefront ??= fetch("/api/storefront")
    .then((response) => {
      if (!response.ok) throw new Error("The catalog didn't load. Try again.");
      return response.json() as Promise<Storefront>;
    })
    .catch((error) => {
      storefront = null; // let the next call retry
      throw error;
    });
  return storefront;
}

const absolute = (path: string | null) => (path ? new URL(path, window.location.origin).toString() : null);
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function summary(product: StoreProduct) {
  return {
    handle: product.handle,
    title: product.title,
    category: product.category,
    price: product.price,
    currency: product.currency,
    colors: product.colors.map((color) => color.name),
    sizes: product.sizes,
    url: absolute(product.url),
  };
}

function cartView(cart: CartItem[]) {
  const items = cart.map((item) => ({
    line_id: item.id,
    title: item.title,
    color: item.color ?? null,
    size: item.size ?? null,
    quantity: item.quantity,
    unit_price: item.price,
    line_total: Math.round(item.price * item.quantity * 100) / 100,
  }));
  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  return { items, item_count: cart.reduce((n, item) => n + item.quantity, 0), subtotal, currency: "USD", note: "Shipping and taxes are calculated at checkout." };
}

const PAGES: Record<string, string> = {
  home: "/",
  shop: "/products",
  tees: "/products?category=t-shirts",
  hoodies: "/products?category=hoodies",
  "chaos-monkeys": "/chaos-monkeys",
  game: "/game",
};

export default function WebMcpTools() {
  const cartApi = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Tools are registered once; these refs give them the current cart, router and page.
  const live = useRef({ cartApi, router, pathname });
  live.current = { cartApi, router, pathname };

  useEffect(() => {
    const context: ModelContext | undefined =
      (document as unknown as { modelContext?: ModelContext }).modelContext ??
      (navigator as unknown as { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;

    const findProduct = async (handle: unknown) => {
      const { products } = await loadStorefront();
      const key = String(handle ?? "");
      return products.find((p) => p.handle === key) ?? products.find((p) => sameText(p.title, key)) ?? null;
    };

    const tools: Tool[] = [
      {
        name: "search_products",
        title: "Search the shop",
        description:
          "Search A-OK's tees and hoodies. Matches words in the name, description, category or colors. Leave query empty to list everything. Returns handles to use with get_product and add_to_cart.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Words to look for, e.g. 'hallucination' or 'navy'." },
            category: { type: "string", enum: ["all", "tees", "hoodies", "hats"], description: "Limit to one category." },
            limit: { type: "integer", minimum: 1, maximum: 50, description: "Most results to return (default 10)." },
          },
        },
        annotations: { readOnlyHint: true },
        execute: async ({ query, category, limit }) => {
          const { products } = await loadStorefront();
          const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
          const wanted = { tees: "Tees", hoodies: "Hoodies", hats: "Hats" }[String(category ?? "all")];
          const matches = products.filter((p) => {
            if (wanted && p.category !== wanted) return false;
            const text = [p.title, p.description, p.category, ...p.colors.map((c) => c.name)].join(" ").toLowerCase();
            return words.every((word) => text.includes(word));
          });
          const max = Math.min(50, Math.max(1, Number(limit) || 10));
          return { total: matches.length, results: matches.slice(0, max).map(summary) };
        },
      },
      {
        name: "get_product",
        title: "Product details",
        description:
          "Full details for one product: description, price, the colors and sizes it's sold in, and a photo for each color.",
        inputSchema: {
          type: "object",
          properties: { handle: { type: "string", description: "The product's handle from search_products." } },
          required: ["handle"],
        },
        annotations: { readOnlyHint: true },
        execute: async ({ handle }) => {
          const product = await findProduct(handle);
          if (!product) return { error: `No product with handle "${String(handle)}". Use search_products to find one.` };
          return {
            ...summary(product),
            description: product.description,
            colors: product.colors.map((c) => ({ name: c.name, swatch: c.swatch, photo: absolute(c.image) })),
            photo: absolute(product.image),
            printed_on_demand: product.sizes.length > 0,
          };
        },
      },
      {
        name: "add_to_cart",
        title: "Add to cart",
        description:
          "Add a product to the shopper's cart in a chosen color and size. Color and size must be ones the product is sold in (see get_product); for tees and hoodies a size is required, so ask the shopper rather than guessing.",
        inputSchema: {
          type: "object",
          properties: {
            handle: { type: "string", description: "The product's handle." },
            color: { type: "string", description: "One of the product's colors. Optional when it has only one." },
            size: { type: "string", description: "One of XS, S, M, L, XL, 2XL for tees and hoodies." },
            quantity: { type: "integer", minimum: 1, maximum: MAX_QUANTITY_PER_ITEM, description: "How many (default 1)." },
          },
          required: ["handle"],
        },
        execute: async ({ handle, color, size, quantity }) => {
          const product = await findProduct(handle);
          if (!product) return { error: `No product with handle "${String(handle)}". Use search_products to find one.` };

          const colorNames = product.colors.map((c) => c.name);
          let chosenColor: string | undefined;
          if (colorNames.length > 0) {
            chosenColor = color ? colorNames.find((c) => sameText(c, String(color))) : colorNames.length === 1 ? colorNames[0] : undefined;
            if (!chosenColor) return { error: color ? `"${String(color)}" isn't sold for this product.` : "Choose a color.", colors: colorNames };
          }

          let chosenSize: string | undefined;
          if (product.sizes.length > 0) {
            chosenSize = size ? product.sizes.find((s) => sameText(s, String(size))) : undefined;
            if (!chosenSize) return { error: size ? `"${String(size)}" isn't a size we print.` : "Choose a size.", sizes: product.sizes };
          }

          const count = quantity === undefined ? 1 : Number(quantity);
          if (!Number.isInteger(count) || count < 1 || count > MAX_QUANTITY_PER_ITEM) {
            return { error: `Quantity must be a whole number from 1 to ${MAX_QUANTITY_PER_ITEM}.` };
          }

          // Same variant choice as the product page: match the color, prefer the chosen size.
          const forColor = product.variants.filter((v) => v.available && (!chosenColor || v.color === chosenColor));
          const variant = forColor.find((v) => v.size === chosenSize) ?? forColor[0];
          if (!variant) return { error: "That combination isn't available right now." };

          const item: CartItem = {
            id: [variant.id, chosenSize, chosenColor].filter(Boolean).join(":"),
            title: product.title + (chosenSize ? ` - ${chosenSize}` : "") + (chosenColor ? ` - ${chosenColor}` : ""),
            price: product.price,
            quantity: count,
            image: product.colors.find((c) => c.name === chosenColor)?.image ?? product.image ?? "/product-placeholder.jpg",
            variantId: variant.id,
            size: chosenSize,
            color: chosenColor,
          };
          live.current.cartApi.addToCart(item);
          const inCart = live.current.cartApi.cart.find((line) => line.id === item.id)?.quantity ?? 0;
          return {
            added: { title: product.title, color: chosenColor ?? null, size: chosenSize ?? null, quantity: count },
            line_id: item.id,
            quantity_in_cart: Math.min(MAX_QUANTITY_PER_ITEM, inCart + count),
          };
        },
      },
      {
        name: "view_cart",
        title: "View cart",
        description: "What's in the shopper's cart: each line with its line_id, color, size, quantity and price, plus the subtotal.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => cartView(live.current.cartApi.cart),
      },
      {
        name: "update_cart_item",
        title: "Change cart quantity",
        description: "Change the quantity of one cart line (use its line_id from view_cart). Quantity 0 removes it.",
        inputSchema: {
          type: "object",
          properties: {
            line_id: { type: "string", description: "The line_id from view_cart." },
            quantity: { type: "integer", minimum: 0, maximum: MAX_QUANTITY_PER_ITEM },
          },
          required: ["line_id", "quantity"],
        },
        execute: async ({ line_id, quantity }) => {
          const { cart, updateQuantity, removeFromCart } = live.current.cartApi;
          const line = cart.find((item) => item.id === line_id);
          if (!line) return { error: "No cart line with that line_id. Use view_cart to see the lines." };
          const count = Number(quantity);
          if (!Number.isInteger(count) || count < 0 || count > MAX_QUANTITY_PER_ITEM) {
            return { error: `Quantity must be a whole number from 0 to ${MAX_QUANTITY_PER_ITEM}.` };
          }
          if (count === 0) removeFromCart(line.id);
          else updateQuantity(line.id, count);
          return { line_id: line.id, quantity: count, removed: count === 0 };
        },
      },
      {
        name: "begin_checkout",
        title: "Go to checkout",
        description:
          "Take the shopper to secure checkout (Stripe) for everything in the cart. The shopper enters shipping and payment there themselves; nothing is charged by this tool. Confirm the cart with the shopper first.",
        inputSchema: { type: "object", properties: {} },
        annotations: { consequentialHint: true },
        execute: async () => {
          const { cart, subtotal, closeCart } = live.current.cartApi;
          if (cart.length === 0) return { error: "The cart is empty." };
          if (live.current.pathname?.startsWith("/monthly-deals")) {
            return { error: "Monthly deals use their own checkout button on this page." };
          }
          const response = await fetch("/api/catalog/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: cart, subtotal }),
          });
          const data = (await response.json().catch(() => ({}))) as { url?: string; error?: unknown };
          if (!response.ok || !data.url) {
            return { error: typeof data.error === "string" ? data.error : "Checkout couldn't start. Try again." };
          }
          closeCart();
          const url = data.url;
          // Leave a moment for this result to reach the agent before the page changes.
          window.setTimeout(() => window.location.assign(url), 400);
          return { status: "Opening secure checkout. The shopper completes shipping and payment there.", checkout_url: url };
        },
      },
      {
        name: "list_chaos_monkeys",
        title: "Chaos Monkeys",
        description:
          "The latest Chaos Monkeys: new ape artworks that customers can ask us to print on a tee. Shows request counts once a monkey has 5 or more, and whether this shopper already asked.",
        inputSchema: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 50, description: "How many, newest first (default 6)." } },
        },
        annotations: { readOnlyHint: true },
        execute: async ({ limit }) => {
          const [{ chaosMonkeys }, requests] = await Promise.all([loadStorefront(), getPrintRequests()]);
          const max = Math.min(50, Math.max(1, Number(limit) || 6));
          return {
            print_requests_open: requests.available,
            monkeys: chaosMonkeys.slice(0, max).map((monkey) => ({
              ...monkey,
              image: absolute(monkey.image),
              url: absolute(monkey.url),
              print_requests: requests.counts[monkey.id] ?? null,
              requested_by_shopper: requests.mine.includes(monkey.id),
            })),
          };
        },
      },
      {
        name: "request_print",
        title: "Ask to print a Chaos Monkey",
        description:
          "Ask A-OK to print a Chaos Monkey on a tee, on the shopper's behalf, or take that request back. One request per shopper per monkey.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The monkey's id from list_chaos_monkeys, e.g. '0005'." },
            want: { type: "boolean", description: "true to ask (default), false to take the request back." },
          },
          required: ["id"],
        },
        execute: async ({ id, want }) => {
          const { chaosMonkeys } = await loadStorefront();
          const monkey = chaosMonkeys.find((m) => m.id === String(id));
          if (!monkey) return { error: `No Chaos Monkey "${String(id)}". Use list_chaos_monkeys.` };
          const result = await setPrintRequest(monkey.id, want !== false);
          if (!result.ok) return { error: result.error };
          return { id: monkey.id, title: monkey.title, requested: result.wanted, print_requests: result.count };
        },
      },
      {
        name: "open_page",
        title: "Open a page",
        description: "Show the shopper a page of the shop: the home page, the shop, tees, hoodies, Chaos Monkeys, the game, a product (with handle), or the cart.",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "string", enum: [...Object.keys(PAGES), "product", "cart"] },
            handle: { type: "string", description: "The product's handle, when page is 'product'." },
          },
          required: ["page"],
        },
        execute: async ({ page, handle }) => {
          if (page === "cart") {
            live.current.cartApi.openCart();
            return { opened: "cart" };
          }
          let path = PAGES[String(page)];
          if (page === "product") {
            const product = await findProduct(handle);
            if (!product) return { error: "Give the handle of a product from search_products." };
            path = product.url;
          }
          if (!path) return { error: "Unknown page." };
          live.current.router.push(path);
          return { opened: absolute(path) };
        },
      },
    ];

    const controller = new AbortController();
    for (const tool of tools) {
      // registerTool returns a promise in the current spec; older builds returned nothing.
      Promise.resolve()
        .then(() => context.registerTool(tool, { signal: controller.signal }))
        .catch((error) => console.warn(`WebMCP: couldn't register ${tool.name}`, error));
    }
    return () => {
      controller.abort();
      // Builds without the signal option unregister by name.
      for (const tool of tools) {
        try {
          context.unregisterTool?.(tool.name);
        } catch {
          // already gone
        }
      }
    };
  }, []);

  return null;
}
