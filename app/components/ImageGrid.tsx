"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useInView } from "react-intersection-observer";

interface ImageGridProps {
  images: string[];
  title: string;
}

// Define possible cell sizes for the bento box layout
type CellSize = 'small' | 'medium' | 'large' | 'tall' | 'wide';

interface BentoCell {
  id: string;
  src: string;
  size: CellSize;
}

export default function ImageGrid({ images, title }: ImageGridProps) {
  const [bentoCells, setBentoCells] = useState<BentoCell[]>([]);
  const [layoutSeed, setLayoutSeed] = useState<number>(0);
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  // Generate a new bento box layout
  const generateBentoLayout = (imgs: string[]) => {
    if (!imgs.length) return [];
    
    // Limit the number of images to use based on screen size
    // This helps ensure we don't overflow our fixed-height container
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    // Adjust number of images based on screen size
    const maxImages = isMobile ? 8 : isTablet ? 10 : 12;
    const imagesToUse = [...imgs].slice(0, maxImages);
    
    // Assign a size to each image
    return imagesToUse.map((src, index) => {
      // Use different probability distributions based on layout seed
      // to create variety in layouts over time
      const random = Math.random() + (layoutSeed * 0.1) % 1;
      
      let size: CellSize;
      if (random < 0.5) {
        size = 'small'; // 50% chance for small cells
      } else if (random < 0.7) {
        size = 'medium'; // 20% chance for medium cells
      } else if (random < 0.8) {
        size = 'large'; // 10% chance for large cells
      } else if (random < 0.9) {
        size = 'tall'; // 10% chance for tall cells
      } else {
        size = 'wide'; // 10% chance for wide cells
      }
      
      // Ensure we don't have too many large cells
      // Convert some to small if we're past the first few items
      if ((size === 'large' || size === 'wide' || size === 'tall') && index > 5) {
        // 50% chance to downgrade to small for later items
        if (Math.random() > 0.5) {
          size = 'small';
        }
      }
      
      return {
        id: `${src}-${index}-${layoutSeed}`,
        src,
        size
      };
    });
  };

  // Initialize layout when images change or come into view
  useEffect(() => {
    if (inView && images.length) {
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      const newLayout = generateBentoLayout(shuffled);
      setBentoCells(newLayout);
    }
  }, [inView, images]);

  // Change layout periodically
  useEffect(() => {
    if (!inView) return;

    const interval = setInterval(() => {
      // Change the layout seed to get a new arrangement
      setLayoutSeed(prev => prev + 1);
      
      // Shuffle images and regenerate layout
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      const newLayout = generateBentoLayout(shuffled);
      
      // Animate the transition
      setBentoCells(prev => {
        // Apply the new layout with a slight delay for each cell
        return newLayout.map((cell, i) => ({
          ...cell,
          // Keep the same ID to prevent full remount, but change other properties
          id: prev[i]?.id || cell.id
        }));
      });
    }, 5000); // Change layout every 5 seconds

    return () => clearInterval(interval);
  }, [inView, images]);

  // Get the appropriate CSS classes for each cell size
  const getCellClasses = (size: CellSize) => {
    const baseClasses = "relative overflow-hidden rounded-lg border-2 border-[#1F1F1F] transition-all duration-700 ease-in-out bento-cell";
    
    switch (size) {
      case 'small':
        return `${baseClasses} col-span-1 row-span-1`;
      case 'medium':
        return `${baseClasses} col-span-1 row-span-2`;
      case 'large':
        return `${baseClasses} col-span-2 row-span-2`;
      case 'tall':
        return `${baseClasses} col-span-1 row-span-3`;
      case 'wide':
        return `${baseClasses} col-span-2 row-span-1`;
      default:
        return `${baseClasses} col-span-1 row-span-1`;
    }
  };

  return (
    <div ref={ref} className="w-full">
      <h2 className="text-4xl md:text-5xl font-bebas-neue mb-6 text-center">
        {title}
      </h2>
      <div className="bento-grid">
        {bentoCells.map((cell, index) => (
          <div 
            key={cell.id} 
            className={getCellClasses(cell.size)}
            style={{ 
              transform: inView ? 'scale(1)' : 'scale(0.95)',
              opacity: inView ? 1 : 0.5,
              transition: `all ${0.3 + index * 0.05}s ease-in-out`
            }}
          >
            <Image
              src={cell.src}
              alt={`Chaos Monkey Art ${index + 1}`}
              fill
              className="object-cover hover:scale-110 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
      <div className="bento-red-border"></div>
    </div>
  );
}
