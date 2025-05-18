"use client";

import { useEffect, useState } from "react";

export default function GameEmbed() {
  const [gameUrl, setGameUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set this to your deployed game URL
    const url = "https://v0-retro-style-game-concept.vercel.app/";
    setGameUrl(url);

    // Set a timeout to handle cases where the iframe fails to load
    const timer = setTimeout(() => {
      if (isLoading) {
        setError(
          "The game is taking longer than expected to load. Please refresh the page or try again later."
        );
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setError(
      "Failed to load the game. Please check your internet connection and try again."
    );
    setIsLoading(false);
  };

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
      <div className="aspect-video w-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1E1E1E]">
            <p className="text-gray-400">Loading game...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1E1E1E] text-center p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        <iframe
          src={gameUrl}
          className={`w-full h-full border-0 ${
            isLoading || error ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Chaos Monkey Game"
        />
      </div>
    </div>
  );
}
