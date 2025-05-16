"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useInView } from "react-intersection-observer";

interface GalleryImage {
  url: string;
  name?: string;
  source?: string;
  date?: string;
}

type ImageSource = string | GalleryImage;

interface ImageGridProps {
  images: ImageSource[];
  title: string;
}

// Define possible cell sizes for the bento box layout
type CellSize = "small" | "medium" | "large" | "tall" | "wide";

interface BentoCell {
  id: string;
  src: string;
  size: CellSize;
}

export default function ImageGrid({ images, title }: ImageGridProps) {
  // Filter out invalid images before any logic
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (typeof img === "string") return !!img && img.length > 0;
      return img && typeof img.url === "string" && img.url.length > 0;
    });
  }, [images]);

  const [bentoCells, setBentoCells] = useState<BentoCell[]>([]);
  const [layoutSeed, setLayoutSeed] = useState<number>(0);
  const [hasImages, setHasImages] = useState<boolean>(false);
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  // Helper to get URL from either string or image object
  const getImageUrl = (img: ImageSource): string => {
    if (typeof img === "string") return img;
    // Make sure the URL is valid
    if (!img.url) return "";
    return img.url;
  };

  // Generate a new bento box layout
  const generateBentoLayout = (imgs: ImageSource[]): BentoCell[] => {
    if (!imgs || !imgs.length) return [];

    try {
      // Use a safer way to determine window size that works on both client and server
      let isMobile = false;
      let isTablet = false;

      if (typeof window !== "undefined") {
        isMobile = window.innerWidth <= 768;
        isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
      }

      // Adjust number of images based on screen size
      const maxImages = isMobile ? 8 : isTablet ? 10 : 12;
      const imagesToUse = [...imgs].slice(0, maxImages);

      // Assign a size to each image and filter out invalid ones
      const cells: BentoCell[] = [];

      for (let index = 0; index < imagesToUse.length; index++) {
        const img = imagesToUse[index];
        // Make sure we have a valid image URL
        const src = getImageUrl(img);
        if (!src) continue; // Skip invalid images

        // Use different probability distributions based on layout seed
        // to create variety in layouts over time
        const random = Math.random() + ((layoutSeed * 0.1) % 1);

        let size: CellSize;
        if (random < 0.5) {
          size = "small"; // 50% chance for small cells
        } else if (random < 0.7) {
          size = "medium"; // 20% chance for medium cells
        } else if (random < 0.8) {
          size = "large"; // 10% chance for large cells
        } else if (random < 0.9) {
          size = "tall"; // 10% chance for tall cells
        } else {
          size = "wide"; // 10% chance for wide cells
        }

        // Ensure we don't have too many large cells
        // Convert some to small if we're past the first few items
        if (
          (size === "large" || size === "wide" || size === "tall") &&
          index > 5
        ) {
          // 50% chance to downgrade to small for later items
          if (Math.random() > 0.5) {
            size = "small";
          }
        }

        cells.push({
          id: `${src}-${index}-${layoutSeed}`,
          src,
          size,
        });
      }

      return cells;
    } catch (error) {
      console.error("Error generating bento layout:", error);
      return [];
    }
  };

  // Initialize layout when images change or come into view
  useEffect(() => {
    if (!filteredImages || !Array.isArray(filteredImages)) {
      console.error("ImageGrid received invalid images:", filteredImages);
      setHasImages(false);
      return;
    }
    const validImages = filteredImages;

    // Debug logging to understand what images we're working with
    console.log("ImageGrid received images:", validImages.length);
    validImages.forEach((img, index) => {
      if (index < 5) {
        // Log just the first few to avoid console spam
        console.log(
          `Image ${index}:`,
          typeof img === "string"
            ? img
            : `${img.source || "unknown"} - ${img.url}`
        );
      }
    });

    setHasImages(validImages.length > 0);

    // Only proceed if we have valid images and we're in view
    if (validImages.length > 0) {
      try {
        // Use a safer approach to shuffle the images
        const shuffled = [...validImages].sort(() => Math.random() - 0.5);
        const newLayout = generateBentoLayout(shuffled);
        console.log("Generated layout with cells:", newLayout.length);

        // Only update state if we have a valid layout
        if (newLayout.length > 0) {
          setBentoCells(newLayout);
        } else {
          console.warn("Generated empty layout, not updating state");
        }
      } catch (error) {
        console.error("Error generating image layout:", error);
        setBentoCells([]);
      }
    }
  }, [filteredImages]);

  // Change layout periodically
  useEffect(() => {
    if (!inView || !hasImages) return;

    const interval = setInterval(() => {
      try {
        // Change the layout seed to get a new arrangement
        setLayoutSeed((prev) => prev + 1);

        const validImages = filteredImages || [];
        if (validImages.length === 0) return;

        // Shuffle images and regenerate layout
        const shuffled = [...validImages].sort(() => Math.random() - 0.5);
        const newLayout = generateBentoLayout(shuffled);

        if (newLayout.length === 0) return;

        // Animate the transition
        setBentoCells((prev) => {
          // Apply the new layout with a slight delay for each cell
          return newLayout.map((cell, i) => {
            const prevCell = prev[i] || { id: `fallback-${i}` };
            return {
              ...cell,
              // Keep the same ID to prevent full remount, but change other properties
              id: prevCell.id || cell.id,
            };
          });
        });
      } catch (error) {
        console.error("Error updating image layout:", error);
      }
    }, 5000); // Change layout every 5 seconds

    return () => clearInterval(interval);
  }, [inView, filteredImages, hasImages, generateBentoLayout]);

  // Get the appropriate CSS classes for each cell size
  const getCellClasses = (size: CellSize) => {
    const baseClasses =
      "relative overflow-hidden rounded-lg border-2 border-[#1F1F1F] transition-all duration-700 ease-in-out bento-cell";

    switch (size) {
      case "small":
        return `${baseClasses} col-span-1 row-span-1`;
      case "medium":
        return `${baseClasses} col-span-1 row-span-2`;
      case "large":
        return `${baseClasses} col-span-2 row-span-2`;
      case "tall":
        return `${baseClasses} col-span-1 row-span-3`;
      case "wide":
        return `${baseClasses} col-span-2 row-span-1`;
      default:
        return `${baseClasses} col-span-1 row-span-1`;
    }
  };

  // Show a placeholder if there are no images or cells
  if (!hasImages || bentoCells.length === 0) {
    return (
      <div className="w-full">
        <div className="bento-grid-placeholder bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading image grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full">
      <div className="bento-grid">
        {bentoCells.map((cell, index) => (
          <div
            key={cell.id}
            className={getCellClasses(cell.size)}
            style={{
              transform: inView ? "scale(1)" : "scale(0.95)",
              opacity: inView ? 1 : 0.5,
              transition: `all ${0.3 + index * 0.05}s ease-in-out`,
            }}
          >
            {cell.src.startsWith("https://") ? (
              // Use regular img tag for external images to avoid Next.js Image component CORS issues
              <img
                src={cell.src}
                alt={`Chaos Monkey Art ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                loading="lazy"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error(`Failed to load external image: ${cell.src}`);
                  // Remove the fallback to prevent redundant loading
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              // Use Next.js Image component for local images
              <Image
                src={cell.src}
                alt={`Chaos Monkey Art ${index + 1}`}
                fill
                className="object-cover hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized={false}
                onError={(e) => {
                  console.error(`Failed to load local image: ${cell.src}`);
                  // Hide the image on error instead of trying to load a fallback
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="bento-red-border"></div>
    </div>
  );
}
