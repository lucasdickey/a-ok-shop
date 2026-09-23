// Round five (21–23): shared helpers that write to the store's real cart.
// The store keeps its cart in localStorage["cart"] (see app/components/cart/CartProvider.tsx),
// so anything added here appears in the site's cart drawer and uses the normal checkout.
// Checkout re-prices every line on the server by variantId, so prices here are display only.
(function () {
  const DATA = window.AOK5;
  const KEY = 'cart';
  const listeners = new Set();
  // Same list the store's product page offers for print-on-demand clothing with no size variants.
  const STANDARD_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Storage blocked (private mode, sandboxed preview). The page still works; the bag just won't persist.
    }
    listeners.forEach((fn) => fn(summary(items)));
  }

  function summary(items = read()) {
    const count = items.reduce((n, i) => n + (i.quantity || 0), 0);
    const subtotal = Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
    const gap = subtotal > 0 ? Math.max(0, Math.round((DATA.freeShippingAt - subtotal) * 100) / 100) : DATA.freeShippingAt;
    return { items, count, subtotal, gap, free: subtotal >= DATA.freeShippingAt };
  }

  // Keyed by variant (plus size when the size isn't part of the variant), so different picks stay on separate lines.
  function add(product, variant, quantity = 1, podSize) {
    const items = read();
    const id = podSize ? `${variant.id}:${podSize}` : variant.id;
    const existing = items.find((i) => i.id === id);
    if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
    else
      items.push({
        id,
        title: product.title + (podSize ? ` - ${podSize}` : ''),
        price: variant.price,
        quantity,
        image: product.images[0] || '/product-placeholder.jpg',
        variantId: variant.id,
        size: variant.options.Size || podSize,
        color: variant.options.Color,
      });
    write(items);
    return summary(items);
  }

  function onChange(fn) {
    listeners.add(fn);
    fn(summary());
  }

  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((fn) => fn(summary()));
  });

  const byHandle = (h) => DATA.products.find((p) => p.handle === h);

  function findVariant(product, chosen) {
    return product.variants.find((v) => product.options.every((o) => v.options[o.name] === chosen[o.name]));
  }

  // Renders option buttons + an add button into `root`. Only offers values the catalog has.
  // opts.label(product, variant) sets the button text; opts.onAdd(summary, product, variant) runs after adding.
  function mountPicker(root, product, opts = {}) {
    const chosen = {};
    const firstAvailable = product.variants.find((v) => v.available) || product.variants[0];
    product.options.forEach((o) => (chosen[o.name] = firstAvailable.options[o.name]));
    const hasSize = product.options.some((o) => o.name === 'Size');
    const podSizes = !hasSize && /T-Shirts|Hoodies/.test(product.category) ? STANDARD_SIZES : null;
    let podSize = podSizes ? 'M' : undefined;
    const soldOut = !product.variants.some((v) => v.available);

    function render() {
      const variant = findVariant(product, chosen);
      const canAdd = variant && variant.available;
      root.innerHTML =
        product.options
          .map(
            (o) => `<fieldset class="p5-opt"><legend>${esc(o.name)}</legend>${o.values
              .map((val) => {
                // Only cross out a value no in-stock variant has; picking it snaps the other options to one that exists.
                const ok = product.variants.some((v) => v.available && v.options[o.name] === val);
                return `<button type="button" data-opt="${esc(o.name)}" data-val="${esc(val)}" aria-pressed="${chosen[o.name] === val}" ${ok ? '' : 'disabled title="Not available"'}>${esc(val)}</button>`;
              })
              .join('')}</fieldset>`
          )
          .join('') +
        (podSizes
          ? `<fieldset class="p5-opt"><legend>Size</legend>${podSizes
              .map((val) => `<button type="button" data-pod="${val}" aria-pressed="${podSize === val}">${val}</button>`)
              .join('')}</fieldset>`
          : '') +
        `<button type="button" class="p5-add" ${canAdd ? '' : 'disabled'}>${
          soldOut ? 'Sold out' : canAdd ? esc(opts.label ? opts.label(product, variant) : `Add to bag · ${money(variant.price)}`) : 'Pick another option'
        }</button>`;
    }

    root.addEventListener('click', (e) => {
      const pod = e.target.closest('[data-pod]');
      if (pod) {
        podSize = pod.dataset.pod;
        render();
        return;
      }
      const opt = e.target.closest('[data-opt]');
      if (opt && !opt.disabled) {
        chosen[opt.dataset.opt] = opt.dataset.val;
        const exact = findVariant(product, chosen);
        if (!exact || !exact.available) {
          const fallback = product.variants.find((v) => v.available && v.options[opt.dataset.opt] === opt.dataset.val);
          if (fallback) product.options.forEach((o) => (chosen[o.name] = fallback.options[o.name]));
        }
        render();
        return;
      }
      const btn = e.target.closest('.p5-add');
      if (btn && !btn.disabled) {
        const variant = findVariant(product, chosen);
        const s = add(product, variant, 1, podSize);
        if (opts.onAdd) opts.onAdd(s, product, variant);
      }
    });
    render();
  }

  window.AOK5Cart = { read, add, summary, onChange, mountPicker, byHandle, money, esc, STANDARD_SIZES, storeUrl: '/products' };
})();
