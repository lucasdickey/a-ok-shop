import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Hardcoded external image for today
const TODAY_IMAGE = {
  url: "/daily/2025-05-14.png",
  date: "2025-05-14"
};

// This array will be populated at build time in development
// and used as a fallback in production where fs operations aren't available
const LOCAL_IMAGES_CACHE = [];

// Function to get all images from the directory
function getLocalImages() {
  // In production (Vercel), we can't use fs operations at runtime
  // So we'll use a hybrid approach - use fs in development, and a pre-generated list in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // If we're in production or if we've already cached the images, return the cache
  if (isProduction) {
    console.log('Using pre-generated image list for production');
    // Return a list of all images we know exist in the directory
    return [
      { name: "2025-05-14.png", url: "/images/hp-art-grid-collection/2025-05-14.png", source: 'local' },
      { name: "a-ok-acc-preso-flat.png", url: "/images/hp-art-grid-collection/a-ok-acc-preso-flat.png", source: 'local' },
      { name: "a-ok-acc-sota-wheatpaste-photo-realistic.png", url: "/images/hp-art-grid-collection/a-ok-acc-sota-wheatpaste-photo-realistic.png", source: 'local' },
      { name: "a-ok-hallucinations-face.png", url: "/images/hp-art-grid-collection/a-ok-hallucinations-face.png", source: 'local' },
      { name: "a-ok-sota-acc-wheatpaste.png", url: "/images/hp-art-grid-collection/a-ok-sota-acc-wheatpaste.png", source: 'local' },
      { name: "age-of-intelligence.png", url: "/images/hp-art-grid-collection/age-of-intelligence.png", source: 'local' },
      { name: "alignment-apes-on-keys-acc-pole-realistic.png", url: "/images/hp-art-grid-collection/alignment-apes-on-keys-acc-pole-realistic.png", source: 'local' },
      { name: "alignment-vs-acceleration-apes-on-keys.png", url: "/images/hp-art-grid-collection/alignment-vs-acceleration-apes-on-keys.png", source: 'local' },
      { name: "billboard-realistic-grafitti-meta.png", url: "/images/hp-art-grid-collection/billboard-realistic-grafitti-meta.png", source: 'local' },
      { name: "coffee-shop-apesonkeys-vs-aok-head-on.png", url: "/images/hp-art-grid-collection/coffee-shop-apesonkeys-vs-aok-head-on.png", source: 'local' },
      { name: "fractal-arrows.png", url: "/images/hp-art-grid-collection/fractal-arrows.png", source: 'local' },
      { name: "fratcal-money-tesseract-multi-dimension-vector.png", url: "/images/hp-art-grid-collection/fratcal-money-tesseract-multi-dimension-vector.png", source: 'local' },
      { name: "heavily-tagged-pole.png", url: "/images/hp-art-grid-collection/heavily-tagged-pole.png", source: 'local' },
      { name: "mixture-of-apes.png", url: "/images/hp-art-grid-collection/mixture-of-apes.png", source: 'local' },
      { name: "poster-flat-subway.png", url: "/images/hp-art-grid-collection/poster-flat-subway.png", source: 'local' },
      { name: "reading-on-machines-of.png", url: "/images/hp-art-grid-collection/reading-on-machines-of.png", source: 'local' },
      { name: "sota-og-apes-with-thinking-poised-fingers.png", url: "/images/hp-art-grid-collection/sota-og-apes-with-thinking-poised-fingers.png", source: 'local' },
      { name: "sota-stark-poster.png", url: "/images/hp-art-grid-collection/sota-stark-poster.png", source: 'local' },
      { name: "stochastic-ape.png", url: "/images/hp-art-grid-collection/stochastic-ape.png", source: 'local' },
      { name: "the-future-is-a-ok-misaligned.png", url: "/images/hp-art-grid-collection/the-future-is-a-ok-misaligned.png", source: 'local' }
    ];
  }
  
  try {
    // Get the absolute path to the public directory
    const publicDir = path.join(process.cwd(), 'public');
    const imageDir = path.join(publicDir, 'images', 'hp-art-grid-collection');
    
    // Check if directory exists
    if (!fs.existsSync(imageDir)) {
      console.error(`Directory does not exist: ${imageDir}`);
      return [];
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(imageDir);
    
    // Filter for image files (png, jpg, jpeg, webp, gif)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
    });
    
    console.log(`Found ${imageFiles.length} image files in ${imageDir}`);
    
    // Map to the format needed by the API
    const images = imageFiles.map(file => ({
      name: file,
      url: `/images/hp-art-grid-collection/${file}`,
      source: 'local'
    }));
    
    // Cache the results for potential future use
    LOCAL_IMAGES_CACHE.length = 0;
    LOCAL_IMAGES_CACHE.push(...images);
    
    return images;
  } catch (error) {
    console.error('Error reading local images directory:', error);
    return [];
  }
}

export async function GET() {
  try {
    // Get local images
    const localImages = getLocalImages();
    
    // Add external images with better error handling
    let externalImages = [];
    let externalError = null;
    
    try {
      // Always include hardcoded fallback images to ensure we have content
      externalImages.push({
        name: TODAY_IMAGE.date,
        url: `https://self-replicating-art.vercel.app${TODAY_IMAGE.url}`,
        date: TODAY_IMAGE.date,
        source: "self-replicating-art",
      });
      
      externalImages.push({
        name: "2025-05-15",
        url: "https://self-replicating-art.vercel.app/daily/2025-05-15.png",
        date: "2025-05-15",
        source: "self-replicating-art",
      });
      
      // Try to fetch from external API
      console.log("Fetching from external API: https://self-replicating-art.vercel.app/api/daily");
      
      const response = await fetch("https://self-replicating-art.vercel.app/api/daily", {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 }, // Cache for 1 hour
        cache: 'force-cache' // Use caching to prevent dynamic server usage errors
      });
      
      if (response.ok) {
        const apiData = await response.json();
        console.log("External API response received");
        
        // Add any other images from the API (excluding ones we already added)
        if (Array.isArray(apiData) && apiData.length > 0) {
          const existingDates = externalImages.map((img) => img.date);
          
          const additionalImages = apiData
            .filter((item) => item.date && !existingDates.includes(item.date))
            .slice(0, 3) // Limit to 3 additional images
            .map((item) => ({
              name: item.date || "Unknown Date",
              url: `https://self-replicating-art.vercel.app${item.url}`,
              date: item.date,
              source: "self-replicating-art",
            }));
          
          if (additionalImages.length > 0) {
            console.log(`Adding ${additionalImages.length} additional external images`);
            externalImages = [...externalImages, ...additionalImages];
          }
        }
      } else {
        console.log(`External API returned status: ${response.status}`);
      }
    } catch (err) {
      console.error("Error fetching external API, continuing with hardcoded images:", err.message);
      externalError = err.message;
    }
    
    // Combine both image sources
    const allImages = [...localImages, ...externalImages];
    
    console.log(
      `Total images: ${allImages.length} (${localImages.length} local, ${externalImages.length} external)`
    );
    
    // Return the combined results with proper cache headers
    const response = NextResponse.json({
      images: allImages,
      counts: {
        local: localImages.length,
        external: externalImages.length,
        total: allImages.length,
      },
      externalError: externalError
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      }
    });
    
    // Add CORS headers
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return response;
  } catch (error) {
    console.error("Error reading gallery directory:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to load gallery images", message: error.message },
      { status: 500 }
    );
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return errorResponse;
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 }); // No content
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
