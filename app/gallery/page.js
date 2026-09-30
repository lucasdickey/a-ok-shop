"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [counts, setCounts] = useState({ local: 0, external: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'local', or 'self-replicating-art'

  useEffect(() => {
    async function fetchImages() {
      try {
        console.log("Fetching images from API...");
        // Use the new local-gallery endpoint with cache control
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        // Use the correct base URL - important for both development and production
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/api/local-gallery`;
        console.log(`Fetching gallery images from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          cache: "no-store", // Don't use cache to ensure fresh data
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("API response status:", response.status);

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API response data counts:", data.counts);

        // Ensure we have valid image data
        if (!data.images || !Array.isArray(data.images)) {
          console.error("Invalid image data format:", data);
          throw new Error("Invalid image data format");
        }

        // Debug the external images specifically
        const externalImages =
          data.images.filter((img) => img.source === "self-replicating-art") ||
          [];
        console.log(`External images count: ${externalImages.length}`);
        externalImages.forEach((img, i) => {
          if (i < 3) console.log(`External image ${i}:`, img.url);
        });

        // Verify that all images have valid URLs
        const validImages = data.images.filter((img) => {
          if (!img || !img.url) return false;
          return true;
        });

        if (validImages.length !== data.images.length) {
          console.warn(
            `Filtered out ${
              data.images.length - validImages.length
            } invalid images`
          );
          data.images = validImages;
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch images");
        }

        console.log("Successfully fetched data:", data);
        // Make sure we're setting the state with the valid images
        setImages(validImages);

        if (data.counts) {
          setCounts(data.counts);
        } else {
          // Calculate counts if not provided by API
          const localImages =
            validImages.filter((img) => img.source === "local") || [];
          const externalImages =
            validImages.filter(
              (img) => img.source === "self-replicating-art"
            ) || [];
          setCounts({
            local: localImages.length,
            external: externalImages.length,
            total: validImages.length || 0,
          });
        }
        // Don't show debug info by default
        setDebugInfo(null);
      } catch (err) {
        console.error("Error fetching gallery images:", err);
        setError(
          err.message || "Failed to load gallery. Please try again later."
        );
        setDebugInfo({ error: err.toString() });
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, []);

  // Filter images based on active filter
  const filteredImages = images.filter((image) => {
    if (activeFilter === "all") return true;
    return image.source === activeFilter;
  });

  // Log the current state for debugging - MOVED ABOVE conditional return
  useEffect(() => {
    console.log("Gallery render state:", {
      imageCount: images.length,
      loading,
      error,
      activeFilter,
      filteredCount: filteredImages.length,
    });
  }, [images, loading, error, activeFilter, filteredImages]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading gallery...
      </div>
    );
  }

  return (
    <div className="px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-14">
      <p className="micro mb-4 text-center">Fig. 04 / The art archive</p>
      <h1 className="display-heading mb-8 text-center text-[clamp(52px,6vw,88px)]">
        A-OK Art Gallery
      </h1>

      {/* Filter tabs */}
      <div className="mb-8 flex justify-center border-y-2 border-dashed border-dark py-3.5">
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter images">
          <button
            type="button"
            className={`min-h-[44px] px-4 py-2 text-sm font-medium border ${
              activeFilter === "all"
                ? "bg-dark text-club-paper border-dark shadow-[3px_3px_0_#C52224]"
                : "bg-club-paper text-dark border-dark hover:bg-club-yellow"
            }`}
            onClick={() => setActiveFilter("all")}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            className={`min-h-[44px] px-4 py-2 text-sm font-medium border ${
              activeFilter === "local"
                ? "bg-dark text-club-paper border-dark shadow-[3px_3px_0_#C52224]"
                : "bg-club-paper text-dark border-dark hover:bg-club-yellow"
            }`}
            onClick={() => setActiveFilter("local")}
          >
            A-OK Collection ({counts.local})
          </button>
          <button
            type="button"
            className={`min-h-[44px] px-4 py-2 text-sm font-medium border ${
              activeFilter === "self-replicating-art"
                ? "bg-dark text-club-paper border-dark shadow-[3px_3px_0_#C52224]"
                : "bg-club-paper text-dark border-dark hover:bg-club-yellow"
            }`}
            onClick={() => setActiveFilter("self-replicating-art")}
          >
            Self-Replicating Art ({counts.external})
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
          {/* Only show debug info in development */}
          {process.env.NODE_ENV === "development" && debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
              <pre className="text-xs" data-component-name="ErrorDebugInfo">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {filteredImages.length === 0 && !error ? (
        <div className="text-center p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p>No images found in the gallery.</p>
          {/* Only show debug info in development */}
          {process.env.NODE_ENV === "development" && debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
              <pre
                className="text-xs"
                data-component-name="EmptyGalleryDebugInfo"
              >
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((image) => (
            <div
              key={`${image.source}-${image.name}`}
              className="overflow-hidden border-2 border-dark bg-club-paper shadow-hard"
            >
              <Link href={image.url} target="_blank" rel="noopener noreferrer">
                <div className="h-64 w-full border-b-2 border-dark">
                  {image.source === "self-replicating-art" ? (
                    // Use a different approach for external images to avoid CORS issues
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${image.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Fallback content if image fails to load */}
                      <div className="hidden">External image: {image.name}</div>
                    </div>
                  ) : (
                    // Regular image tag for local images
                    <img
                      src={image.url}
                      alt={image.name
                        .replace(/\.[^/.]+$/, "")
                        .replace(/-/g, " ")}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error(
                          `Failed to load gallery image: ${image.url}`,
                          e
                        );
                        // Fallback to a placeholder if image fails to load
                        e.currentTarget.src =
                          "/images/hp-art-grid-collection/a-ok-acc-preso-flat.png";
                      }}
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="display-heading text-2xl">
                    {image.name.replace(/\.[^/.]+$/, "").replace(/-/g, " ")}
                  </h3>
                  {image.date && (
                    <p className="micro mt-1">
                      Date: {image.date}
                    </p>
                  )}
                  <div className="mt-2">
                    <span
                      className={`inline-block border border-dark px-2 py-1 font-mono text-[11px] uppercase ${
                        image.source === "local"
                          ? "bg-club-yellow text-dark"
                          : "bg-club-sky text-dark"
                      }`}
                    >
                      {image.source === "local"
                        ? "A-OK Collection"
                        : "Self-Replicating Art"}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Only show debug info button in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 text-center">
          <button
            onClick={() =>
              setDebugInfo((prev) => (prev ? null : { images, counts }))
            }
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            {debugInfo ? "Hide" : "Show"} Debug Info
          </button>

          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto max-h-96">
              <pre className="text-xs" data-component-name="GalleryPage">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
