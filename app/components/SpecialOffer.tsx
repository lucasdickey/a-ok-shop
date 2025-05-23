"use client";

import React, { useState, useEffect } from "react";

interface DiscountInfo {
  percentage?: number;
  expiresAt?: string;
  note?: string;
  error?: string;
}

export default function SpecialOffer() {
  const [discountCode, setDiscountCode] = useState<string>("");
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>("");

  // Auto-generate discount code when component mounts (for game wins)
  useEffect(() => {
    if (!discountCode && !showCode && !isLoading) {
      generateDiscountCode();
    }
  }, [discountCode, showCode, isLoading]);

  const generateDiscountCode = async () => {
    console.log("generateDiscountCode called");
    setIsLoading(true);
    setError("");

    try {
      console.log("Making API call to /api/discount");
      const response = await fetch("/api/discount", {
        method: "POST",
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error(`Failed to generate discount: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      if (data.code) {
        setDiscountCode(data.code);
        setDiscountInfo({
          percentage: data.percentage,
          expiresAt: data.expiresAt,
          note: data.note,
          error: data.error,
        });
        setShowCode(true);
        console.log("Successfully set discount code:", data.code);
      } else {
        throw new Error("No discount code received");
      }
    } catch (error) {
      console.error("Error generating discount code:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate discount code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = discountCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpirationDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="bg-dark border-2 border-dark text-light rounded-lg my-12 relative overflow-hidden"
      style={{ fontFamily: "var(--font-space-grotesk)" }}
    >
      {/* Main Content */}
      <div className="p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2
            className="text-4xl md:text-5xl font-bold mb-2 text-light tracking-wide"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            {showCode ? "YOUR EXCLUSIVE DISCOUNT" : "SPECIAL OFFER"}
          </h2>
          <p className="text-xl text-secondary-light font-medium">
            Get {discountInfo.percentage || 25}% off your entire order
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-primary-light/20 border border-primary-light rounded-lg p-4 mb-6 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-primary-light text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-light font-medium">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="mt-2 text-sm text-secondary hover:text-light underline transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Button State */}
        {!showCode && !error && (
          <div className="text-center animate-fadeIn">
            <button
              onClick={() => {
                console.log("Button clicked!");
                generateDiscountCode();
              }}
              disabled={isLoading}
              className={`
                btn btn-primary text-lg px-8 py-4 rounded-lg font-semibold
                transition-all duration-300 transform hover:scale-105 hover:bg-primary-light
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${isLoading ? "animate-pulse" : ""}
              `}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-light border-t-transparent rounded-full animate-spin" />
                  GENERATING...
                </span>
              ) : (
                "GET YOUR DISCOUNT CODE"
              )}
            </button>
          </div>
        )}

        {/* Success State */}
        {showCode && (
          <div className="animate-slideUp">
            <div className="bg-secondary rounded-lg p-6 border-2 border-secondary-dark">
              <div className="text-center mb-6">
                <p className="text-dark font-medium mb-4">
                  Your exclusive discount code:
                </p>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <div
                    onClick={copyToClipboard}
                    className="cursor-pointer group flex items-center gap-3 bg-dark text-secondary px-6 py-3 rounded border-2 border-dark hover:bg-dark-light transition-all duration-300"
                  >
                    <code
                      className="text-3xl md:text-4xl font-bold tracking-widest"
                      style={{ fontFamily: "var(--font-bebas-neue)" }}
                    >
                      {discountCode}
                    </code>
                    <span className="text-secondary group-hover:text-light transition-colors text-lg">
                      {copied ? "✓" : "📋"}
                    </span>
                  </div>
                </div>

                {copied && (
                  <p className="text-primary font-medium text-sm animate-fadeIn">
                    Copied to clipboard!
                  </p>
                )}
              </div>

              {/* Discount Details */}
              <div className="bg-light rounded p-4 mb-4 border border-secondary-dark">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">💰</span>
                  <p className="text-dark font-bold text-lg">
                    SAVE {discountInfo.percentage || 25}% AT CHECKOUT
                  </p>
                </div>

                {discountInfo.expiresAt && (
                  <p className="text-dark-light text-sm text-center">
                    Valid until {formatExpirationDate(discountInfo.expiresAt)}
                  </p>
                )}
              </div>

              {/* Development Note - only show in development */}
              {process.env.NODE_ENV === "development" && discountInfo.note && (
                <div className="bg-primary/10 border border-primary/20 rounded p-3 mb-4">
                  <p className="text-dark text-sm">
                    <span className="font-medium">ℹ️ Dev Note:</span>{" "}
                    {discountInfo.note}
                  </p>
                </div>
              )}

              {/* Call to Action */}
              <div className="text-center">
                <p className="text-dark font-medium mb-3">
                  Ready to save? Start shopping!
                </p>
                <a
                  href="/products"
                  className="btn btn-primary px-6 py-3 rounded font-semibold hover:bg-primary-light transition-colors"
                >
                  SHOP NOW
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
