import { NextResponse } from "next/server";

// Hardcoded external image for today
const TODAY_IMAGE = {
  url: "/daily/2025-05-14.png",
  date: "2025-05-14"
};

// Hardcoded local images (instead of reading from filesystem which doesn't work on Vercel)
const LOCAL_IMAGES = [
  {
    name: "art-grid-1.png",
    url: "/images/hp-art-grid-collection/art-grid-1.png",
    source: 'local'
  },
  {
    name: "art-grid-2.png",
    url: "/images/hp-art-grid-collection/art-grid-2.png",
    source: 'local'
  },
  {
    name: "art-grid-3.png",
    url: "/images/hp-art-grid-collection/art-grid-3.png",
    source: 'local'
  },
  {
    name: "art-grid-4.png",
    url: "/images/hp-art-grid-collection/art-grid-4.png",
    source: 'local'
  }
];

export async function GET() {
  try {
    // Use hardcoded local images instead of reading from filesystem
    const localImages = LOCAL_IMAGES;

    // 2. Add external images - simplified approach with error handling
    let externalImages = [];
    
    // Always include today's image, regardless of API response
    externalImages.push({
      name: TODAY_IMAGE.date,
      url: `https://self-replicating-art.vercel.app${TODAY_IMAGE.url}`,
      date: TODAY_IMAGE.date,
      source: 'self-replicating-art'
    });
    
    console.log('Added hardcoded external image:', TODAY_IMAGE.url);
    
    // Add a few more hardcoded external images to ensure we have content
    externalImages.push({
      name: "2025-05-15",
      url: "https://self-replicating-art.vercel.app/daily/2025-05-15.png",
      date: "2025-05-15",
      source: 'self-replicating-art'
    });
    
    // Try to fetch from external API, but don't rely on it
    try {
      console.log('Fetching from external API: https://self-replicating-art.vercel.app/api/daily');
      const response = await fetch('https://self-replicating-art.vercel.app/api/daily', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (response.ok) {
        const apiData = await response.json();
        console.log('External API response received');
        
        // Add any other images from the API (excluding ones we already added)
        if (Array.isArray(apiData) && apiData.length > 0) {
          const existingDates = externalImages.map(img => img.date);
          
          const additionalImages = apiData
            .filter(item => item.date && !existingDates.includes(item.date))
            .slice(0, 3) // Limit to 3 additional images
            .map(item => ({
              name: item.date || 'Unknown Date',
              url: `https://self-replicating-art.vercel.app${item.url}`,
              date: item.date,
              source: 'self-replicating-art'
            }));
          
          if (additionalImages.length > 0) {
            console.log(`Adding ${additionalImages.length} additional external images`);
            externalImages = [...externalImages, ...additionalImages];
          }
        }
      }
    } catch (err) {
      console.error("Error fetching external API, continuing with hardcoded images:", err.message);
    }

    // Combine both image sources
    const allImages = [...localImages, ...externalImages];

    console.log(`Total images: ${allImages.length} (${localImages.length} local, ${externalImages.length} external)`);
    console.log('External images:', JSON.stringify(externalImages));

    // Return the combined results
    const response = NextResponse.json({ 
      images: allImages,
      counts: {
        local: localImages.length,
        external: externalImages.length,
        total: allImages.length
      }
    });
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
