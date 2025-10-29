"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading session details
    if (sessionId) {
      setTimeout(() => setLoading(false), 1000);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="container mx-auto py-12 px-8 text-center">
        <h1 className="text-4xl font-bebas-neue text-dark mb-4">
          Invalid Order
        </h1>
        <p className="text-gray-600 mb-8">
          No order information found. Please contact support if you completed a purchase.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#1F1F1F] text-white px-8 py-4 rounded-lg font-bebas-neue text-xl hover:bg-gray-800 transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-8">
      <div className="max-w-2xl mx-auto text-center">
        {loading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-[#8B1E24] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600">Processing your order...</p>
          </div>
        ) : (
          <>
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl md:text-5xl font-bebas-neue text-dark mb-4">
              Order Confirmed!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your purchase from A-OK Shop
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Order ID: {sessionId.slice(-12)}
            </p>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-xl font-bebas-neue text-dark mb-4">
                What happens next?
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-[#8B1E24] text-xl">✓</span>
                  <span>You&apos;ll receive an email confirmation shortly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#8B1E24] text-xl">✓</span>
                  <span>Your order will be processed within 1-2 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#8B1E24] text-xl">✓</span>
                  <span>Shipping typically takes 3-5 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#8B1E24] text-xl">✓</span>
                  <span>You&apos;ll receive tracking information once shipped</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block bg-[#1F1F1F] text-white px-8 py-4 rounded-lg font-bebas-neue text-xl hover:bg-gray-800 transition-colors"
              >
                Continue Shopping
              </Link>
              <Link
                href="/gallery"
                className="inline-block border-2 border-[#1F1F1F] text-[#1F1F1F] px-8 py-4 rounded-lg font-bebas-neue text-xl hover:bg-gray-100 transition-colors"
              >
                View Gallery
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-12 px-8 text-center">
        <div className="w-16 h-16 border-4 border-[#8B1E24] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
