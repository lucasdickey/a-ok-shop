"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart, CartItem } from "@/app/components/cart/CartProvider";

// Monthly deal product data - will be updated monthly
const MONTHLY_DEAL = {
  id: "monthly-deal-2025-01",
  title: "A-OK DAY 2 MONKEY HOODIE",
  description: "Simplified. Streamlined. Still A Little Scary. A hoodie designed to reflect the clean, evolving interfaces of modern LLMs with a focus on comfort and style. New look. Same depth. Fully backward compatible.",
  price: 50.00,
  originalPrice: 75.00,
  image: "/images/a-ok-o-face.png",
  sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
  colors: ["Black", "Navy", "Heather Grey"],
  features: [
    "Cozy fleece interior",
    "Simplified A-OK mascot on front",
    "Classic hoodie fit",
    "Designed for prompt engineers & digital therapists",
    "Limited monthly release"
  ]
};

export default function MonthlyDealsPage() {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const { cart, addToCart, subtotal, clearCart } = useCart();

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      alert("Please select both size and color");
      return;
    }

    const cartItem: CartItem = {
      id: `${MONTHLY_DEAL.id}-${selectedSize}-${selectedColor}`,
      title: `${MONTHLY_DEAL.title} - ${selectedSize} - ${selectedColor}`,
      price: MONTHLY_DEAL.price,
      quantity: 1,
      image: MONTHLY_DEAL.image,
      variantId: `${MONTHLY_DEAL.id}-${selectedSize}-${selectedColor}`,
      size: selectedSize,
      color: selectedColor
    };

    addToCart(cartItem);
    
    // Reset selections after adding to cart
    setSelectedSize("");
    setSelectedColor("");
    
    alert("Added to cart!");
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessingCheckout(true);

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/monthly-deals/create-checkout-session", {
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
      
      // Clear cart before redirecting to Stripe
      clearCart();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("There was an error processing your order. Please try again.");
      setIsProcessingCheckout(false);
    }
  };

  const savings = MONTHLY_DEAL.originalPrice - MONTHLY_DEAL.price;
  const savingsPercent = Math.round((savings / MONTHLY_DEAL.originalPrice) * 100);

  return (
    <div className="container mx-auto py-8 px-8 md:px-16 lg:px-24 xl:px-32">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bebas-neue text-dark mb-4">
          MONTHLY DEALS
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Exclusive limited-time offers. New design every month. Once it&apos;s gone, it&apos;s gone forever.
        </p>
      </div>

      {/* Deal Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-6 mb-8 text-center">
        <h2 className="text-2xl font-bebas-neue mb-2">LIMITED TIME OFFER</h2>
        <p className="text-lg">
          Save ${savings.toFixed(2)} ({savingsPercent}% off) - Only available in January 2025
        </p>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 border-2 border-[#1F1F1F]">
            <Image
              src={MONTHLY_DEAL.image}
              alt={MONTHLY_DEAL.title}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                // Fallback to placeholder if image doesn't exist
                const target = e.target as HTMLImageElement;
                target.src = "/images/product-placeholder.jpg";
              }}
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bebas-neue text-dark mb-2">
              {MONTHLY_DEAL.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {MONTHLY_DEAL.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bebas-neue text-[#8B1E24]">
              ${MONTHLY_DEAL.price.toFixed(2)}
            </span>
            <span className="text-xl text-gray-400 line-through">
              ${MONTHLY_DEAL.originalPrice.toFixed(2)}
            </span>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              Save {savingsPercent}%
            </span>
          </div>

          {/* Color Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">Color</h3>
            <div className="flex gap-3">
              {MONTHLY_DEAL.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 border-2 rounded-lg transition-all ${
                    selectedColor === color
                      ? "border-[#1F1F1F] bg-[#1F1F1F] text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">Size</h3>
            <div className="flex gap-3 flex-wrap">
              {MONTHLY_DEAL.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border-2 rounded-lg transition-all min-w-[3rem] ${
                    selectedSize === size
                      ? "border-[#1F1F1F] bg-[#1F1F1F] text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!selectedSize || !selectedColor}
            className={`w-full py-4 px-6 rounded-lg font-bebas-neue text-xl tracking-wide transition-all ${
              selectedSize && selectedColor
                ? "bg-[#1F1F1F] text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {!selectedSize || !selectedColor
              ? "SELECT SIZE & COLOR"
              : "ADD TO CART - $" + MONTHLY_DEAL.price.toFixed(2)
            }
          </button>

          {/* Features */}
          <div>
            <h3 className="text-lg font-medium mb-3">Features</h3>
            <ul className="space-y-2">
              {MONTHLY_DEAL.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#8B1E24] rounded-full"></span>
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
          <h3 className="text-xl font-bebas-neue mb-4">CART SUMMARY</h3>
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{item.title} (Qty: {item.quantity})</span>
                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <hr className="border-gray-300" />
            <div className="flex justify-between items-center font-bebas-neue text-lg">
              <span>TOTAL:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={isProcessingCheckout}
            className={`w-full mt-4 py-3 px-6 rounded-lg font-bebas-neue text-lg tracking-wide transition-colors ${
              isProcessingCheckout 
                ? "bg-gray-400 text-gray-600 cursor-not-allowed" 
                : "bg-[#8B1E24] text-white hover:bg-red-800"
            }`}
          >
            {isProcessingCheckout ? "PROCESSING..." : "PROCEED TO CHECKOUT"}
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-16 text-center text-gray-600">
        <p className="mb-2">
          <strong>Free shipping</strong> on all monthly deal orders over $50
        </p>
        <p>
          Items ship within <strong>3-5 business days</strong> after payment confirmation
        </p>
      </div>
    </div>
  );
}