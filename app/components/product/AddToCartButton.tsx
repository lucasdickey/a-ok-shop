'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart, CartItem } from '@/app/components/cart/CartProvider';

// Checkout accepts at most this many of one item (see app/api/catalog/checkout/route.ts).
const MAX_QUANTITY = 20;

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
  /** True when the chosen options don't match any variant that can be bought. */
  unavailable?: boolean;
};

export default function AddToCartButton({ 
  product, 
  quantity = 1, 
  showSizeWarning = false,
  showColorWarning = false,
  unavailable = false,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(quantity);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  // Phones get a bar pinned to the bottom of the screen while the main button is scrolled away.
  const mainRowRef = useRef<HTMLDivElement>(null);
  const [showPinnedBar, setShowPinnedBar] = useState(false);

  useEffect(() => {
    const row = mainRowRef.current;
    if (!row || typeof IntersectionObserver === 'undefined') return;
    const footer = document.querySelector('footer');
    let rowVisible = true;
    let footerVisible = false;
    // Hide the bar near the footer so it never covers the footer links.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === row) rowVisible = entry.isIntersecting;
        else footerVisible = entry.isIntersecting;
      }
      setShowPinnedBar(!rowVisible && !footerVisible);
    });
    observer.observe(row);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = () => {
    if (showSizeWarning) {
      setWarningMessage('Please select a size before adding to cart.');
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
      }, 3000);
      return;
    }

    // The reason is already shown in the status message below the button.
    if (unavailable) return;

    if (showColorWarning) {
      setWarningMessage('Please select a color before adding to cart.');
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
      }, 3000);
      return;
    }
    
    setIsAdding(true);
    
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
      setIsAdding(false);
    }, 1000);
  };

  // A missing choice or an unavailable combination is explained next to the main button,
  // so the pinned bar scrolls back up to it instead of adding.
  const needsAttention = showSizeWarning || showColorWarning || unavailable;
  const handlePinnedAdd = () => {
    if (needsAttention) {
      mainRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    handleAddToCart();
  };

  return (
    <div>
      <div ref={mainRowRef} className="flex items-center gap-4">
        <div className="flex min-h-[48px] items-center border-2 border-dark bg-club-slip font-mono">
          <button
            onClick={() => setItemQuantity(prev => Math.max(1, prev - 1))}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 hover:bg-club-yellow"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="px-3 py-2">{itemQuantity}</span>
          <button
            onClick={() => setItemQuantity(prev => Math.min(MAX_QUANTITY, prev + 1))}
            disabled={itemQuantity >= MAX_QUANTITY}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 hover:bg-club-yellow disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          // aria-disabled (not disabled) keeps the button focusable so the reason is reachable.
          aria-disabled={unavailable || undefined}
          aria-describedby={unavailable ? 'add-to-cart-reason' : undefined}
          className={`btn btn-primary min-h-[52px] flex-1 disabled:cursor-not-allowed disabled:opacity-50 ${
            unavailable ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isAdding ? 'Adding...' : unavailable ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
      
      {/* The lasting reason is a polite status tied to the button; short warnings are alerts. */}
      <p id="add-to-cart-reason" role="status" className="mt-3 text-sm font-semibold text-primary">
        {unavailable ? 'That combination isn’t available. Try another size or color.' : ''}
      </p>
      <div role="alert" className="text-sm font-semibold text-primary">
        {showWarning && !unavailable ? warningMessage : ''}
      </div>

      {showPinnedBar && (
        <div
          role="region"
          aria-label="Quick add to cart"
          className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t-2 border-dark bg-club-yellow px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_0_#22221E] md:hidden"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{product.title}</p>
            <p className="font-mono text-sm">
              ${(product.price * itemQuantity).toFixed(2)}
              {itemQuantity > 1 && <span className="text-dark-light"> · {itemQuantity} × ${product.price.toFixed(2)}</span>}
            </p>
          </div>
          <button
            onClick={handlePinnedAdd}
            disabled={isAdding}
            className={`btn btn-primary min-h-[48px] shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50 ${
              unavailable ? 'opacity-50' : ''
            }`}
          >
            {isAdding ? 'Adding...' : unavailable ? 'Unavailable' : 'Add to Cart'}
          </button>
        </div>
      )}
    </div>
  );
}
