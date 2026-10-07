'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SimpleProduct } from '@/app/lib/catalog';
import { isClothing } from '@/app/lib/sizes';
import PixelFade from '@/app/components/PixelFade';

type ProductCardProps = {
  product: SimpleProduct;
  /** Position in the list, shown as the receipt line number (ITEM / 01). */
  index?: number;
  /** Load the photo eagerly (for cards above the fold). */
  priority?: boolean;
};

// Photo panel colors rotate through the Club Receipt palette.
const PHOTO_BACKGROUNDS = ['bg-club-yellow', 'bg-club-sky', 'bg-club-gold'];

const CATEGORY_LABELS: Record<string, string> = {
  hoodie: 'Hoodies',
  hat: 'Hats',
  't-shirt': 'Tees',
};

export default function ProductCard({ product, index = 0, priority = false }: ProductCardProps) {
  const { handle, title, priceRange, images, productType, tags } = product;

  const price = parseFloat(priceRange.minVariantPrice.amount);
  const imageUrl = images.edges[0]?.node.url || '/images/product-placeholder.jpg';
  const imageAlt = images.edges[0]?.node.altText || title;
  const isChestDetail = images.edges[0]?.node.presentation === 'chest-detail';

  // The product's own type decides when it names a garment, so a tee tagged "red hoodie"
  // (describing the artwork) still reads as a tee. Tags only count when it doesn't.
  const typeText = productType.toLowerCase();
  const typeIsGarment = ['hoodie', 'sweatshirt', 'hat', 'cap', 'shirt', 'tee'].some((word) => typeText.includes(word));
  const isType = (type: string) =>
    typeText.includes(type) || (!typeIsGarment && tags.some((tag) => tag.toLowerCase().includes(type)));
  const cardType = isType('hoodie') ? 'hoodie' : isType('hat') ? 'hat' : 't-shirt';

  const itemNumber = String(index + 1).padStart(2, '0');
  // Stickers and other non-clothing items fall back to the t-shirt card type.
  const categoryLabel = isClothing(productType, tags) || cardType !== 't-shirt'
    ? CATEGORY_LABELS[cardType]
    : productType || 'Goods';

  return (
    // No bottom border: the label ends in a torn receipt edge. The hard shadow sits to the right
    // only, so it doesn't double the teeth into a dark band.
    <article className="group flex h-full min-w-0 flex-col border-2 border-b-0 border-dark bg-club-paper [filter:drop-shadow(6px_0_0_#22221E)]">
      <Link
        href={`/products/${handle}`}
        // The title link below is the one keyboard and screen reader stop for this card.
        tabIndex={-1}
        aria-hidden="true"
        className={`relative block overflow-hidden border-b-2 border-dark ${PHOTO_BACKGROUNDS[index % PHOTO_BACKGROUNDS.length]}`}
      >
        <span className="absolute left-2 top-2 z-[1] border border-dark bg-club-paper px-1.5 py-0.5 font-mono text-[10px] font-normal sm:left-3 sm:top-3 sm:px-2 sm:py-1">
          ITEM / <b className="font-bold">{itemNumber}</b>
        </span>
        <div className="relative aspect-[7/8] w-full">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
            className={`object-cover transition-transform duration-300 motion-reduce:transition-none ${
              isChestDetail
                ? 'scale-[2] origin-[50%_10%] object-[50%_30%] group-hover:scale-[2.07]'
                : 'group-hover:scale-[1.035]'
            }`}
            unoptimized={!imageUrl.startsWith('http')}
          />
        </div>
        <span className="absolute bottom-3 right-3 hidden border border-dark bg-club-paper px-3 py-2 text-xs shadow-hard-sm sm:block">
          Choose options <span aria-hidden="true">↗</span>
        </span>
      </Link>
      {/* Brighter receipt-slip paper with a faint 8-bit halftone sets the label apart from the page. */}
      {/* The text wears a soft halo in the paper color, so dots never crowd the letters. */}
      <div className="receipt-tear isolate flex flex-1 flex-col bg-club-slip p-3 [text-shadow:0_0_2px_#FFFBED,0_0_4px_#FFFBED,0_0_6px_#FFFBED] sm:p-4">
        <PixelFade />
        <p className="micro text-primary">{categoryLabel}</p>
        <h3 className="mt-1.5 flex flex-col gap-1 text-[15px] font-bold leading-tight sm:mt-2 sm:flex-row sm:justify-between sm:gap-3 sm:text-[17px]">
          <Link href={`/products/${handle}`} className="no-underline hover:underline">
            {title}
          </Link>
          <span className="shrink-0">${price.toFixed(2)}</span>
        </h3>
      </div>
    </article>
  );
}
