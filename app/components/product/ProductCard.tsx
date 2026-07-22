'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShopifyProduct } from '@/app/lib/shopify';

type ProductCardProps = {
  product: ShopifyProduct;
};

type CardType = 't-shirt' | 'hoodie' | 'hat';

function getCardType(productType: string, tags: string[]): CardType {
  const type = productType.toLowerCase();
  const hasTag = (needle: string) =>
    tags.some((tag) => tag.toLowerCase().includes(needle));

  if (type.includes('hoodie') || hasTag('hoodie')) return 'hoodie';
  if (type.includes('hat') || hasTag('hat')) return 'hat';
  return 't-shirt';
}

const badgeStyles: Record<CardType, string> = {
  't-shirt': 'bg-charcoal-dark text-bone',
  hoodie: 'bg-bone text-charcoal-dark border border-charcoal-dark/20',
  hat: 'bg-maroon text-bone',
};

const badgeLabels: Record<CardType, string> = {
  't-shirt': 'Tee',
  hoodie: 'Hoodie',
  hat: 'Hat',
};

export default function ProductCard({ product }: ProductCardProps) {
  const { handle, title, priceRange, images, productType, tags } = product;

  const price = parseFloat(priceRange.minVariantPrice.amount);
  const imageUrl = images.edges[0]?.node.url || '/images/product-placeholder.jpg';
  const imageAlt = images.edges[0]?.node.altText || title;
  const cardType = getCardType(productType, tags);

  return (
    <Link
      href={`/products/${handle}`}
      aria-label={`View ${title} details`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded-2xl"
    >
      <article className="card card-hover flex h-full flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-light-dark">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
            unoptimized={!imageUrl.startsWith('http')}
          />
          <span
            className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm ${badgeStyles[cardType]}`}
          >
            {badgeLabels[cardType]}
          </span>
          {/* Reveal CTA on hover */}
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full p-3 transition-transform duration-300 ease-out-expo group-hover:translate-y-0">
            <span className="flex w-full items-center justify-center rounded-lg bg-charcoal-dark/90 py-2.5 text-sm font-semibold text-bone backdrop-blur-sm">
              View Product
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-1 p-4">
          <h3 className="font-space-grotesk text-base font-semibold leading-snug text-dark transition-colors duration-200 group-hover:text-maroon">
            {title}
          </h3>
          <p className="font-space-grotesk text-lg font-medium text-maroon">
            ${price.toFixed(2)}
          </p>
        </div>
      </article>
    </Link>
  );
}
