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

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    handleSizeSelection(size);
  };

  return (
    <div className="mt-6">
      <label htmlFor="size-select" className="block text-sm font-medium mb-2">
        Size
      </label>
      <select
        id="size-select"
        value={selectedSize}
        onChange={handleSizeChange}
        className="w-full p-2 border border-secondary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="" disabled>
          Select a size
        </option>
        {sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
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
      <h3 className="text-sm font-medium mb-2">Color</h3>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            className={`w-8 h-8 rounded-full border ${getColorStyle(color)} ${
              selectedColor === color
                ? 'ring-2 ring-primary ring-offset-2'
                : 'hover:ring-1 hover:ring-gray-300'
            }`}
            title={color}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      {selectedColor && (
        <p className="mt-2 text-sm text-gray-600">Selected: {selectedColor}</p>
      )}
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
    <div>
      <h1 className="text-3xl font-bold">{product.title}</h1>

      <div className="mt-4">
        <p className="text-2xl font-medium text-primary">${price.toFixed(2)}</p>
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
        />
      </div>

      <div className="mt-8 prose prose-sm max-w-none prose-headings:font-medium prose-ul:list-disc prose-ul:pl-5 prose-li:mt-2 prose-p:mb-4">
        <h3 className="text-lg font-medium">Description</h3>
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
          className="product-description"
        />
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={!images[selectedImageIndex]?.url?.startsWith('http')}
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
                  sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 10vw"
                  unoptimized={!image.url?.startsWith('http')}
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
        hasColorOptions={hasColorOptions}
        colorOptions={colorOptions}
        colorAvailability={colorAvailability}
        selectedImageIndex={selectedImageIndex}
      />
    </div>
  );
}
