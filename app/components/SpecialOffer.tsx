"use client";

import React, { useState } from "react";
import Image from "next/image";

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

  const generateDiscountCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discount", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to generate discount: ${response.status}`);
      }

      const data = await response.json();

      if (data.code) {
        setDiscountCode(data.code);
        setDiscountInfo({
          percentage: data.percentage,
          expiresAt: data.expiresAt,
          note: data.note,
          error: data.error,
        });
        setShowCode(true);
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

  const resetOffer = () => {
    setShowCode(false);
    setDiscountCode("");
    setDiscountInfo({});
    setError("");
    setCopied(false);
  };

  return (
    <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg p-8 my-12 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10">
        <div className="w-48 h-48 bg-white/20 rounded-full transform rotate-12 translate-x-12 -translate-y-12" />
      </div>

      <div className="relative z-10">
        <div
          className={`transition-all duration-500 ${
            showCode ? "scale-95 opacity-90" : "scale-100 opacity-100"
          }`}
        >
          <h2 className="text-3xl font-bold mb-4">
            {showCode
              ? "🎉 Your Exclusive Discount!"
              : "Special Offer Just for You!"}
          </h2>
          <p className="text-xl mb-6">
            Get {discountInfo.percentage || 25}% off your entire order today
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-300 rounded-lg p-4 mb-6 animate-fadeIn">
            <p className="text-red-100">⚠️ {error}</p>
            <button
              onClick={() => setError("")}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {!showCode && !error && (
          <div className="animate-fadeIn">
            <button
              onClick={generateDiscountCode}
              disabled={isLoading}
              className={`
                bg-white text-purple-600 px-8 py-3 rounded-full font-semibold text-lg 
                hover:bg-gray-100 transition-all duration-300 transform hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${isLoading ? "animate-pulse" : ""}
              `}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                "Get Your Discount Code"
              )}
            </button>
          </div>
        )}

        {showCode && (
          <div className="animate-slideUp">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto border border-white/30">
              <p className="text-sm mb-3 opacity-90">
                Your exclusive discount code:
              </p>

              <div className="flex items-center justify-center gap-3 mb-4">
                <code className="text-2xl font-mono font-bold bg-white/30 px-4 py-3 rounded border border-white/20 tracking-wider">
                  {discountCode}
                </code>
                <button
                  onClick={copyToClipboard}
                  className={`
                    px-4 py-3 rounded transition-all duration-300 transform hover:scale-105 border border-white/20
                    ${
                      copied
                        ? "bg-green-500/30 text-green-100"
                        : "bg-white/30 hover:bg-white/40"
                    }
                  `}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <span className="flex items-center gap-1">
                      ✓ <span className="text-sm">Copied!</span>
                    </span>
                  ) : (
                    "📋"
                  )}
                </button>
              </div>

              {discountInfo.expiresAt && (
                <p className="text-sm mb-3 opacity-90">
                  ⏰ Valid until {formatExpirationDate(discountInfo.expiresAt)}
                </p>
              )}

              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium">
                  💰 Apply this code at checkout to save{" "}
                  {discountInfo.percentage || 25}%!
                </p>
              </div>

              {discountInfo.note && (
                <p className="text-xs opacity-75 italic mb-3 bg-white/10 rounded p-2">
                  ℹ️ {discountInfo.note}
                </p>
              )}

              {discountInfo.error && (
                <p className="text-xs text-yellow-200 mb-3 bg-yellow-500/20 rounded p-2">
                  ⚠️ Note: {discountInfo.error}
                </p>
              )}

              <button
                onClick={resetOffer}
                className="text-sm underline hover:no-underline opacity-75 hover:opacity-100 transition-opacity"
              >
                Generate another code
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
