import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function GET() {
  try {
    const localImages = getLocalImages();
    const externalImages = await getExternalImages();
    const allImages = [...localImages, ...externalImages];
    const response = NextResponse.json(
      {
        images: allImages,
        counts: {
          local: localImages.length,
          external: externalImages.length,
          total: allImages.length,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
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

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
