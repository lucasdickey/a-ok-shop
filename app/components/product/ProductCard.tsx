'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShopifyProduct } from '@/app/lib/shopify';

type ProductCardProps = {
  product: ShopifyProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { handle, title, priceRange, images } = product;
  
  const price = parseFloat(priceRange.minVariantPrice.amount);
  const imageUrl = images.edges[0]?.node.url || '/images/product-placeholder.jpg';
  const imageAlt = images.edges[0]?.node.altText || title;

  return (
    <Link href={`/products/${handle}`} className="group">
      <div className="overflow-hidden rounded-lg bg-secondary-light">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3 className="font-medium text-dark group-hover:text-primary">{title}</h3>
          <p className="mt-1 font-medium text-primary">${price.toFixed(2)}</p>
        </div>
      </div>
    </Link>
  );
}
