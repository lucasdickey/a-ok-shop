"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { getToyById } from "@/src/data/toys.config";
import { useState } from "react";

export const dynamic = "force-dynamic";

// Client component for toy details
function ToyDetails({
  toy,
  selectedImageIndex,
}: {
  toy: any;
  selectedImageIndex: number;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold">{toy.title}</h1>

      <div className="mt-4">
        {toy.price && (
          <p className="text-2xl font-medium text-amber-600">{toy.price}</p>
        )}
        {toy.category && (
          <span className="inline-block mt-2 px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">
            {toy.category}
          </span>
        )}
      </div>

      {/* Amazon button */}
      <div className="mt-6">
        <a
          href={toy.amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full md:w-auto px-8 py-3 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors text-center"
        >
          View on Amazon
        </a>
        <p className="mt-2 text-sm text-gray-500">
          As an Amazon Associate, I earn from qualifying purchases
        </p>
      </div>

      {/* Personal comments */}
      {toy.comments && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-900 mb-2">My Take</h3>
          <p className="text-purple-800 italic">&ldquo;{toy.comments}&rdquo;</p>
        </div>
      )}

      <div className="mt-8 prose prose-sm max-w-none">
        <h3 className="text-lg font-medium">Description</h3>
        <p>{toy.description}</p>
      </div>
    </div>
  );
}

// Main toy page component
function ToyPageContent({ toy }: { toy: any }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // For now we only have one image per toy
  const images = [{ url: toy.imageUrl, alt: toy.title }];

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          {images[selectedImageIndex]?.url?.startsWith('http') ? (
            <Image
              src={images[selectedImageIndex]?.url}
              alt={images[selectedImageIndex]?.alt || toy.title}
              fill
              className="object-contain p-8"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <span className="text-gray-500">{toy.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <ToyDetails toy={toy} selectedImageIndex={selectedImageIndex} />
    </div>
  );
}

// Server component wrapper
export default function ToyPage({ params }: { params: { id: string } }) {
  const toy = getToyById(params.id);

  if (!toy) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ToyPageContent toy={toy} />
    </div>
  );
}