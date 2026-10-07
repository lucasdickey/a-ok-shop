import fs from "fs";
import path from "path";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";

// The archive list may hold bare URLs or { name, url, source } entries; ImageGrid takes both.
export type GalleryImage = string | { name?: string; url: string; source?: string };

// The art archive's images, either from the pre-generated JSON file or the local API.
async function getArchiveImages(): Promise<GalleryImage[]> {
  // During build time or in production, use the pre-generated JSON file
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    try {
      const imageListPath = path.join(process.cwd(), "app", "data", "image-list.json");
      return JSON.parse(fs.readFileSync(imageListPath, "utf8"));
    } catch (error) {
      console.error("Error reading pre-generated image list:", error);
      return [];
    }
  }

  // In development, fetch from API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const galleryResponse = await fetch(`${baseUrl}/api/local-gallery`, {
      next: { revalidate: 3600 },
    });

    if (galleryResponse.ok) {
      const galleryData = await galleryResponse.json();
      if (galleryData?.images && Array.isArray(galleryData.images)) {
        return galleryData.images.filter((img: any) => {
          if (typeof img === "string") return true;
          return img && img.url && typeof img.url === "string";
        });
      }
    }
    console.error(`Failed to fetch gallery images: ${galleryResponse.status}`);
    return [];
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

/** The shuffling archive grid's pool: every published Chaos Monkey plus the art archive. */
export async function getGalleryImages(): Promise<GalleryImage[]> {
  const chaosMonkeyImages = getChaosMonkeys().map((monkey) => ({
    name: monkey.title,
    url: monkey.image,
    source: "chaos-monkeys",
  }));
  return [...chaosMonkeyImages, ...(await getArchiveImages())];
}
