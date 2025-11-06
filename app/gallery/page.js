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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bebas-neue tracking-wide mb-6 text-center">
        A-OK Art Gallery
      </h1>

      {/* Filter tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border ${
              activeFilter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            } rounded-l-lg`}
            onClick={() => setActiveFilter("all")}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeFilter === "local"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
            onClick={() => setActiveFilter("local")}
          >
            A-OK Collection ({counts.local})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeFilter === "self-replicating-art"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            } rounded-r-lg`}
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
              className="overflow-hidden rounded-lg shadow-lg"
            >
              <Link href={image.url} target="_blank" rel="noopener noreferrer">
                <div className="h-64 w-full">
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
                <div className="p-4 bg-gray-50">
                  <h3 className="font-bebas-neue tracking-wide text-lg">
                    {image.name.replace(/\.[^/.]+$/, "").replace(/-/g, " ")}
                  </h3>
                  {image.date && (
                    <p className="text-sm text-gray-600 mt-1">
                      Date: {image.date}
                    </p>
                  )}
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        image.source === "local"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-green-100 text-green-800"
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
