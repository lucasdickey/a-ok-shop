'use client';

import { useState } from 'react';
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
};

export default function AddToCartButton({ 
  product, 
  quantity = 1, 
  showSizeWarning = false,
  showColorWarning = false 
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
            onClick={() => setItemQuantity(prev => prev + 1)}
            className="px-3 py-2 hover:bg-secondary-light"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="btn btn-primary flex-1"
        >
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
      
      {showWarning && (
        <div className="mt-2 text-sm text-red-500">
          {warningMessage}
        </div>
      )}
    </div>
  );
}
