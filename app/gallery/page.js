"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [counts, setCounts] = useState({ local: 0, external: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'local', or 'self-replicating-art'

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

        console.log('Successfully fetched data:', data);
        setImages(data.images || []);
        if (data.counts) {
          setCounts(data.counts);
        } else {
          // Calculate counts if not provided by API
          const localImages = data.images?.filter(img => img.source === 'local') || [];
          const externalImages = data.images?.filter(img => img.source === 'self-replicating-art') || [];
          setCounts({
            local: localImages.length,
            external: externalImages.length,
            total: data.images?.length || 0
          });
        }
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

  // Filter images based on active filter
  const filteredImages = images.filter(image => {
    if (activeFilter === 'all') return true;
    return image.source === activeFilter;
  });

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
              activeFilter === 'all' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            } rounded-l-lg`}
            onClick={() => setActiveFilter('all')}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeFilter === 'local' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
            onClick={() => setActiveFilter('local')}
          >
            A-OK Collection ({counts.local})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeFilter === 'self-replicating-art' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            } rounded-r-lg`}
            onClick={() => setActiveFilter('self-replicating-art')}
          >
            Self-Replicating Art ({counts.external})
          </button>
        </div>
      </div>

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

      {filteredImages.length === 0 && !error ? (
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
          {filteredImages.map((image) => (
            <div
              key={`${image.source}-${image.name}`}
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
                  {image.date && (
                    <p className="text-sm text-gray-600 mt-1">Date: {image.date}</p>
                  )}
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      image.source === 'local' 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {image.source === 'local' ? 'A-OK Collection' : 'Self-Replicating Art'}
                    </span>
                  </div>
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
