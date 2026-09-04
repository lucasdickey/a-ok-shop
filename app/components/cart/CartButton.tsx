'use client';

import { useCart } from './CartProvider';

export default function CartButton() {
  const { openCart, totalItems } = useCart();

  return (
    <button
      onClick={openCart}
      className="group relative flex items-center justify-center rounded-lg p-2 transition-all duration-200 hover:bg-secondary-light active:scale-90"
      aria-label={`Open cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
      >
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
      {totalItems > 0 && (
        <span
          key={totalItems}
          className="absolute -right-1 -top-1 flex h-5 w-5 animate-badge-pop items-center justify-center rounded-full bg-maroon text-xs font-bold text-bone shadow-sm"
        >
          {totalItems}
        </span>
      )}
    </button>
  );
}
