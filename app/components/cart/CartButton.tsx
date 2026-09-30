'use client';

import { useCart } from './CartProvider';

export default function CartButton() {
  const { openCart, totalItems } = useCart();

  return (
    <button
      onClick={openCart}
      className="relative flex min-h-[40px] items-center gap-2 border-2 border-dark bg-club-paper px-3 py-2 text-xs font-semibold shadow-[4px_4px_0_#22221E] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#22221E] motion-reduce:transition-none sm:px-5 sm:text-sm"
      aria-label={totalItems > 0 ? `Open cart, ${totalItems} item${totalItems === 1 ? '' : 's'}` : 'Open cart'}
    >
      Cart <span aria-hidden="true">↗</span>
      {totalItems > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-2.5 -top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-dark bg-primary px-1 text-[11px] font-bold text-club-paper"
        >
          {totalItems}
        </span>
      )}
    </button>
  );
}
