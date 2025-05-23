"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SpecialOffer from "../components/SpecialOffer";

// Dynamically import the ChaosMonkey component with no SSR
const ChaosMonkey = dynamic(
  () => import("../modules/game/components/ChaosMonkey"),
  { ssr: false }
);

export default function GamePage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [tokensCollected, setTokensCollected] = useState(0);
  const [showDiscountOffer, setShowDiscountOffer] = useState(false);

  const handleGameComplete = useCallback((success: boolean) => {
    console.log("Game completed with success:", success);
    if (success) {
      setShowDiscountOffer(true);
    }
  }, []);

  const handleDismissOffer = () => {
    setShowDiscountOffer(false);
  };

  return (
    <div className="container mx-auto py-8 relative">
      <div className="w-full max-w-4xl mx-auto">
        <ChaosMonkey
          gameStarted={gameStarted}
          setGameStarted={setGameStarted}
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          gameOver={gameOver}
          setGameOver={setGameOver}
          gameWon={gameWon}
          setGameWon={setGameWon}
          discountCode={discountCode}
          setDiscountCode={setDiscountCode}
          tokensCollected={tokensCollected}
          setTokensCollected={setTokensCollected}
          onGameComplete={handleGameComplete}
        />
      </div>

      {/* Discount Offer Overlay */}
      {showDiscountOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl w-full">
            {/* Dismiss Button */}
            <button
              onClick={handleDismissOffer}
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
              aria-label="Close discount offer"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* Special Offer Component */}
            <SpecialOffer />
          </div>
        </div>
      )}
    </div>
  );
}
