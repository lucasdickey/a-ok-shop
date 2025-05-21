"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

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

  const handleGameComplete = useCallback((success: boolean) => {
    console.log("Game completed with success:", success);
  }, []);

  return (
    <div className="container mx-auto py-8">
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
    </div>
  );
}