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
  images: [
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/a-ok-lids-front-modeled.png?v=1746932606",
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/50PulloverHoodie.png?v=1746932606",
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/Photo_on_5-6-25_at_10.16_AM.jpg?v=1746932588"
  ],
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
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
      image: MONTHLY_DEAL.images[0],
      variantId: `${MONTHLY_DEAL.id}-${selectedSize}-${selectedColor}`,
      size: selectedSize,
      color: selectedColor
    };

    addToCart(cartItem);
    
    // Reset selections after adding to cart
    setSelectedSize("");
    setSelectedColor("");
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
    <div className="container mx-auto py-6 px-8 md:px-16 lg:px-24 xl:px-32">
      {/* Compact Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bebas-neue text-dark mb-2">
          MONTHLY DEALS
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-4">
          Exclusive limited-time offers. New design every month.
        </p>
        {/* Inline Deal Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg py-3 px-6 inline-block">
          <span className="font-bebas-neue text-lg mr-2">LIMITED TIME:</span>
          <span className="text-base">Save ${savings.toFixed(2)} ({savingsPercent}% off) - October 2025 Only</span>
        </div>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
        {/* Product Image Carousel */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 border-2 border-[#1F1F1F]">
            <Image
              src={MONTHLY_DEAL.images[selectedImageIndex]}
              alt={MONTHLY_DEAL.title}
              fill
              className="object-cover"
              priority
              key={selectedImageIndex} // Force re-render when index changes
            />
            {/* Debug info */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Image {selectedImageIndex + 1}
            </div>
          </div>
          
          {/* Image Thumbnails */}
          <div className="flex gap-2 justify-center">
            {MONTHLY_DEAL.images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log(`Clicked thumbnail ${index}, setting selectedImageIndex to ${index}`);
                  setSelectedImageIndex(index);
                }}
                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImageIndex === index 
                    ? 'border-[#1F1F1F] scale-105' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Image
                  src={image}
                  alt={`${MONTHLY_DEAL.title} view ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
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
    </div>
  );
}