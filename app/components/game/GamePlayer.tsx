"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import the game with no SSR (it draws to a canvas)
const RunHumanRun = dynamic(
  () => import("../../modules/game/components/RunHumanRun"),
  { ssr: false }
);

/** Run, Human, Run!: the start screen and the game, used by /game and the game modal. */
export default function GamePlayer() {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [tokensCollected, setTokensCollected] = useState(0);
  const handleGameComplete = useCallback((success: boolean) => {
    console.log("Game completed with success:", success);
    // Game handles its own win modal and discount code display
  }, []);

  return (
    <RunHumanRun
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
  );
}
