'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SimpleProduct } from '@/app/lib/catalog';
import { CLOTHING_SIZES, isClothing } from '@/app/lib/sizes';

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
  const { handle, title, priceRange, images, options, variants, productType, tags } = product;
  
  const price = parseFloat(priceRange.minVariantPrice.amount);
  const imageUrl = images.edges[0]?.node.url || '/images/product-placeholder.jpg';
  const imageAlt = images.edges[0]?.node.altText || title;
  
  // Determine product type for styling
  let cardType = '';
  let bgColor = '';
  let textColor = 'white';
  let priceColor = '#FCEFB9'; // Default yellow highlight
  let sizeBgColor = 'rgba(255, 255, 255, 0.1)';
  let sizeBorderColor = '#F5F2DC';
  let sizeTextColor = 'white';
  
  if (productType.toLowerCase().includes('hoodie') || tags.some(tag => tag.toLowerCase().includes('hoodie'))) {
    cardType = 'hoodie';
    bgColor = '#F5F2DC'; // Bone White
    textColor = '#1F1F1F';
    priceColor = '#8B1E24';
    sizeBgColor = 'rgba(0, 0, 0, 0.1)';
    sizeBorderColor = '#1F1F1F';
    sizeTextColor = '#1F1F1F';
  } else if (productType.toLowerCase().includes('hat') || tags.some(tag => tag.toLowerCase().includes('hat'))) {
    cardType = 'hat';
    bgColor = '#8B1E24'; // Dark Maroon for hats
  } else {
    // Default to t-shirt
    cardType = 't-shirt';
    bgColor = '#2C2C2C'; // Black for t-shirts
  }
  
  // Extract size information - include all standard clothing sizes
  const standardSizes = [...CLOTHING_SIZES];
  let sizeValues: string[] = [];
  
  // Track availability for each size
  const sizeAvailability: Record<string, boolean> = {};
  standardSizes.forEach(size => {
    sizeAvailability[size] = false; // Default to unavailable
  });
  
  // First try to get size options from the product options
  const sizeOption = options?.find(option => 
    option.name.toLowerCase() === 'size'
  );
  
  if (sizeOption && sizeOption.values.length > 0) {
    // Filter to only include standard sizes
    sizeValues = sizeOption.values.filter(size => standardSizes.includes(size));
    
    // Update size availability
    sizeValues.forEach(size => {
      sizeAvailability[size] = true;
    });
  }
  
  // If no size options found, try to extract from variants
  if (sizeValues.length === 0 && variants?.edges) {
    const sizeSet = new Set<string>();
    
    variants.edges.forEach(({ node }) => {
      if (node.selectedOptions) {
        const sizeOption = node.selectedOptions.find((opt: any) => 
          opt.name.toLowerCase() === 'size'
        );
        
        if (sizeOption && standardSizes.includes(sizeOption.value)) {
          sizeSet.add(sizeOption.value);
          sizeAvailability[sizeOption.value] = node.availableForSale;
        } else if (standardSizes.includes(node.title)) {
          // If variant title is a standard size
          sizeSet.add(node.title);
          sizeAvailability[node.title] = node.availableForSale;
        }
      }
    });
    
    sizeValues = Array.from(sizeSet);
  }
  
  // Tees and hoodies are printed on demand, so every standard size can be ordered.
  if (isClothing(productType, tags)) {
    sizeValues = [...standardSizes];
  } else if (cardType === 't-shirt') {
    // Non-clothing items that fall back to the t-shirt card (e.g. stickers) have no sizes.
    sizeValues = [];
  }
  
  // Sort sizes in the standard order
  sizeValues.sort((a, b) => {
    return standardSizes.indexOf(a) - standardSizes.indexOf(b);
  });
  
  const hasSizes = sizeValues.length > 0;

  const itemNumber = String(index + 1).padStart(2, '0');
  // Stickers and other non-clothing items fall back to the t-shirt card type.
  const categoryLabel = isClothing(productType, tags) || cardType !== 't-shirt'
    ? CATEGORY_LABELS[cardType]
    : productType || 'Goods';

  return (
    <article className="group flex h-full min-w-0 flex-col border-2 border-dark bg-club-paper shadow-hard">
      <Link
        href={`/products/${handle}`}
        // The title link below is the one keyboard and screen reader stop for this card.
        tabIndex={-1}
        aria-hidden="true"
        className={`relative block overflow-hidden border-b-2 border-dark ${PHOTO_BACKGROUNDS[index % PHOTO_BACKGROUNDS.length]}`}
      >
        <span className="absolute left-3 top-3 z-[1] border border-dark bg-club-paper px-2 py-1 font-mono text-[10px]">
          ITEM / {itemNumber}
        </span>
        <div className="relative aspect-[7/8] w-full">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transition-none"
            unoptimized={!imageUrl.startsWith('http')}
          />
        </div>
        <span className="absolute bottom-3 right-3 border border-dark bg-club-paper px-3 py-2 text-xs shadow-hard-sm">
          Choose options <span aria-hidden="true">↗</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="micro text-[9px]">{categoryLabel}</p>
        <h3 className="mt-2 flex justify-between gap-3 text-[17px] font-bold leading-tight">
          <Link href={`/products/${handle}`} className="no-underline hover:underline">
            {title}
          </Link>
          <span className="shrink-0">${price.toFixed(2)}</span>
        </h3>
      </div>
    </article>
  );
}
