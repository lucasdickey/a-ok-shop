'use client';

import { useState } from 'react';
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

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex items-center border border-secondary rounded-md">
          <button
            onClick={() => setItemQuantity(prev => Math.max(1, prev - 1))}
            className="px-3 py-2 hover:bg-secondary-light"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="px-3 py-2">{itemQuantity}</span>
          <button
            onClick={() => setItemQuantity(prev => Math.min(MAX_QUANTITY, prev + 1))}
            disabled={itemQuantity >= MAX_QUANTITY}
            className="px-3 py-2 hover:bg-secondary-light disabled:cursor-not-allowed disabled:opacity-40"
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
          className={`btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50 ${
            unavailable ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isAdding ? 'Adding...' : unavailable ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
      
      {/* The lasting reason is a polite status tied to the button; short warnings are alerts. */}
      <p id="add-to-cart-reason" role="status" className="mt-2 text-sm text-red-500">
        {unavailable ? 'That combination isn’t available. Try another size or color.' : ''}
      </p>
      <div role="alert" className="text-sm text-red-500">
        {showWarning && !unavailable ? warningMessage : ''}
      </div>
    </div>
  );
}
