"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        console.log("Fetching images from API...");
        const response = await fetch("/api/gallery");
        console.log("API response status:", response.status);

        const data = await response.json();
        console.log("API response data:", data);

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch images");
        }

        setImages(data.images || []);
        setDebugInfo(data);
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

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {images.length === 0 && !error ? (
        <div className="text-center p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p>No images found in the gallery.</p>
          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image.name}
              className="overflow-hidden rounded-lg shadow-lg"
            >
              <Link href={image.url} target="_blank" rel="noopener noreferrer">
                <div className="h-64 w-full">
                  <img
                    src={image.url}
                    alt={image.name.replace(/\.[^/.]+$/, "").replace(/-/g, " ")}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-gray-50">
                  <h3 className="font-bebas-neue tracking-wide text-lg">
                    {image.name.replace(/\.[^/.]+$/, "").replace(/-/g, " ")}
                  </h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
