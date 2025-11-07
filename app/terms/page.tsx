import React from 'react';

export const metadata = {
  title: 'Terms of Service | A-OK Shop',
  description: 'Terms of service for A-OK Shop'
};

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Effective Date:</strong> November 6, 2025
        </p>

        <p className="mb-6">
          Welcome to A-OK Shop! By accessing or using our website and services, you agree to be
          bound by these Terms of Service. Please read them carefully.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By purchasing from A-OK Shop, whether through our website, mobile app, or via AI-powered
            assistants like ChatGPT, you agree to these terms and conditions. If you do not agree,
            please do not use our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Products and Services</h2>
          <p className="mb-4">
            A-OK Shop sells AI-inspired streetwear and merchandise. We strive to display our products
            as accurately as possible, but we cannot guarantee that colors, designs, or specifications
            will be exactly as shown on your device.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>All prices are in USD unless otherwise stated</li>
            <li>We reserve the right to modify prices at any time</li>
            <li>Product availability is subject to change</li>
            <li>We reserve the right to limit quantities on any product</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Ordering and Payment</h2>
          <p className="mb-4">
            <strong>Order Acceptance:</strong> Your order is an offer to purchase. We reserve the
            right to accept or decline any order for any reason.
          </p>
          <p className="mb-4">
            <strong>Payment:</strong> All payments are processed securely by Stripe. We accept major
            credit cards and other payment methods as displayed at checkout.
          </p>
          <p className="mb-4">
            <strong>Pricing Errors:</strong> If we discover a pricing error after you've placed an
            order, we'll notify you and give you the option to cancel or pay the correct price.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. AI-Powered Shopping</h2>
          <p className="mb-4">
            When you shop via AI assistants (such as ChatGPT):
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>The AI acts as your agent to facilitate the purchase</li>
            <li>You authorize the AI to access product information and create checkout sessions</li>
            <li>Payment is securely tokenized and processed by Stripe</li>
            <li>You are responsible for verifying order details before completing purchase</li>
            <li>The AI platform's terms of service also apply to your interaction with the assistant</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Shipping and Delivery</h2>
          <p className="mb-4">
            We currently ship to the United States and Canada. Delivery times vary by location:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>US:</strong> 3-7 business days (standard shipping)</li>
            <li><strong>Canada:</strong> 7-14 business days</li>
          </ul>
          <p className="mb-4">
            Shipping costs are calculated at checkout based on your location and selected shipping
            method. We are not responsible for delays caused by shipping carriers, customs, or
            circumstances beyond our control.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Returns and Refunds</h2>
          <p className="mb-4">
            See our <a href="/returns" className="text-blue-600 hover:underline">Return Policy</a>{' '}
            for complete details. In summary:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>30-day return window for most items</li>
            <li>Items must be unworn, unwashed, and in original condition</li>
            <li>Refunds issued to original payment method</li>
            <li>Customer responsible for return shipping costs</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
          <p className="mb-4">
            All content on A-OK Shop, including designs, logos, text, and images, is the property
            of Apes on Keys or its licensors and is protected by copyright and trademark laws.
          </p>
          <p className="mb-4">
            You may not use, reproduce, or distribute any content from our site without written
            permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. User Accounts</h2>
          <p className="mb-4">
            If we offer user accounts in the future:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You are responsible for maintaining account security</li>
            <li>You must provide accurate information</li>
            <li>You must be at least 13 years old to create an account</li>
            <li>We reserve the right to terminate accounts that violate these terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Prohibited Uses</h2>
          <p className="mb-4">You may not use our services to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit malware or harmful code</li>
            <li>Engage in fraudulent activities</li>
            <li>Harass, abuse, or harm others</li>
            <li>Attempt to gain unauthorized access to our systems</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
          <p className="mb-4">
            To the fullest extent permitted by law, A-OK Shop and Apes on Keys shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages, including loss
            of profits, data, or goodwill, arising from your use of our services.
          </p>
          <p className="mb-4">
            Our total liability for any claim arising from these terms shall not exceed the amount
            you paid for the product or service in question.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
          <p className="mb-4">
            You agree to indemnify and hold harmless A-OK Shop, its affiliates, and its employees
            from any claims, damages, liabilities, and expenses arising from your use of our services
            or violation of these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
          <p className="mb-4">
            These terms are governed by the laws of the United States and the State of California,
            without regard to conflict of law principles. Any disputes shall be resolved in the courts
            of California.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. We'll notify you of significant
            changes by posting a notice on our website or sending an email. Your continued use of our
            services after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
          <p className="mb-4">
            If any provision of these terms is found to be unenforceable, the remaining provisions
            shall remain in full effect.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
          <p className="mb-4">
            For questions about these Terms of Service, please contact us:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="mb-2">
              <strong>Email:</strong>{' '}
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
              <strong>Twitter:</strong>{' '}
              <a href="https://x.com/apesonkeys" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                @apesonkeys
              </a>
            </p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            These terms of service were last updated on November 6, 2025.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            By using A-OK Shop, you acknowledge that you have read, understood, and agree to be bound
            by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
