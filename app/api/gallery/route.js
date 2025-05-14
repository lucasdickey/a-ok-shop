import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Hardcoded external image for today
const TODAY_IMAGE = {
  url: "/daily/2025-05-14.png",
  date: "2025-05-14"
};

export async function GET() {
  try {
    const directoryPath = path.join(
      process.cwd(),
      "public",
      "images",
      "hp-art-grid-collection"
    );
    const files = fs.readdirSync(directoryPath);

    // Filter for image files only
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
    });

    // Create URLs for each image
    const localImages = imageFiles.map((file) => ({
      name: file,
      url: `/images/hp-art-grid-collection/${file}`,
      source: 'local'
    }));

    // 2. Add external images - simplified approach
    let externalImages = [];
    let apiData = null;
    
    try {
      console.log('Fetching from external API: https://self-replicating-art.vercel.app/api/daily');
      const response = await fetch('https://self-replicating-art.vercel.app/api/daily');
      
      if (response.ok) {
        apiData = await response.json();
        console.log('External API response:', JSON.stringify(apiData));
      } else {
        console.error(`External API returned status ${response.status}`);
      }
    } catch (err) {
      console.error("Error fetching external API:", err.message);
    }
    
    // Always include today's image, regardless of API response
    externalImages.push({
      name: TODAY_IMAGE.date,
      url: `https://self-replicating-art.vercel.app${TODAY_IMAGE.url}`,
      date: TODAY_IMAGE.date,
      source: 'self-replicating-art'
    });
    
    console.log('Added hardcoded external image:', TODAY_IMAGE.url);
    
    // Try to add any additional images from the API if available
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      console.log(`Processing ${apiData.length} items from external API`);
      
      // Add any other images from the API (excluding today's which we already added)
      const additionalImages = apiData
        .filter(item => item.date !== TODAY_IMAGE.date)
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
