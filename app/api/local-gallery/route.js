import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Function to get all images from the directory or JSON file
function getLocalImages() {
  const imageListPath = path.join(
    process.cwd(),
    "app",
    "data",
    "image-list.json"
  );

  // During build time or in production, use the pre-generated JSON file
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    try {
      const imageList = JSON.parse(fs.readFileSync(imageListPath, "utf8"));
      console.log(`Loaded ${imageList.length} images from pre-generated list`);
      return imageList;
    } catch (error) {
      console.error("Error reading pre-generated image list:", error);
      return [];
    }
  }

  // In development, try to read the directory
  try {
    const publicDir = path.join(process.cwd(), "public");
    const imageDir = path.join(publicDir, "images", "hp-art-grid-collection");

    if (!fs.existsSync(imageDir)) {
      console.error(`Directory does not exist: ${imageDir}`);
      // Fallback to JSON file if directory doesn't exist
      if (fs.existsSync(imageListPath)) {
        const imageList = JSON.parse(fs.readFileSync(imageListPath, "utf8"));
        console.log(
          `Falling back to ${imageList.length} images from pre-generated list`
        );
        return imageList;
      }
      return [];
    }

    const files = fs.readdirSync(imageDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
    });

    console.log(`Found ${imageFiles.length} image files in ${imageDir}`);

    const images = imageFiles.map((file) => ({
      name: file,
      url: `/images/hp-art-grid-collection/${file}`,
      source: "local",
    }));

    return images;
  } catch (error) {
    console.error("Error reading local images directory:", error);
    // Fallback to JSON file if directory read fails
    if (fs.existsSync(imageListPath)) {
      try {
        const imageList = JSON.parse(fs.readFileSync(imageListPath, "utf8"));
        console.log(
          `Falling back to ${imageList.length} images from pre-generated list`
        );
        return imageList;
      } catch (jsonError) {
        console.error("Error reading fallback JSON file:", jsonError);
      }
    }
    return [];
  }
}

export async function GET() {
  try {
    // Get local images only
    const localImages = getLocalImages();

    console.log(`Total images: ${localImages.length}`);

    // Return the results with proper cache headers
    const response = NextResponse.json(
      {
        images: localImages,
        counts: {
          local: localImages.length,
          total: localImages.length,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );

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
