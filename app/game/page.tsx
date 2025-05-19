"use client";

import ChaosMonkey from "./components/ChaosMonkey";

export default function GamePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="w-full max-w-4xl mx-auto">
        <ChaosMonkey />
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Use arrow keys to move. Collect UBI credits to win!
        </p>
      </div>
    </div>
  );
}
