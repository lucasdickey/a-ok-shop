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
      <label htmlFor="size-select" className="micro mb-2 block">
        Size / XS–2XL
      </label>
      <select
        id="size-select"
        value={selectedSize}
        onChange={handleSizeChange}
        className="min-h-[48px] w-full rounded-none border-2 border-dark bg-club-slip px-3 font-mono text-sm shadow-hard-sm"
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
  defaultColor,
  swatches,
}: {
  colors: string[];
  variants: any[];
  colorAvailability: Record<string, boolean>;
  onColorSelect: (color: string, variantId: string) => void;
  /** The color shown in the first photo, so the page opens with matching swatch and photo. */
  defaultColor?: string;
  /** Swatch color per color name, measured from the photos. */
  swatches?: Record<string, string>;
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Set a default color when the component mounts
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const startColor =
        (defaultColor && colors.includes(defaultColor) ? defaultColor : undefined) ||
        colors.find((c) => c.toLowerCase() === 'black') ||
        colors[0];
      handleColorClick(startColor);
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
      beige: 'bg-[#D9C7A7]',
      natural: 'bg-[#E8DACD]', // Gildan 5000 Natural, per the production notes
      oat: 'bg-[#EAE2CF]', // sampled from the Hallucination Club oat mockup
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
      <h3 className="micro mb-2 font-normal">Color</h3>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            aria-pressed={selectedColor === color}
            style={swatches?.[color] ? { backgroundColor: swatches[color] } : undefined}
            className={`h-11 w-11 rounded-full border-2 border-dark ${swatches?.[color] ? '' : getColorStyle(color)} ${
              selectedColor === color
                ? 'shadow-hard-sm ring-2 ring-dark ring-offset-2 ring-offset-club-paper'
                : 'hover:-translate-y-0.5'
            }`}
            title={color}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      {selectedColor && (
        <p className="micro mt-2">Selected: {selectedColor}</p>
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
  onColorChange,
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
  /** Called when a color is chosen, so the gallery can show that color's photo. */
  onColorChange?: (color: string) => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onColorChange?.(color);
  };

  // Pick the variant by color. Size isn't part of the match: clothing is printed on demand in
  // every standard size, and products without a size picker have one size.
  const optionOf = (variant: any, name: string): string | undefined =>
    variant.selectedOptions?.find(
      (option: { name: string; value: string }) => option.name.toLowerCase() === name
    )?.value;
  const variantsHaveColor = variants.some((v) => optionOf(v, 'color'));
  const matchesColor = (v: any) =>
    v.available !== false &&
    (!variantsHaveColor ||
      !selectedColor ||
      optionOf(v, 'color')?.toLowerCase() === selectedColor.toLowerCase());
  // Prefer the variant carrying the chosen size when the catalog has one, as checkout does.
  const selectedVariant =
    variants.find((v) => matchesColor(v) && optionOf(v, 'size') === selectedSize) ||
    variants.find(matchesColor);
  const selectedVariantId = selectedVariant?.id || '';
  // One cart line per variant + size + color, so a second size or color doesn't merge into the first.
  const cartLineId = [selectedVariantId || product.id, selectedSize, selectedColor]
    .filter(Boolean)
    .join(':');

  return (
    <div className="min-w-0">
      <p className="micro">A–OK / Line item</p>
      <h1 className="display-heading mt-4 text-[clamp(48px,6vw,84px)]">{product.title}</h1>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-y-2 border-dashed border-dark py-4">
        <span className="micro">Price, before the good decisions</span>
        <p className="text-3xl font-bold">${price.toFixed(2)}</p>
      </div>

      {/* Color selector for products with color options */}
      {hasColorOptions && colorOptions && (
        <ColorSelector
          colors={colorOptions}
          variants={variants}
          colorAvailability={colorAvailability}
          onColorSelect={handleColorSelect}
          defaultColor={images[0]?.color}
          swatches={product.swatches}
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
          <h3 className="micro font-normal">Variants</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                className="border-2 border-dark px-3 py-1 text-sm hover:bg-club-yellow"
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
            id: cartLineId,
            title:
              product.title +
              (selectedSize ? ` - ${selectedSize}` : '') +
              (selectedColor ? ` - ${selectedColor}` : ''),
            price: price,
            image:
              images[selectedImageIndex]?.url || '/product-placeholder.jpg',
            variantId: selectedVariantId,
            size: selectedSize || undefined,
            color: selectedColor || undefined,
          }}
          showSizeWarning={isClothingItem && hasSizeOptions && !selectedSize}
          showColorWarning={hasColorOptions && !selectedColor}
          unavailable={!selectedVariant}
        />
      </div>

      <div className="receipt-slip mt-10">
        <h3 className="micro mb-4 border-b border-dashed border-dark pb-3 text-center font-normal">
          Description / the fine print
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
          className="product-description"
        />
      </div>

      {product.tags.length > 0 && (
        <div className="mt-10">
          <h3 className="micro font-normal">Tags</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.tags.map((tag: string) => (
              <span
                key={tag}
                className="border border-dark bg-club-yellow px-2.5 py-1 font-mono text-[11px] uppercase"
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

  // Show the chosen color's first photo; colors without one leave the photo as it is.
  const showColor = (color: string) => {
    const index = images.findIndex((image) => image.color === color);
    if (index !== -1) setSelectedImageIndex(index);
  };

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-14">
      {/* Product Images */}
      <div className="min-w-0 space-y-5">
        <div className="relative aspect-square overflow-hidden border-2 border-dark bg-club-yellow shadow-hard-lg">
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
          <div className="grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                type="button"
                key={index}
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-pressed={selectedImageIndex === index}
                className={`relative aspect-square overflow-hidden border-2 border-dark bg-club-sky ${
                  selectedImageIndex === index ? 'shadow-hard-red' : 'hover:shadow-hard-sm'
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
        onColorChange={showColor}
      />
    </div>
  );
}
