'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MAX_QUANTITY_PER_ITEM, useCart } from './CartProvider';
import { CLOTHING_SIZES } from '@/app/lib/sizes';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeFromCart, updateQuantity, updateSize, subtotal } = useCart();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  
  const isMonthlyDeals = pathname?.startsWith('/monthly-deals');

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
        // Show the server's reason (e.g. "Choose a size for …") so the shopper knows what to fix.
        const { error } = await response.json().catch(() => ({ error: undefined }));
        throw new Error(typeof error === "string" ? error : "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Close cart drawer
      closeCart();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      const reason = error instanceof Error ? error.message : '';
      alert(
        reason && reason !== 'Failed to create checkout session'
          ? `${reason}. Please update your cart and try again.`
          : 'There was an error processing your order. Please try again.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-club-blue-dark/60">
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="fixed right-0 top-0 flex h-full w-full max-w-md flex-col border-l-2 border-dark bg-club-slip p-5 shadow-[-10px_0_0_#22221E] sm:w-[420px] sm:p-6"
      >
        <div className="flex items-start justify-between border-b-2 border-dashed border-dark pb-4">
          <div>
            <p className="micro">A–OK / Store receipt</p>
            <h2 id="cart-title" className="display-heading mt-1 text-5xl">
              Your cart
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-dark bg-club-paper hover:bg-club-yellow"
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
          <div className="flex flex-1 flex-col items-center justify-center text-center">
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
              className="mb-3 h-10 w-10 text-dark-light"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <p className="micro">0 line items</p>
            <p className="mt-1 text-base font-semibold">Your cart is empty</p>
            <button
              onClick={closeCart}
              className="btn btn-primary mt-5"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="-mx-1 flex-1 overflow-y-auto px-1 py-2">
              {cart.map((item) => (
                <div key={item.id} className="flex border-b border-dashed border-dark py-3 text-sm">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden border-2 border-dark bg-club-yellow">
                    <Image
                      src={item.image || '/product-placeholder.jpg'}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 12vw, 10vw"
                    />
                  </div>
                  <div className="ml-3 flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2 text-sm font-semibold">
                      <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                      <p className="shrink-0 font-mono text-sm">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] uppercase text-dark-light">
                      {item.size && CLOTHING_SIZES.includes(item.size) && <span>Size: {item.size}</span>}
                      {item.size && !CLOTHING_SIZES.includes(item.size) && (
                        // Saved before the size list changed: let the shopper pick an offered size.
                        <label className="text-primary">
                          {item.size} is no longer offered. Size:{' '}
                          <select
                            value=""
                            onChange={(e) => updateSize(item.id, e.target.value)}
                            className="border border-dark bg-club-paper text-xs"
                          >
                            <option value="" disabled>Choose</option>
                            {CLOTHING_SIZES.map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border-2 border-dark bg-club-paper font-mono">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="min-h-[32px] min-w-[32px] text-xs hover:bg-club-yellow"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= MAX_QUANTITY_PER_ITEM}
                          className="min-h-[32px] min-w-[32px] text-xs hover:bg-club-yellow disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="font-mono text-[11px] uppercase text-primary underline underline-offset-4 hover:text-primary-dark"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-dark pt-4">
              <div className="flex justify-between text-lg font-bold">
                <p>SUBTOTAL</p>
                <p className="font-mono">${subtotal.toFixed(2)}</p>
              </div>
              <p className="micro mt-1 text-[10px] text-dark-light">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="mt-4">
                <button
                  onClick={handleCheckout}
                  className="btn btn-primary min-h-[52px] w-full justify-between"
                >
                  Checkout <span aria-hidden="true">↗</span>
                </button>
              </div>
              <div className="mt-3 flex justify-center text-xs">
                <button
                  onClick={closeCart}
                  className="micro min-h-[36px] underline underline-offset-4 hover:text-primary"
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
