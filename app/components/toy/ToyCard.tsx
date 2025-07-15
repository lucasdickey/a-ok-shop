'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Toy } from '@/src/types/toy';

type ToyCardProps = {
  toy: Toy;
};

export default function ToyCard({ toy }: ToyCardProps) {
  const { id, title, imageUrl, price, category, comments, amazonUrl } = toy;

  return (
    <a 
      href={amazonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
    >
      <div className="bg-purple-700 text-white border-2 border-gray-800 rounded-xl p-5 flex flex-col justify-between transition-transform duration-200 ease-in-out hover:transform hover:scale-105 font-space-grotesk h-full cursor-pointer max-w-full">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-800 mb-4 w-full shadow-sm bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-contain p-4 transition-transform duration-300 ease-in-out hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <span className="text-gray-500 text-base">{title}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col flex-grow">
          <h3 className="text-base font-semibold leading-tight mb-2 font-space-grotesk tracking-tight">
            {title}
          </h3>
          {price && (
            <p className="text-xl font-medium text-amber-500 mb-2 font-space-grotesk tracking-wide">
              {price}
            </p>
          )}
          {comments && (
            <p className="text-sm leading-relaxed text-white/90 mb-4 italic font-space-grotesk">
              &ldquo;{comments}&rdquo;
            </p>
          )}
          {category && (
            <span className="bg-white/10 border border-purple-300 text-white px-3 py-1 rounded-full text-xs font-space-grotesk inline-block mt-auto self-start">
              {category}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}