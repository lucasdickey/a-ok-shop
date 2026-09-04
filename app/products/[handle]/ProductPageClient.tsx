'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AddToCartButton from '@/app/components/product/AddToCartButton';

// Client component for size selection
export function SizeSelector({
  sizes,
  variants,
  onSizeSelect,
}: {
  sizes: string[];
  variants: any[];
  onSizeSelect: (size: string, variantId: string) => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Set a default size when the component mounts
  useEffect(() => {
    if (sizes.length > 0 && !selectedSize) {
      const defaultSize = sizes.includes('M') ? 'M' : sizes[0];
      handleSizeSelection(defaultSize);
    }
  }, [sizes]);

  const handleSizeSelection = (size: string) => {
    setSelectedSize(size);

    // Find the variant ID for this size
    let variantId = '';

    // First try to find a variant with matching size
    const variant = variants.find(
      (v) =>
        v.selectedOptions?.some(
          (option: { name: string; value: string }) =>
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
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wider text-dark">
          Size
        </span>
        {selectedSize && (
          <span className="text-sm text-dark-light">
            Selected: <span className="font-semibold">{selectedSize}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
        {sizes.map((size) => {
          const isSelected = selectedSize === size;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSizeSelection(size)}
              className={`min-w-[3rem] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out-expo active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-charcoal-dark bg-charcoal-dark text-bone shadow-sm'
                  : 'border-dark/20 bg-white text-dark hover:border-charcoal-dark hover:-translate-y-0.5 hover:shadow-sm'
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Client component for color selection
export function ColorSelector({
  colors,
  variants,
  colorAvailability,
  onColorSelect,
}: {
  colors: string[];
  variants: any[];
  colorAvailability: Record<string, boolean>;
  onColorSelect: (color: string, variantId: string) => void;
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Set a default color when the component mounts
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const defaultColor =
        colors.find((c) => c.toLowerCase() === 'black') || colors[0];
      handleColorClick(defaultColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  const handleColorClick = (color: string) => {
    setSelectedColor(color);

    // Find the variant ID for this color
    let variantId = '';

    // First try to find a variant with matching color
    const variant = variants.find((v) =>
      v.selectedOptions?.some(
        (option: { name: string; value: string }) =>
          option.name.toLowerCase() === 'color' &&
          option.value.toLowerCase() === color.toLowerCase()
      )
    );

    if (variant) {
      variantId = variant.id;
    } else {
      // If no specific variant found, use the default variant
      variantId = variants[0]?.id || '';
    }

    onColorSelect(color, variantId);
  };

  // Function to determine the background color for the button
  const getColorStyle = (color: string) => {
    // Map color names to CSS colors
    const colorMap: Record<string, string> = {
      black: 'bg-black',
      white: 'bg-white',
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-400',
      purple: 'bg-purple-500',
      gray: 'bg-gray-500',
      navy: 'bg-blue-900',
      brown: 'bg-amber-800',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
    };

    // Default to a gray background if color not in map
    return colorMap[color.toLowerCase()] || 'bg-gray-300';
  };

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wider text-dark">
          Color
        </span>
        {selectedColor && (
          <span className="text-sm text-dark-light">
            Selected: <span className="font-semibold">{selectedColor}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            className={`h-9 w-9 rounded-full border transition-all duration-200 ease-out-expo active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 ${getColorStyle(
              color
            )} ${
              selectedColor === color
                ? 'scale-110 ring-2 ring-maroon ring-offset-2'
                : 'hover:scale-110 hover:ring-1 hover:ring-gray-300'
            }`}
            title={color}
            aria-label={`Select ${color} color`}
            aria-pressed={selectedColor === color}
          />
        ))}
      </div>
    </div>
  );
}

// Client component for product details
export function ProductDetails({
  product,
  images,
  variants,
  price,
  isClothingItem,
  hasSizeOptions,
  sizeOptions,
  sizeAvailability,
  hasColorOptions,
  colorOptions,
  colorAvailability,
  selectedImageIndex,
}: {
  product: any;
  images: any[];
  variants: any[];
  price: number;
  isClothingItem: boolean;
  hasSizeOptions: boolean;
  sizeOptions?: string[];
  sizeAvailability: Record<string, boolean>;
  hasColorOptions: boolean;
  colorOptions?: string[];
  colorAvailability: Record<string, boolean>;
  selectedImageIndex: number;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );

  const handleSizeSelect = (size: string, variantId: string) => {
    setSelectedSize(size);
    setSelectedVariantId(variantId);
  };

  const handleColorSelect = (color: string, variantId: string) => {
    setSelectedColor(color);
    // Only update variant ID if it's valid
    if (variantId) {
      setSelectedVariantId(variantId);
    }
  };

  return (
    // No entrance animation here: a persistent transform would become the
    // containing block for the fixed sticky add-to-cart bar rendered inside.
    <div>
      <h1 className="animate-fade-up font-bebas-neue text-4xl tracking-wide md:text-5xl">
        {product.title}
      </h1>

      <div className="mt-3">
        <p className="font-space-grotesk text-3xl font-medium text-maroon">
          ${price.toFixed(2)}
        </p>
      </div>

      {/* Color selector for products with color options */}
      {hasColorOptions && colorOptions && (
        <ColorSelector
          colors={colorOptions}
          variants={variants}
          colorAvailability={colorAvailability}
          onColorSelect={handleColorSelect}
        />
      )}

      {/* Size selector for clothing items */}
      {isClothingItem && hasSizeOptions && sizeOptions && (
        <SizeSelector
          sizes={sizeOptions}
          variants={variants}
          onSizeSelect={handleSizeSelect}
        />
      )}

      {/* Variant selector for non-clothing items with multiple variants */}
      {!isClothingItem && !hasColorOptions && variants.length > 1 && (
        <div className="mt-6">
          <span className="text-sm font-semibold uppercase tracking-wider text-dark">
            Variants
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                className="rounded-lg border-2 border-dark/20 px-3 py-2 text-sm font-semibold transition-all duration-200 hover:border-charcoal-dark hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to cart button for all products */}
      <div className="mt-8">
        <AddToCartButton
          product={{
            id: product.id,
            title:
              product.title +
              (selectedSize ? ` - ${selectedSize}` : '') +
              (selectedColor ? ` - ${selectedColor}` : ''),
            price: price,
            image:
              images[selectedImageIndex]?.url || '/product-placeholder.jpg',
            variantId: selectedVariantId || variants[0]?.id || '',
            size: selectedSize || undefined,
            color: selectedColor || undefined,
          }}
          showSizeWarning={isClothingItem && hasSizeOptions && !selectedSize}
          showColorWarning={hasColorOptions && !selectedColor}
          stickyOnMobile
        />
      </div>

      <div className="mt-10 border-t border-dark/10 pt-8 prose prose-sm max-w-none prose-headings:font-medium prose-ul:list-disc prose-ul:pl-5 prose-li:mt-2 prose-p:mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-dark">
          Description
        </h3>
        <div
          dangerouslySetInnerHTML={{
            __html:
              product.descriptionHtml ||
              (product.description
                ? product.description
                    .replace(/\n/g, '<br />')
                    .replace(/\r/g, '')
                : ''),
          }}
          className="product-description mt-3"
        />
      </div>

      {product.tags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-dark">
            Tags
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-dark/10 bg-secondary px-3 py-1 text-xs font-medium transition-colors duration-200 hover:bg-secondary-dark"
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

// Client component for product images gallery
export function ProductPageContent({
  product,
  images,
  variants,
  price,
  isClothingItem,
  hasSizeOptions,
  sizeOptions,
  sizeAvailability,
  hasColorOptions,
  colorOptions,
  colorAvailability,
}: {
  product: any;
  images: any[];
  variants: any[];
  price: number;
  isClothingItem: boolean;
  hasSizeOptions: boolean;
  sizeOptions?: string[];
  sizeAvailability: Record<string, boolean>;
  hasColorOptions: boolean;
  colorOptions?: string[];
  colorAvailability: Record<string, boolean>;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
      {/* Product Images */}
      <div className="space-y-4 md:sticky md:top-24 md:self-start">
        <div className="group relative aspect-square overflow-hidden rounded-2xl border border-dark/10 bg-secondary-light shadow-card">
          <Image
            key={selectedImageIndex}
            src={images[selectedImageIndex]?.url || '/product-placeholder.jpg'}
            alt={images[selectedImageIndex]?.alt || product.title}
            fill
            className="animate-fade-in object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={!images[selectedImageIndex]?.url?.startsWith('http')}
          />
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                aria-label={`View image ${index + 1} of ${product.title}`}
                aria-pressed={selectedImageIndex === index}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-secondary-light transition-all duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 ${
                  selectedImageIndex === index
                    ? 'border-maroon shadow-sm'
                    : 'border-transparent opacity-70 hover:-translate-y-0.5 hover:opacity-100 hover:shadow-sm'
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 10vw"
                  unoptimized={!image.url?.startsWith('http')}
                />
              </button>
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
        hasColorOptions={hasColorOptions}
        colorOptions={colorOptions}
        colorAvailability={colorAvailability}
        selectedImageIndex={selectedImageIndex}
      />
    </div>
  );
}
