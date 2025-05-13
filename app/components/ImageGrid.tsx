"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useInView } from "react-intersection-observer";

interface ImageGridProps {
  images: string[];
  title: string;
}

export default function ImageGrid({ images, title }: ImageGridProps) {
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  // Shuffle the images when they come into view
  useEffect(() => {
    if (inView) {
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      setShuffledImages(shuffled);
    }
  }, [inView, images]);

  // Shuffle images periodically
  useEffect(() => {
    if (!inView) return;

    const interval = setInterval(() => {
      // Randomly select 2-4 images to swap
      const numSwaps = Math.floor(Math.random() * 3) + 2;
      
      setShuffledImages(prev => {
        const newOrder = [...prev];
        
        for (let i = 0; i < numSwaps; i++) {
          const idx1 = Math.floor(Math.random() * newOrder.length);
          const idx2 = Math.floor(Math.random() * newOrder.length);
          
          // Swap two random images
          [newOrder[idx1], newOrder[idx2]] = [newOrder[idx2], newOrder[idx1]];
        }
        
        return newOrder;
      });
    }, 2000); // Shuffle every 2 seconds

    return () => clearInterval(interval);
  }, [inView]);

  return (
    <div ref={ref} className="w-full">
      <h2 className="text-4xl md:text-5xl font-bebas-neue mb-6 text-center">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {shuffledImages.map((src, index) => (
          <div 
            key={src + index} 
            className="aspect-square relative overflow-hidden rounded-lg border-2 border-[#1F1F1F] transition-all duration-500 ease-in-out"
            style={{ 
              transform: inView ? 'scale(1)' : 'scale(0.95)',
              opacity: inView ? 1 : 0.5,
              transition: `all ${0.3 + index * 0.05}s ease-in-out`
            }}
          >
            <Image
              src={src}
              alt={`Chaos Monkey Art ${index + 1}`}
              fill
              className="object-cover hover:scale-110 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
