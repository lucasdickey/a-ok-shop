import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const images = imageFiles.map((file) => ({
      name: file,
      url: `/images/hp-art-grid-collection/${file}`,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error reading gallery directory:", error);
    return NextResponse.json(
      { error: "Failed to load gallery images" },
      { status: 500 }
    );
  }
}
