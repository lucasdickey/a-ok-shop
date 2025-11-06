"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function TextAnimatedLogo() {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [dotAnimationState, setDotAnimationState] = useState("dot");
  const dotAnimationTimer = useRef<NodeJS.Timeout | null>(null);

  // Initial animation on page load
  useEffect(() => {
    if (isAnimating) {
      const duration = isHovered ? 1250 : 2500; // Double speed for initial load
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Start the dot animation cycle after the initial animation completes
        startDotAnimationCycle();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isAnimating, isHovered]);

  // Handle the dot animation cycle
  const startDotAnimationCycle = (isHoverTriggered = false) => {
    // Clear any existing animation timer
    if (dotAnimationTimer.current) {
      clearTimeout(dotAnimationTimer.current);
    }

    // Start with the single dot visible
    setDotAnimationState("dot");

    // For hover, start the animation immediately
    const initialDelay = isHoverTriggered ? 0 : 2000;

    // Animation sequence with vertical dots
    dotAnimationTimer.current = setTimeout(() => {
      // Expand to three vertical dots
      setDotAnimationState("threeDots");

      // After showing three dots, combine back to single dot
      dotAnimationTimer.current = setTimeout(() => {
        setDotAnimationState("combineToDot");

        // After completing the sequence, wait before restarting
        const restartDelay = isHoverTriggered ? 3000 : 10000;
        dotAnimationTimer.current = setTimeout(() => {
          startDotAnimationCycle(isHoverTriggered);
        }, restartDelay);
      }, 1500);
    }, initialDelay);
  };

  // Start the dot animation cycle when the component mounts
  useEffect(() => {
    // Only start the animation if we're not in the initial loading state
    if (!isAnimating) {
      startDotAnimationCycle();
    }

    // Clean up any timers when the component unmounts
    return () => {
      if (dotAnimationTimer.current) {
        clearTimeout(dotAnimationTimer.current);
      }
    };
  }, [isAnimating]);

  // Handle hover events
  const handleMouseEnter = () => {
    // Start the dot animation immediately when hovered
    startDotAnimationCycle(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);

    // Reset to initial state when mouse leaves
    if (!isAnimating) {
      startDotAnimationCycle(); // Reset to normal animation cycle
    }
  };

  return (
    <Link
      href="/"
      className="flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="logo-text-container">
        {/* A letter - appears first */}
        <span className={`logo-letter ${isAnimating ? "animate-a" : ""}`}>
          A
        </span>

        {/* Dot - appears second and has special animation cycle */}
        <span
          className={`logo-dot ${
            isAnimating ? "animate-dot" : `dot-${dotAnimationState}`
          }`}
        >
          <span className="single-dot"> · </span>
          <span className="vertical-dots"> ⋮ </span>
        </span>

        {/* OK letters - appear third and fourth */}
        <span className={`logo-letter ${isAnimating ? "animate-o" : ""}`}>
          O
        </span>
        <span className={`logo-letter ${isAnimating ? "animate-k" : ""}`}>
          K
        </span>

        {/* Dot - appears fifth */}
        <span className={`logo-letter ${isAnimating ? "animate-dot" : ""}`}>
          .
        </span>

        {/* Shop - appears last */}
        <span
          className={`logo-letter shop-text ${
            isAnimating ? "animate-shop" : ""
          }`}
        >
          shop
        </span>
      </div>
    </Link>
  );
}
