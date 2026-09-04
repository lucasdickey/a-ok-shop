'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart, CartItem } from '@/app/components/cart/CartProvider';

type AddToCartButtonProps = {
  product: {
    id: string;
    title: string;
    price: number;
    image: string;
    variantId: string;
    size?: string;
    color?: string;
  };
  quantity?: number;
  showSizeWarning?: boolean;
  showColorWarning?: boolean;
  /** Show a fixed bottom add-to-cart bar on mobile when the main button scrolls out of view */
  stickyOnMobile?: boolean;
};

export default function AddToCartButton({
  product,
  quantity = 1,
  showSizeWarning = false,
  showColorWarning = false,
  stickyOnMobile = false
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(quantity);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const mainRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stickyOnMobile || !mainRowRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only surface the bar once the main CTA has scrolled up out of view
        setShowStickyBar(
          !entry.isIntersecting && entry.boundingClientRect.top < 0
        );
      },
      { threshold: 0 }
    );

    observer.observe(mainRowRef.current);
    return () => observer.disconnect();
  }, [stickyOnMobile]);

  const handleAddToCart = () => {
    if (showSizeWarning) {
      setWarningMessage('Please select a size before adding to cart.');
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
      }, 3000);
      return;
    }

    if (showColorWarning) {
      setWarningMessage('Please select a color before adding to cart.');
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
      }, 3000);
      return;
    }

    setIsAdded(true);

    const cartItem: CartItem = {
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: itemQuantity,
      image: product.image,
      variantId: product.variantId,
      size: product.size,
      color: product.color,
    };

    addToCart(cartItem);

    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  const addedLabel = (
    <span className="inline-flex animate-scale-in items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Added to Cart
    </span>
  );

  return (
    <div>
      <div
        ref={mainRowRef}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex items-center justify-between rounded-lg border-2 border-dark/15 bg-white sm:justify-start">
          <button
            onClick={() => setItemQuantity(prev => Math.max(1, prev - 1))}
            className="px-4 py-2.5 font-semibold transition-colors duration-150 hover:bg-secondary-light active:scale-90 rounded-l-md sm:px-3 sm:py-2"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2.5rem] px-2 py-2 text-center font-space-grotesk font-semibold tabular-nums">
            {itemQuantity}
          </span>
          <button
            onClick={() => setItemQuantity(prev => prev + 1)}
            className="px-4 py-2.5 font-semibold transition-colors duration-150 hover:bg-secondary-light active:scale-90 rounded-r-md sm:px-3 sm:py-2"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isAdded}
          className={`btn flex-1 py-3 text-base ${
            isAdded
              ? 'bg-green-700 text-white shadow-md disabled:opacity-100'
              : 'btn-primary'
          }`}
        >
          {isAdded ? addedLabel : 'Add to Cart'}
        </button>
      </div>

      {showWarning && (
        <div className="mt-3 animate-fade-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {warningMessage}
        </div>
      )}

      {/* Sticky mobile add-to-cart bar */}
      {stickyOnMobile && showStickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-fade-up border-t border-dark/10 bg-light/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-drawer backdrop-blur-md md:hidden">
          {showWarning && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              {warningMessage}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{product.title}</p>
              <p className="font-space-grotesk text-base font-semibold text-maroon">
                ${product.price.toFixed(2)}
                {itemQuantity > 1 && (
                  <span className="ml-1 text-xs font-medium text-dark-light">
                    × {itemQuantity}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdded}
              className={`btn px-6 py-2.5 text-sm ${
                isAdded
                  ? 'bg-green-700 text-white shadow-md disabled:opacity-100'
                  : 'btn-primary'
              }`}
            >
              {isAdded ? addedLabel : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
