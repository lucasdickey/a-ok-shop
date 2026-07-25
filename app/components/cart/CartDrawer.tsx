'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeFromCart, updateQuantity, subtotal } = useCart();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isMonthlyDeals = pathname?.startsWith('/monthly-deals');

  // Handle click outside and Escape key to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeCart();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
    if (cart.length === 0 || isCheckingOut) return;

    setIsCheckingOut(true);

    try {
      // Use Stripe checkout for all products
      const apiEndpoint = isMonthlyDeals
        ? "/api/monthly-deals/create-checkout-session"
        : "/api/catalog/checkout";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart,
          subtotal
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      // Close cart drawer
      closeCart();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('There was an error processing your order. Please try again.');
      setIsCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-fade-in bg-dark/60 backdrop-blur-sm">
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed right-0 top-0 flex h-full w-full max-w-md animate-slide-in-right flex-col bg-light p-6 shadow-drawer sm:w-96"
      >
        <div className="flex items-center justify-between border-b border-dark/10 pb-3">
          <h2 className="font-bebas-neue text-2xl tracking-wide">Your Cart</h2>
          <button
            onClick={closeCart}
            className="rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 hover:bg-secondary-light active:scale-90"
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
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-light">
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
                className="h-8 w-8 text-dark-light"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold">Your cart is empty</p>
            <p className="mt-1 text-sm text-dark-light">
              Fill it with some AI nerdwear.
            </p>
            <button
              onClick={closeCart}
              className="btn btn-primary mt-5"
            >
              Continue Shopping
            </button>
            <Link
              href="/game"
              onClick={closeCart}
              className="mt-4 text-xs text-dark-light transition-colors duration-150 hover:text-maroon"
            >
              …or beat <span className="font-semibold">Run, Human, Run!</span>{' '}
              for 25% off →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex animate-fade-up border-b border-dark/10 py-3 text-sm"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-dark/10 bg-secondary-light">
                    <Image
                      src={item.image || '/product-placeholder.jpg'}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 16vw, 10vw"
                    />
                  </div>
                  <div className="ml-3 flex flex-1 flex-col">
                    <div className="flex justify-between font-medium">
                      <h3 className="truncate max-w-[170px] text-sm">{item.title}</h3>
                      <p className="ml-2 font-space-grotesk text-sm font-semibold">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex gap-2 text-xs text-dark-light">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-dark/15 bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-secondary-light active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-[1.75rem] px-1 py-1 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-secondary-light active:scale-90"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-xs font-medium text-maroon underline-offset-2 transition-colors duration-150 hover:text-maroon-dark hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-dark/10 pt-4">
              <div className="flex justify-between font-space-grotesk text-base font-semibold">
                <p>Subtotal</p>
                <p>${subtotal.toFixed(2)}</p>
              </div>
              <p className="mt-1 text-xs text-dark-light">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="mt-4">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="btn btn-primary w-full py-3 text-base"
                >
                  {isCheckingOut ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                        />
                      </svg>
                      Redirecting…
                    </span>
                  ) : (
                    'Checkout'
                  )}
                </button>
              </div>
              <div className="mt-3 flex justify-center text-xs">
                <button
                  onClick={closeCart}
                  className="font-medium text-maroon underline-offset-2 transition-colors duration-150 hover:text-maroon-dark hover:underline"
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
