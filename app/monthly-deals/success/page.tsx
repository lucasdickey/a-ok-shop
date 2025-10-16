"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function MonthlyDealsSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Fetch session details
      fetch(`/api/monthly-deals/checkout-session?session_id=${sessionId}`)
        .then((response) => response.json())
        .then((data) => {
          setSessionData(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching session:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1E24] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !sessionData) {
    return (
      <div className="container mx-auto py-16 px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bebas-neue text-dark mb-4">
            ORDER NOT FOUND
          </h1>
          <p className="text-gray-600 mb-8">
            We couldn&apos;t find your order. If you just completed a purchase, please check your email for confirmation.
          </p>
          <Link href="/monthly-deals" className="btn btn-primary">
            Return to Monthly Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bebas-neue text-dark mb-4">
            ORDER CONFIRMED!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Thank you for your purchase
          </p>
          {sessionData.customer_details?.email && (
            <p className="text-gray-500">
              Confirmation sent to {sessionData.customer_details.email}
            </p>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 mb-8 text-left">
          <h2 className="text-xl font-bebas-neue mb-4 text-center">ORDER DETAILS</h2>
          
          {sessionData.line_items?.data && (
            <div className="space-y-3 mb-4">
              {sessionData.line_items.data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.description}</span>
                    {item.quantity > 1 && (
                      <span className="text-gray-600"> (Qty: {item.quantity})</span>
                    )}
                  </div>
                  <span>${(item.amount_total / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <hr className="border-gray-300 my-4" />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${((sessionData.amount_subtotal || 0) / 100).toFixed(2)}</span>
            </div>
            {sessionData.total_details?.amount_shipping > 0 && (
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>${(sessionData.total_details.amount_shipping / 100).toFixed(2)}</span>
              </div>
            )}
            {sessionData.total_details?.amount_tax > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${(sessionData.total_details.amount_tax / 100).toFixed(2)}</span>
              </div>
            )}
            <hr className="border-gray-300" />
            <div className="flex justify-between font-bebas-neue text-lg">
              <span>TOTAL PAID:</span>
              <span>${((sessionData.amount_total || 0) / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        {sessionData.shipping_details && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-8">
            <h3 className="font-bebas-neue text-lg mb-3">SHIPPING TO:</h3>
            <div className="text-left">
              <p className="font-medium">{sessionData.customer_details?.name}</p>
              <p>{sessionData.shipping_details.address.line1}</p>
              {sessionData.shipping_details.address.line2 && (
                <p>{sessionData.shipping_details.address.line2}</p>
              )}
              <p>
                {sessionData.shipping_details.address.city}, {sessionData.shipping_details.address.state} {sessionData.shipping_details.address.postal_code}
              </p>
              <p>{sessionData.shipping_details.address.country}</p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200 mb-8">
          <h3 className="font-bebas-neue text-lg mb-3 text-yellow-800">WHAT&apos;S NEXT?</h3>
          <div className="text-left space-y-2 text-yellow-700">
            <p>✓ Your order has been confirmed and payment processed</p>
            <p>✓ You&apos;ll receive an email confirmation shortly</p>
            <p>✓ Your item will ship within <strong>3-5 business days</strong></p>
            <p>✓ You&apos;ll receive tracking information once shipped</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link href="/monthly-deals" className="btn btn-primary inline-block">
            Shop More Monthly Deals
          </Link>
          <div>
            <Link href="/" className="text-gray-600 hover:text-gray-800 underline">
              Return to A-OK Store
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            Questions about your order? Contact us at support@a-ok.shop
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MonthlyDealsSuccess() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-16 px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1E24] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order confirmation...</p>
        </div>
      </div>
    }>
      <MonthlyDealsSuccessContent />
    </Suspense>
  );
}