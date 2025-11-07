import React from 'react';

export const metadata = {
  title: 'Return Policy | A-OK Shop',
  description: 'Return and refund policy for A-OK Shop'
};

export default function ReturnPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Return & Refund Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Effective Date:</strong> November 6, 2025
        </p>

        <p className="mb-6">
          We want you to love your A-OK Shop purchase! Please read our return policy carefully before
          ordering.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Just-In-Time Manufacturing</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
            <p className="text-lg font-semibold mb-2">All Sales Are Final</p>
            <p className="mb-4">
              Because we use <strong>just-in-time manufacturing</strong>, each product is made
              specifically for you when you order. Once production begins, we cannot accept returns
              or cancellations.
            </p>
            <p className="text-sm text-gray-700">
              <em>This policy may change in the future as we build inventory, but for now all sales
              are final to support our sustainable, on-demand production model.</em>
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Cancellations</h2>
          <p className="mb-4">
            Once your order is placed, production begins immediately. We <strong>cannot cancel or
            modify orders</strong> after they are submitted.
          </p>
          <p className="mb-4">
            Please double-check your size, color, and shipping address before completing your purchase.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Defective or Damaged Items</h2>
          <p className="mb-4">
            If you receive a defective or damaged item, please contact us immediately:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Email photos of the defect/damage to returns@a-ok.shop</li>
            <li>Include your order number in the subject line</li>
            <li>We'll provide a prepaid return label and issue a full refund or replacement</li>
          </ul>
          <p className="mb-4">
            Please report defects within <strong>7 days</strong> of receiving your order.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Wrong Item Received</h2>
          <p className="mb-4">
            If we shipped the wrong item:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Contact us immediately with photos of the item you received</li>
            <li>We'll send a prepaid return label at no cost to you</li>
            <li>We'll manufacture and ship the correct item</li>
            <li>Or provide a full refund if you prefer</li>
          </ul>
          <p className="text-sm text-gray-600">
            Report incorrect items within <strong>7 days</strong> of delivery.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">AI-Powered Purchases</h2>
          <p className="mb-4">
            If you purchased through an AI assistant (like ChatGPT):
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>The same policy applies - all sales are final</li>
            <li>Exceptions for defective or incorrect items still apply</li>
            <li>Reference your order number in all communications</li>
            <li>Contact returns@a-ok.shop for defects or errors</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            Have questions about returns? We're here to help!
          </p>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="mb-2">
              <strong>Returns Email:</strong>{' '}
              <a href="mailto:returns@a-ok.shop" className="text-blue-600 hover:underline">
                returns@a-ok.shop
              </a>
            </p>
            <p className="mb-2">
              <strong>General Support:</strong>{' '}
              <a href="mailto:info@a-ok.shop" className="text-blue-600 hover:underline">
                info@a-ok.shop
              </a>
            </p>
            <p className="mb-2">
              <strong>Website:</strong>{' '}
              <a href="https://www.a-ok.shop" className="text-blue-600 hover:underline">
                www.a-ok.shop
              </a>
            </p>
            <p className="mb-2">
              <strong>Response Time:</strong> Within 24-48 hours (Monday-Friday)
            </p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            This return policy was last updated on November 6, 2025.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            We reserve the right to refuse returns that don't meet our return policy requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
