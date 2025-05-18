"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Game Embed Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function GameEmbed() {
  const [gameUrl, setGameUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const loadGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `https://v0-retro-style-game-concept.vercel.app/?t=${timestamp}`;

      // Test if the game URL is accessible
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`Game server returned ${response.status}`);
      }

      setGameUrl(url);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading game:", err);
      if (retryCount < maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount((c) => c + 1);
        // Retry after a delay
        setTimeout(loadGame, 2000 * (retryCount + 1));
      } else {
        setError("Failed to load the game. Please try again later.");
        setIsLoading(false);
      }
    }
  }, [retryCount]);

  useEffect(() => {
    loadGame();
    // Cleanup function to prevent memory leaks
    return () => {
      // Any cleanup if needed
    };
  }, [loadGame]);

  const handleRetry = () => {
    setRetryCount(0);
    loadGame();
  };

  const errorFallback = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-red-500 mb-4">Game is currently unavailable</p>
      <button
        onClick={handleRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const loadingState = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <span className="ml-2">Loading game...</span>
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {isLoading && loadingState}
        {error && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {!isLoading && !error && (
          <iframe
            src={gameUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Chaos Monkey Game"
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
