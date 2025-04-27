'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useCart } from './CartProvider';
import { createShopifyCheckout } from '@/app/lib/shopify';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeFromCart, updateQuantity, subtotal } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeCart();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeCart]);

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      const lineItems = cart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));
      
      const checkoutUrl = await createShopifyCheckout(lineItems);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark/50">
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-light p-6 shadow-xl transition-transform sm:w-96"
      >
        <div className="flex items-center justify-between border-b border-secondary pb-4">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button
            onClick={closeCart}
            className="rounded-md p-1 hover:bg-secondary-light"
            aria-label="Close cart"
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
              className="h-5 w-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center">
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
              className="h-12 w-12 text-secondary-dark mb-4"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <p className="text-lg font-medium">Your cart is empty</p>
            <button
              onClick={closeCart}
              className="mt-4 btn btn-primary"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto py-4">
              {cart.map((item) => (
                <div key={item.id} className="flex border-b border-secondary py-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={item.image || '/product-placeholder.jpg'}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col">
                    <div className="flex justify-between text-base font-medium">
                      <h3>{item.title}</h3>
                      <p className="ml-4">${item.price.toFixed(2)}</p>
                    </div>
                    {item.size && (
                      <p className="mt-1 text-sm text-gray-500">Size: {item.size}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-secondary rounded-md">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-secondary-light"
                        >
                          -
                        </button>
                        <span className="px-2 py-1">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-secondary-light"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-primary hover:text-primary-dark"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-secondary pt-4">
              <div className="flex justify-between text-base font-medium">
                <p>Subtotal</p>
                <p>${subtotal.toFixed(2)}</p>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="mt-4">
                <button
                  onClick={handleCheckout}
                  className="w-full btn btn-primary"
                >
                  Checkout
                </button>
              </div>
              <div className="mt-2 flex justify-center text-sm">
                <button
                  onClick={closeCart}
                  className="text-primary hover:text-primary-dark"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
