"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AnimatedLogo() {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [dashAnimationState, setDashAnimationState] = useState('initial');
  const animationRef = useRef<HTMLDivElement>(null);
  const dashAnimationTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Initial animation on page load
  useEffect(() => {
    if (isAnimating) {
      const duration = isHovered ? 2500 : 5000; // Half the time (double speed) when hovering
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Start the dash animation cycle after the initial animation completes
        startDashAnimationCycle();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isAnimating, isHovered]);
  
  // Handle the dash animation cycle
  const startDashAnimationCycle = () => {
    // Clear any existing animation timer
    if (dashAnimationTimer.current) {
      clearTimeout(dashAnimationTimer.current);
    }
    
    // Start with the dash visible
    setDashAnimationState('visible');
    console.log('Dash animation: visible');
    
    // After 2000ms, fade out the dash
    dashAnimationTimer.current = setTimeout(() => {
      setDashAnimationState('fadeOut');
      console.log('Dash animation: fadeOut');
      
      // After another 2000ms, fade in the dash
      dashAnimationTimer.current = setTimeout(() => {
        setDashAnimationState('fadeIn');
        console.log('Dash animation: fadeIn');
        
        // After another 2000ms, flip the dash
        dashAnimationTimer.current = setTimeout(() => {
          setDashAnimationState('flip');
          console.log('Dash animation: flip');
          
          // After another 10000ms, restart the cycle
          dashAnimationTimer.current = setTimeout(() => {
            startDashAnimationCycle();
          }, 10000);
        }, 2000);
      }, 2000);
    }, 2000);
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (dashAnimationTimer.current) {
        clearTimeout(dashAnimationTimer.current);
      }
    };
  }, []);

  // Handle hover animation
  const handleMouseEnter = () => {
    if (!isAnimating) {
      // Clear the dash animation cycle when starting hover animation
      if (dashAnimationTimer.current) {
        clearTimeout(dashAnimationTimer.current);
      }
      setIsHovered(true);
      setIsAnimating(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Link 
      href="/" 
      className="flex items-center space-x-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={animationRef}
        className={`relative w-[120px] h-[48px] overflow-hidden ${isAnimating ? isHovered ? 'animating hover-speed' : 'animating' : ''}`}
      >
        {/* SVG Animation Container */}
        <div className="logo-animation-container">
          {/* A letter - appears first */}
          <div className={`logo-letter logo-a ${isAnimating ? 'animate-a' : ''}`}>
            <Image 
              src="/a-ok-dot-shop-static.svg" 
              alt="A-OK Logo" 
              width={120} 
              height={48}
              className="logo-image clip-a"
            />
          </div>
          
          {/* Dash - appears second and has special animation cycle */}
          <div className={`logo-letter logo-dash ${isAnimating ? 'animate-dash' : `dash-${dashAnimationState}`}`}>
            <div className="dash-container">
              <Image 
                src="/a-ok-dot-shop-static.svg" 
                alt="A-OK Logo" 
                width={120} 
                height={48}
                className="logo-image clip-dash"
              />
            </div>
          </div>
          
          {/* O letter - appears third */}
          <div className={`logo-letter logo-o ${isAnimating ? 'animate-o' : ''}`}>
            <Image 
              src="/a-ok-dot-shop-static.svg" 
              alt="A-OK Logo" 
              width={120} 
              height={48}
              className="logo-image clip-o"
            />
          </div>
          
          {/* K letter - appears fourth */}
          <div className={`logo-letter logo-k ${isAnimating ? 'animate-k' : ''}`}>
            <Image 
              src="/a-ok-dot-shop-static.svg" 
              alt="A-OK Logo" 
              width={120} 
              height={48}
              className="logo-image clip-k"
            />
          </div>
          
          {/* Dot - appears fifth */}
          <div className={`logo-letter logo-dot ${isAnimating ? 'animate-dot' : ''}`}>
            <Image 
              src="/a-ok-dot-shop-static.svg" 
              alt="A-OK Logo" 
              width={120} 
              height={48}
              className="logo-image clip-dot"
            />
          </div>
          
          {/* Shop - appears last */}
          <div className={`logo-letter logo-shop ${isAnimating ? 'animate-shop' : ''}`}>
            <Image 
              src="/a-ok-dot-shop-static.svg" 
              alt="A-OK Logo" 
              width={120} 
              height={48}
              className="logo-image clip-shop"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
