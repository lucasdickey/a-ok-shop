"use client";

import dynamic from "next/dynamic";

// Dynamically import the ChaosMonkey component with no SSR
const ChaosMonkey = dynamic(
  () => import("@/v0-retro-style-game-concept/chaos-monkey"),
  { ssr: false }
);

export default function GameEmbed() {
  return (
    <div className="w-full max-w-4xl mx-auto bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg border border-gray-700 p-4">
      <div className="flex items-center bg-[#333333] px-4 py-2 border-b border-gray-700 mb-4">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="ml-4 text-gray-300 text-sm font-mono">
          chaos_monkey.tsx
        </div>
      </div>
      <div className="aspect-square w-full max-w-[600px] mx-auto">
        <ChaosMonkey />
      </div>
    </div>
  );
}
