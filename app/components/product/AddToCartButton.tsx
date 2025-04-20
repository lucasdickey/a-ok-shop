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
  };
  quantity?: number;
};

export default function AddToCartButton({ product, quantity = 1 }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(quantity);

  const handleAddToCart = () => {
    setIsAdding(true);
    
    const cartItem: CartItem = {
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: itemQuantity,
      image: product.image,
      variantId: product.variantId,
    };
    
    addToCart(cartItem);
    
    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  return (
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
  );
}
