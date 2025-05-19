import fs from "fs";
import path from "path";

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
  'Content-Type': 'application/json'
};

// Helper to create response with CORS headers
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
};

// Helper to get local images from JSON or directory
function getLocalImages() {
  const imageListPath = path.join(
    process.cwd(),
    "app",
    "data",
    "image-list.json"
  );
  if (fs.existsSync(imageListPath)) {
    try {
      const imageList = JSON.parse(fs.readFileSync(imageListPath, "utf8"));
      return imageList;
    } catch (error) {
      console.error("Error reading pre-generated image list:", error);
      return [];
    }
  }
  // fallback: try to read from directory (dev only)
  try {
    const publicDir = path.join(process.cwd(), "public");
    const imageDir = path.join(publicDir, "images", "hp-art-grid-collection");
    if (!fs.existsSync(imageDir)) return [];
    const files = fs.readdirSync(imageDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
    });
    return imageFiles.map((file) => ({
      name: file,
      url: `/images/hp-art-grid-collection/${file}`,
      source: "local",
    }));
  } catch {
    return [];
  }
}

// Helper to fetch external images from self-replicating-art API
async function getExternalImages() {
  try {
    const response = await fetch(
      "https://self-replicating-art.vercel.app/api/daily",
      {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );
    if (!response.ok) return [];
    const apiData = await response.json();
    if (!Array.isArray(apiData)) return [];
    // Map to gallery format
    return apiData.map((item) => ({
      name: item.date || "Unknown Date",
      url: `https://self-replicating-art.vercel.app${item.url}`,
      date: item.date,
      source: "self-replicating-art",
    }));
  } catch (err) {
    console.error("Error fetching external images:", err);
    return [];
  }
}

// Set revalidation time (in seconds)
export const revalidate = 3600; // Revalidate at most every hour

export async function GET() {
  try {
    console.log('Fetching local images...');
    const localImages = getLocalImages();
    console.log(`Found ${localImages.length} local images`);
    
    console.log('Fetching external images...');
    const externalImages = await getExternalImages();
    console.log(`Found ${externalImages.length} external images`);
    
    const allImages = [...localImages, ...externalImages];
    
    const responseData = {
      images: allImages,
      counts: {
        local: localImages.length,
        external: externalImages.length,
        total: allImages.length,
      },
    };
    
    console.log(`Returning ${allImages.length} total images`);
    return jsonResponse(responseData);
  } catch (error) {
    console.error("Error in GET /api/local-gallery:", error);
    return jsonResponse(
      { 
        error: "Failed to load gallery images", 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      500
    );
  }
}

export async function OPTIONS() {
  console.log('Handling OPTIONS request');
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Content-Length': '0'
    }
  });
}
