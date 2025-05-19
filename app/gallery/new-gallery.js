'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Sample image data - replace with your actual images
const galleryImages = [
  {
    name: "A-OK Acc Preso Flat",
    url: "/images/hp-art-grid-collection/a-ok-acc-preso-flat.png"
  },
  {
    name: "A-OK SOTA Wheatpaste",
    url: "/images/hp-art-grid-collection/a-ok-sota-acc-wheatpaste.png"
  },
  {
    name: "A-OK Hallucinations",
    url: "/images/hp-art-grid-collection/a-ok-hallucinations-face.png"
  },
  {
    name: "Age of Intelligence",
    url: "/images/hp-art-grid-collection/age-of-intelligence.png"
  },
  {
    name: "Ape in Peace",
    url: "/images/hp-art-grid-collection/ape-in-peace.png"
  },
  {
    name: "Billboard Graffiti",
    url: "/images/hp-art-grid-collection/billboard-realistic-grafitti-meta.png"
  },
  {
    name: "Coffee Shop Apes",
    url: "/images/hp-art-grid-collection/coffee-shop-apesonkeys-vs-aok-head-on.png"
  }
];

export default function NewGallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  const openModal = (image) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gallery</h1>
          <p className="text-lg text-gray-600">Explore our collection of artwork</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {galleryImages.map((image, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(image)}
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
              </div>
            </div>
          ))}
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button 
                onClick={closeModal}
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
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedImage.name}</h2>
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
