'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function GalleryClient({ initialData }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Use initial data or empty array if not provided
  const [images, setImages] = useState(initialData?.images || []);
  const [counts, setCounts] = useState(initialData?.counts || { local: 0, external: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter images based on active tab
  const filteredImages = images.filter(image => {
    if (activeTab === 'all') return true;
    if (activeTab === 'local') return image.source === 'local';
    if (activeTab === 'daily') return image.source === 'self-replicating-art';
    return true;
  });

  // Count daily images for the tab counter
  const dailyImagesCount = counts.external || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Gallery</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gallery</h1>
          <p className="text-lg text-gray-600">Explore our collection of artwork</p>
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'all' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Images
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'local' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Local Collection
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'daily' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={dailyImagesCount === 0}
            >
              Daily Images {dailyImagesCount > 0 && `(${dailyImagesCount})`}
            </button>
          </div>
        </div>

        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No images found in the gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredImages.map((image, index) => (
              <div 
                key={`${image.source}-${index}`}
                className="group relative overflow-hidden rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-square relative">
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={index < 4}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{image.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {image.source === 'local' ? 'Local Collection' : 'Daily Art'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" 
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 focus:outline-none"
                aria-label="Close"
              >
                <span className="text-2xl">×</span>
              </button>
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="relative aspect-square w-full">
                  <Image
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedImage.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedImage.source === 'local' ? 'Local Collection' : 'Daily Art'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
