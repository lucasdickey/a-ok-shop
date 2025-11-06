'use client';

import { useState } from 'react';
import { useCart } from '@/app/components/cart/CartProvider';

type Variant = {
  id: string;
  title: string;
  price: number;
  available: boolean;
  selectedOptions?: Array<{
    name: string;
    value: string;
  }>;
};

type SizeSelectorProps = {
  sizeOptions: string[];
  variants: Variant[];
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string;
};

export default function SizeSelector({
  sizeOptions,
  variants,
  productId,
  productTitle,
  productPrice,
  productImage,
}: SizeSelectorProps) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Find the variant ID that matches the selected size
  const getVariantIdForSize = (size: string) => {
    const variant = variants.find(v => 
      v.selectedOptions?.some(option => 
        option.name.toLowerCase() === 'size' && option.value === size
      ) || v.title === size
    );
    return variant?.id || '';
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  const handleAddToCart = () => {
    if (!selectedSize) return;
    
    setIsAdding(true);
    
    const variantId = getVariantIdForSize(selectedSize);
    
    const cartItem = {
      id: productId,
      title: `${productTitle} - ${selectedSize}`,
      price: productPrice,
      quantity: quantity,
      image: productImage,
      variantId: variantId,
      size: selectedSize,
    };
    
    addToCart(cartItem);
    
    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Size</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {sizeOptions.map((size) => {
          const variant = variants.find(v => 
            v.selectedOptions?.some(option => 
              option.name.toLowerCase() === 'size' && option.value === size
            ) || v.title === size
          );
          
          const isAvailable = variant?.available ?? false;
          
          return (
            <button
              key={size}
              onClick={() => isAvailable && handleSizeSelect(size)}
              className={`px-3 py-1 rounded-md border ${
                selectedSize === size
                  ? 'bg-primary text-white border-primary'
                  : isAvailable
                  ? 'border-secondary hover:bg-secondary-light'
                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!isAvailable}
            >
              {size}
              {!isAvailable && ' (Out of stock)'}
            </button>
          );
        })}
      </div>
      
      {selectedSize && (
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-secondary rounded-md">
              <button
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="px-3 py-2 hover:bg-secondary-light"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="px-3 py-2">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="px-3 py-2 hover:bg-secondary-light"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={isAdding || !selectedSize}
              className="btn btn-primary flex-1"
            >
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
      
      {!selectedSize && (
        <div className="mt-4 text-sm text-gray-500">
          Please select a size to add this item to your cart.
        </div>
      )}
    </div>
  );
}
