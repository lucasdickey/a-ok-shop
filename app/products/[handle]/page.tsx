'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductByHandle } from '@/app/lib/shopify';
import AddToCartButton from '@/app/components/product/AddToCartButton';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

// Client component for size selection
function SizeSelector({ 
  sizes, 
  variants, 
  sizeAvailability,
  onSizeSelect 
}: { 
  sizes: string[], 
  variants: any[],
  sizeAvailability: Record<string, boolean>,
  onSizeSelect: (size: string, variantId: string) => void 
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const handleSizeClick = (size: string) => {
    setSelectedSize(size);
    
    // Find the variant ID for this size
    let variantId = '';
    
    // First try to find a variant with matching size
    const variant = variants.find(v => 
      v.selectedOptions?.some((option: {name: string, value: string}) => 
        option.name.toLowerCase() === 'size' && option.value === size
      ) || v.title === size
    );
    
    if (variant) {
      variantId = variant.id;
    } else {
      // If no specific variant found, use the default variant
      variantId = variants[0]?.id || '';
    }
    
    onSizeSelect(size, variantId);
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Size</h3>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => sizeAvailability[size] ? handleSizeClick(size) : null}
            disabled={!sizeAvailability[size]}
            className={`px-3 py-1 rounded-md border ${
              selectedSize === size
                ? 'bg-primary text-white border-primary'
                : sizeAvailability[size] 
                  ? 'border-secondary hover:bg-secondary-light' 
                  : 'border-gray-300 text-gray-300 cursor-not-allowed size-button-unavailable'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

// Client component for product details
function ProductDetails({ 
  product, 
  images, 
  variants, 
  price, 
  isClothingItem, 
  hasSizeOptions, 
  sizeOptions,
  sizeAvailability,
  selectedImageIndex
}: { 
  product: any, 
  images: any[], 
  variants: any[], 
  price: number,
  isClothingItem: boolean,
  hasSizeOptions: boolean,
  sizeOptions?: string[],
  sizeAvailability: Record<string, boolean>,
  selectedImageIndex: number
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');
  
  const handleSizeSelect = (size: string, variantId: string) => {
    setSelectedSize(size);
    setSelectedVariantId(variantId);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">{product.title}</h1>
      
      <div className="mt-4">
        <p className="text-2xl font-medium text-primary">
          ${price.toFixed(2)}
        </p>
      </div>

      {/* Size selector for clothing items */}
      {isClothingItem && hasSizeOptions && sizeOptions && (
        <SizeSelector 
          sizes={sizeOptions} 
          variants={variants}
          sizeAvailability={sizeAvailability}
          onSizeSelect={handleSizeSelect}
        />
      )}

      {/* Variant selector for non-clothing items with multiple variants */}
      {!isClothingItem && variants.length > 1 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Variants</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                className="rounded-md border border-secondary px-3 py-1 text-sm hover:bg-secondary-light"
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to cart button for all products */}
      <div className="mt-6">
        <AddToCartButton
          product={{
            id: product.id,
            title: product.title + (selectedSize ? ` - ${selectedSize}` : ''),
            price: price,
            image: images[selectedImageIndex]?.url || '/product-placeholder.jpg',
            variantId: selectedVariantId || variants[0]?.id || '',
          }}
          showSizeWarning={isClothingItem && hasSizeOptions && !selectedSize}
        />
      </div>

      <div className="mt-8 prose prose-sm max-w-none">
        <h3 className="text-lg font-medium">Description</h3>
        <div dangerouslySetInnerHTML={{ __html: product.description }} />
      </div>

      {product.tags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Tags</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main product page component
function ProductPageContent({ 
  product,
  images,
  variants,
  price,
  isClothingItem,
  hasSizeOptions,
  sizeOptions,
  sizeAvailability
}: { 
  product: any, 
  images: any[], 
  variants: any[], 
  price: number,
  isClothingItem: boolean,
  hasSizeOptions: boolean,
  sizeOptions?: string[],
  sizeAvailability: Record<string, boolean>
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary-light">
          <Image
            src={images[selectedImageIndex]?.url || '/product-placeholder.jpg'}
            alt={images[selectedImageIndex]?.alt || product.title}
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => (
              <div 
                key={index} 
                className={`relative aspect-square overflow-hidden rounded-lg bg-secondary-light cursor-pointer ${
                  selectedImageIndex === index ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <ProductDetails 
        product={product}
        images={images}
        variants={variants}
        price={price}
        isClothingItem={isClothingItem}
        hasSizeOptions={hasSizeOptions}
        sizeOptions={sizeOptions}
        sizeAvailability={sizeAvailability}
        selectedImageIndex={selectedImageIndex}
      />
    </div>
  );
}

// Server component
export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const product = await getProductByHandle(params.handle);

  if (!product) {
    notFound();
  }

  const images = product.images.edges.map(({ node }) => ({
    url: node.url,
    alt: node.altText || product.title,
  }));

  const variants = product.variants.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    price: parseFloat(node.price.amount),
    available: node.availableForSale,
    selectedOptions: node.selectedOptions,
  }));

  const defaultVariant = variants[0];
  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  
  // Extract size information - include all standard clothing sizes
  const standardSizes = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  let sizeValues: string[] = [];
  
  // Track availability for each size
  const sizeAvailability: Record<string, boolean> = {};
  standardSizes.forEach(size => {
    // Default to available instead of unavailable when we have inventory
    sizeAvailability[size] = true;
  });
  
  // First try to get size options from the product options
  const sizeOption = product.options?.find(option => 
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
  if (sizeValues.length === 0) {
    const sizeSet = new Set<string>();
    
    variants.forEach(variant => {
      if (variant.selectedOptions) {
        const sizeOption = variant.selectedOptions.find((opt: {name: string, value: string}) => 
          opt.name.toLowerCase() === 'size'
        );
        
        if (sizeOption && standardSizes.includes(sizeOption.value)) {
          sizeSet.add(sizeOption.value);
          // Always set available to true since we have inventory
          sizeAvailability[sizeOption.value] = true;
        } else if (standardSizes.includes(variant.title)) {
          // If variant title is a standard size
          sizeSet.add(variant.title);
          // Always set available to true since we have inventory
          sizeAvailability[variant.title] = true;
        }
      }
    });
    
    sizeValues = Array.from(sizeSet);
  }
  
  // Check if this is a clothing item (shirt or hoodie)
  const isClothingItem = product.productType.toLowerCase().includes('t-shirt') || 
                         product.productType.toLowerCase().includes('hoodie') ||
                         product.tags.some(tag => 
                           tag.toLowerCase().includes('t-shirt') || 
                           tag.toLowerCase().includes('tshirt') || 
                           tag.toLowerCase().includes('hoodie')
                         );
  
  // If still no size values and this is a clothing item, use all standard sizes as a fallback
  if (sizeValues.length === 0 && isClothingItem) {
    sizeValues = [...standardSizes];
  }
  
  // Sort sizes in the standard order
  sizeValues.sort((a, b) => {
    return standardSizes.indexOf(a) - standardSizes.indexOf(b);
  });
  
  const hasSizeOptions = sizeValues.length > 0;

  console.log('Product has size options:', hasSizeOptions);
  console.log('Size options:', sizeValues);
  console.log('Is clothing item:', isClothingItem);
  console.log('Variants:', variants);
  console.log('Size availability:', sizeAvailability);

  return (
    <div className="container py-8">
      <ProductPageContent 
        product={product}
        images={images}
        variants={variants}
        price={price}
        isClothingItem={isClothingItem}
        hasSizeOptions={hasSizeOptions}
        sizeOptions={sizeValues}
        sizeAvailability={sizeAvailability}
      />
    </div>
  );
}
