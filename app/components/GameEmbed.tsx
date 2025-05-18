"use client";

import { useEffect, useState } from "react";

export default function GameEmbed() {
  const [gameUrl, setGameUrl] = useState("");

  useEffect(() => {
    // Set this to your deployed game URL
    setGameUrl("https://v0-retro-style-game-concept.vercel.app/");
  }, []);

  if (!gameUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg border border-gray-700 p-8 text-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg border border-gray-700">
      <div className="flex items-center bg-[#333333] px-4 py-2 border-b border-gray-700">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="ml-4 text-gray-300 text-sm font-mono">
          chaos_monkey.tsx
        </div>
      </div>
      <div className="aspect-video w-full">
        <iframe
          src={gameUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
