"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const NEXT_STEPS = [
  "You'll receive an email confirmation shortly",
  "Your order will be processed within 1-2 business days",
  "Shipping typically takes 3-5 business days",
  "You'll receive tracking information once shipped",
];

function Processing({ label }: { label: string }) {
  return (
    <div className="space-y-4 py-16 text-center" role="status">
      <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-dark border-t-transparent motion-reduce:animate-none" />
      <p className="micro">{label}</p>
    </div>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Clear the cart after successful checkout
      localStorage.removeItem('cart');
      setTimeout(() => setLoading(false), 1000);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="micro mb-4">Receipt not found</p>
        <h1 className="display-heading mb-4 text-6xl">Invalid order</h1>
        <p className="mb-8">
          No order information found. Please contact support if you completed a purchase.
        </p>
        <Link href="/" className="btn btn-primary">
          Return home
        </Link>
      </div>
    );
  }

  if (loading) {
    return <Processing label="Processing your order..." />;
  }

  return (
    <div className="px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-xl">
        <div className="receipt-slip px-6 py-8 sm:px-8">
          <p className="micro border-b border-dashed border-dark pb-4 text-center">
            A–OK / Order receipt
          </p>
          <div className="mx-auto mt-6 flex h-[110px] w-[110px] rotate-12 flex-col items-center justify-center rounded-full border-2 border-dark bg-primary text-center font-display text-2xl font-bold leading-none text-club-paper shadow-[5px_5px_0_#22221E]">
            PAID
            <span className="mt-2 font-mono text-[8px] font-normal">GOOD DECISION.</span>
          </div>
          <h1 className="display-heading mt-6 text-center text-[clamp(52px,12vw,84px)]">
            Order
            <br />
            <span className="text-primary">confirmed.</span>
          </h1>
          <p className="mt-4 text-center">Thank you for your purchase from A-OK Shop.</p>

          <div className="receipt-line mt-4 border-t border-dashed border-dark">
            <span>Order ID</span>
            <span>{sessionId.slice(-12)}</span>
          </div>

          <h2 className="micro mt-6 border-t-2 border-dashed border-dark pt-4 font-normal">
            What happens next?
          </h2>
          <ul>
            {NEXT_STEPS.map((step) => (
              <li key={step} className="receipt-line">
                <span>{step}</span>
                <span className="text-primary" aria-hidden="true">✓</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-between border-t-2 border-dashed border-dark pt-4 text-[15px] font-bold">
            <span>YOU BELONG HERE.</span>
            <span aria-hidden="true">✓</span>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn btn-primary justify-between gap-6">
            Continue shopping <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/gallery" className="btn btn-outline justify-between gap-6">
            View gallery <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Processing label="Loading..." />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
