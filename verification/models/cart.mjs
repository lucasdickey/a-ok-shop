// Cart: the shopper's cart in the browser.
// Code: app/components/cart/CartProvider.tsx, app/components/cart/CartDrawer.tsx,
// app/products/[handle]/ProductPageClient.tsx (line ids), app/checkout/success/page.tsx,
// and the size check checkout applies (app/lib/store-checkout.ts:77-84).
//
// Part 1, "editing lines": add from the product page, +/- in the drawer, remove, and the
// drawer's size picker for saved lines whose size is no longer offered. The cart may start
// with a line saved before the size lists changed ("OLD" stands for any retired size).
//
// Part 2, "after paying": the shopper comes back from Stripe to /checkout/success with
// items saved in the browser. The cart loads them into memory and the success page clears
// the saved copy; the success page sits inside <Suspense> (success/page.tsx:113), so the
// model lets either happen first.

// CartProvider.tsx:32 caps a line at 20. The model uses 3: the capping code is the same for
// any number, and 20 would make the model too big to walk quickly.
const MAX_PER_LINE = 3;
const CLOTHING_SIZES = ["XS", "M"]; // the shop-wide list (sizes.ts:4), cut to two sizes
const BLANK_SIZES = { tee: ["XS", "M"], sweatshirt: ["M"] }; // tee: all sizes; sweatshirt: no XS (product-catalog.json:7205)

/** Line id as the product page builds it: variant, size (and color) joined by ":". */
const lineId = (item, size) => `${item}:${size}`; // ProductPageClient.tsx:211-213

function editSpec({ variant }) {
  const legacy = [
    [],
    [{ id: lineId("tee", "OLD"), item: "tee", size: "OLD", qty: 1 }],
    [{ id: lineId("sweatshirt", "OLD"), item: "sweatshirt", size: "OLD", qty: 1 }],
    [{ id: lineId("sweatshirt", "XS"), item: "sweatshirt", size: "XS", qty: 1 }],
  ];
  const init = legacy.map((lines) => ({ lines }));
  const pickerSizes = (line) => (variant.fixDrawerUsesBlankSizes ? BLANK_SIZES[line.item] : CLOTHING_SIZES);
  const drawerShowsPicker = (line) => !pickerSizes(line).includes(line.size); // CartDrawer.tsx:246-262

  function next(s) {
    const moves = [];
    // Same lines in another order are the same cart (the drawer just lists them).
    const withLines = (lines) => ({ lines: [...lines].sort((a, b) => (a.id + a.size).localeCompare(b.id + b.size)) });

    // addToCart, CartProvider.tsx:73-96: merge by id, cap the line.
    for (const item of Object.keys(BLANK_SIZES)) {
      for (const size of BLANK_SIZES[item]) {
        for (const qty of [1, MAX_PER_LINE]) {
          const id = lineId(item, size);
          const existing = s.lines.find((l) => l.id === id);
          const lines = existing
            ? s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_PER_LINE, l.qty + qty) } : l))
            : [...s.lines, { id, item, size, qty }];
          moves.push({ step: `add ${qty} × ${item} ${size} from the product page (CartProvider.tsx:73)`, state: withLines(lines) });
        }
      }
    }

    s.lines.forEach((line) => {
      // + / - buttons, updateQuantity, CartProvider.tsx:115-126
      if (line.qty < MAX_PER_LINE) {
        moves.push({ step: `press + on ${line.item} ${line.size}`, state: withLines(s.lines.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l))) });
      }
      moves.push({
        step: `press - on ${line.item} ${line.size}`,
        state: withLines(line.qty > 1 ? s.lines.map((l) => (l === line ? { ...l, qty: l.qty - 1 } : l)) : s.lines.filter((l) => l !== line)),
      });
      // size picker, updateSize, CartProvider.tsx:129-141: changes size, keeps the old id.
      if (drawerShowsPicker(line)) {
        for (const size of pickerSizes(line)) {
          let lines;
          if (variant.fixSizeChangeMerges) {
            const id = lineId(line.item, size);
            const other = s.lines.find((l) => l.id === id);
            lines = other
              ? s.lines.filter((l) => l !== line).map((l) => (l === other ? { ...l, qty: Math.min(MAX_PER_LINE, l.qty + line.qty) } : l))
              : s.lines.map((l) => (l === line ? { ...l, id, size } : l));
          } else {
            lines = s.lines.map((l) => (l === line ? { ...l, size } : l));
          }
          moves.push({ step: `pick size ${size} for the saved ${line.item} ${line.size} line (CartDrawer.tsx:253)`, state: withLines(lines) });
        }
      }
    });
    return moves;
  }

  const sameItem = (a, b) => a.item === b.item && a.size === b.size;
  return {
    init,
    next,
    rules: {
      "Each item and size is on one cart line": (s) => s.lines.every((a, i) => s.lines.every((b, j) => i === j || !sameItem(a, b))),
      "No item and size goes over the per-line cap": (s) =>
        s.lines.every((a) => s.lines.filter((b) => sameItem(a, b)).reduce((n, b) => n + b.qty, 0) <= MAX_PER_LINE),
      "Checkout takes every line, or the drawer shows how to fix it": (s) =>
        s.lines.every((line) => BLANK_SIZES[line.item].includes(line.size) || drawerShowsPicker(line)),
    },
  };
}

function paidSpec({ variant }) {
  const init = [{ saved: "items", memory: "not loaded", successRan: false, providerRan: false }];
  function next(s) {
    const moves = [];
    if (!s.providerRan) {
      // CartProvider.tsx:50-61 loads the saved cart into memory.
      moves.push({ step: "the cart loads the saved items into memory (CartProvider.tsx:50-61)", state: { ...s, providerRan: true, memory: s.saved } });
    }
    if (!s.successRan) {
      // success/page.tsx:28-31 removes the saved copy only.
      moves.push({
        step: variant.fixSuccessClearsMemory
          ? "the success page clears the cart in memory and in the browser"
          : "the success page removes the saved cart from the browser (success/page.tsx:31)",
        state: { ...s, successRan: true, saved: "empty", memory: variant.fixSuccessClearsMemory && s.providerRan ? "empty" : s.memory },
      });
    }
    if (s.providerRan && s.successRan && s.memory === "items" && s.saved === "empty") {
      // The next change rewrites the whole in-memory cart (CartProvider.tsx:64-68).
      moves.push({ step: "the shopper keeps browsing and adds something; the old items are saved again (CartProvider.tsx:64-68)", state: { ...s, saved: "items" } });
    }
    return moves;
  }
  return {
    init,
    next,
    rules: {
      "After a paid order the cart is empty": (s) => !(s.providerRan && s.successRan) || s.memory !== "items",
    },
  };
}

export function spec(config) {
  const variant = config.variant ?? {};
  return config.part === "edit" ? editSpec({ variant }) : paidSpec({ variant });
}

export const configs = [
  { label: "editing lines", part: "edit" },
  { label: "after paying", part: "paid" },
];

export const variants = {
  "fix-cart": { fixSizeChangeMerges: true, fixDrawerUsesBlankSizes: true, fixSuccessClearsMemory: true },
};

export const covers = [
  "app/components/cart/CartProvider.tsx: CartProvider (load, save, addToCart, updateQuantity, updateSize, removeFromCart)",
  "app/components/cart/CartDrawer.tsx: size picker for retired sizes",
  "app/products/[handle]/ProductPageClient.tsx: cartLineId",
  "app/checkout/success/page.tsx: CheckoutSuccessContent",
];
