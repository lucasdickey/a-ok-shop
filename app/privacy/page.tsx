import React from 'react';

export const metadata = {
  title: 'Privacy Policy | A-OK Shop',
  description: 'Privacy policy for A-OK Shop'
};

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Effective Date:</strong> November 6, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            When you purchase from A-OK Shop, we collect information necessary to complete your order:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Contact Information:</strong> Name, email address, phone number</li>
            <li><strong>Shipping Information:</strong> Delivery address</li>
            <li><strong>Payment Information:</strong> Processed securely by Stripe (we never store your card details)</li>
            <li><strong>Order History:</strong> Products purchased, order dates, and amounts</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Process and fulfill your orders</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Respond to customer service inquiries</li>
            <li>Improve our products and services</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We share your information only with trusted partners necessary to fulfill your order:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Payment Processor:</strong> Stripe processes all payments securely</li>
            <li><strong>Shipping Carriers:</strong> We share delivery information with shipping providers</li>
            <li><strong>AI Agents:</strong> When you shop via ChatGPT or other AI assistants, they facilitate
 your purchase on your behalf</li>
          </ul>
          <p className="mb-4">
            We <strong>never sell</strong> your personal information to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement industry-standard security measures to protect your information:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>All data transmitted via HTTPS encryption</li>
            <li>Payment data handled exclusively by PCI-compliant Stripe</li>
            <li>Regular security audits and monitoring</li>
            <li>Limited employee access to personal data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct your information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
          </ul>
          <p className="mb-4">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@a-ok.shop" className="text-blue-600 hover:underline">
              privacy@a-ok.shop
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Cookies and Tracking</h2>
          <p className="mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Remember your cart contents</li>
            <li>Analyze site traffic and usage patterns</li>
            <li>Improve site performance and user experience</li>
          </ul>
          <p className="mb-4">
            You can control cookies through your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. AI-Powered Shopping</h2>
          <p className="mb-4">
            When you shop through AI assistants like ChatGPT:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>The AI agent facilitates your purchase on your behalf</li>
            <li>Your payment information is securely tokenized and never exposed</li>
            <li>We share order status updates with the AI platform to keep you informed</li>
            <li>Your conversation with the AI is subject to that platform's privacy policy</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
          <p className="mb-4">
            Our service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this privacy policy from time to time. We'll notify you of significant
            changes by email or by posting a notice on our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
          <p className="mb-4">
            If you have questions about this privacy policy, please contact us:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@a-ok.shop" className="text-blue-600 hover:underline">
                privacy@a-ok.shop
              </a>
            </p>
            <p className="mb-2">
              <strong>Website:</strong>{' '}
              <a href="https://www.a-ok.shop" className="text-blue-600 hover:underline">
                www.a-ok.shop
              </a>
            </p>
            <p>
              <strong>Mail:</strong> A-OK Shop, c/o Apes on Keys
            </p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            This privacy policy was last updated on November 6, 2025.
          </p>
        </div>
      </div>
    </div>
  );
}
