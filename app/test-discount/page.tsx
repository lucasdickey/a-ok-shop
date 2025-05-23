import SpecialOffer from "../components/SpecialOffer";

export default function TestDiscountPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Discount Code Testing
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              • <strong>Without Admin API:</strong> Will generate mock codes
              (AOK-XXXXXX)
            </p>
            <p>
              • <strong>With Admin API:</strong> Will create real 25% discount
              codes in Shopify
            </p>
            <p>
              • <strong>Error Testing:</strong> Try disconnecting internet to
              test error states
            </p>
            <p>
              • <strong>Copy Function:</strong> Test the clipboard functionality
            </p>
            <p>
              • <strong>Animations:</strong> Watch for smooth transitions and
              loading states
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Environment Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Shopify Store Domain</h3>
              <p className="text-sm text-gray-600">
                {process.env.SHOPIFY_STORE_DOMAIN
                  ? "✅ Configured"
                  : "❌ Not configured"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Admin API Token</h3>
              <p className="text-sm text-gray-600">
                {process.env.SHOPIFY_ADMIN_API_TOKEN
                  ? "✅ Configured (Real discounts)"
                  : "❌ Not configured (Mock discounts)"}
              </p>
            </div>
          </div>
        </div>

        {/* The actual Special Offer component */}
        <SpecialOffer />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Testing Checklist
          </h2>
          <div className="space-y-2 text-blue-800">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Discount code generates successfully</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Loading animation works properly</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Copy to clipboard function works</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Success animations are smooth</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Error states display correctly</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>"Generate another code" button works</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Expiration date displays correctly</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>25% discount percentage shows correctly</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
