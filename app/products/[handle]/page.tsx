"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
// Use API instead of direct Shopify import
import AddToCartButton from "@/app/components/product/AddToCartButton";
import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

// DO NOT PUT IN HARDCODED VALUES IN HERE -- EVERYTHING SHOULD BE DYNAMICALLY GENERATED FROM THE SHOPIFY API

// Client component for size selection
function SizeSelector({
  sizes,
  variants,
  onSizeSelect,
}: {
  sizes: string[];
  variants: any[];
  onSizeSelect: (size: string, variantId: string) => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Set a default size when the component mounts
  useEffect(() => {
    if (sizes.length > 0 && !selectedSize) {
      const defaultSize = sizes.includes("M") ? "M" : sizes[0];
      handleSizeSelection(defaultSize);
    }
  }, [sizes]);

  const handleSizeSelection = (size: string) => {
    setSelectedSize(size);

    // Find the variant ID for this size
    let variantId = "";

    // First try to find a variant with matching size
    const variant = variants.find(
      (v) =>
        v.selectedOptions?.some(
          (option: { name: string; value: string }) =>
            option.name.toLowerCase() === "size" && option.value === size
        ) || v.title === size
    );

    if (variant) {
      variantId = variant.id;
    } else {
      // If no specific variant found, use the default variant
      variantId = variants[0]?.id || "";
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
function ColorSelector({
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
    let variantId = "";

    // First try to find a variant with matching color
    const variant = variants.find((v) =>
      v.selectedOptions?.some(
        (option: { name: string; value: string }) =>
          option.name.toLowerCase() === "color" &&
          option.value.toLowerCase() === color.toLowerCase()
      )
    );

    if (variant) {
      variantId = variant.id;
    } else {
      // If no specific variant found, use the default variant
      variantId = variants[0]?.id || "";
    }

    onColorSelect(color, variantId);
  };

  // Function to determine the background color for the button
  const getColorStyle = (color: string) => {
    // Map color names to CSS colors
    const colorMap: Record<string, string> = {
      black: "bg-black",
      white: "bg-white",
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-400",
      purple: "bg-purple-500",
      gray: "bg-gray-500",
      navy: "bg-blue-900",
      brown: "bg-amber-800",
      orange: "bg-orange-500",
      pink: "bg-pink-500",
    };

    // Default to a gray background if color not in map
    return colorMap[color.toLowerCase()] || "bg-gray-300";
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
                ? "ring-2 ring-primary ring-offset-2"
                : "hover:ring-1 hover:ring-gray-300"
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
function ProductDetails({
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
    variants[0]?.id || ""
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
              (selectedSize ? ` - ${selectedSize}` : "") +
              (selectedColor ? ` - ${selectedColor}` : ""),
            price: price,
            image:
              images[selectedImageIndex]?.url || "/product-placeholder.jpg",
            variantId: selectedVariantId || variants[0]?.id || "",
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
                    .replace(/\n/g, "<br />")
                    .replace(/\r/g, "")
                : ""),
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

// Main product page component
function ProductPageContent({
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

  // Log the description data to check what's coming from Shopify
  console.log("Product description:", product.description);
  console.log("Product descriptionHtml:", product.descriptionHtml);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary-light">
          {images[selectedImageIndex]?.url?.startsWith('http') ? (
            <Image
              src={images[selectedImageIndex]?.url || "/product-placeholder.jpg"}
              alt={images[selectedImageIndex]?.alt || product.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <span className="text-gray-500">{product.title}</span>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => (
              <div
                key={index}
                className={`relative aspect-square overflow-hidden rounded-lg bg-secondary-light cursor-pointer ${
                  selectedImageIndex === index ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                {image.url?.startsWith('http') ? (
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 10vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-xs text-gray-500">No image</span>
                  </div>
                )}
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

// Client component with data fetching
export default function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/products/${params.handle}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setProduct(data.product);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.handle]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2">{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  // Process images for database structure
  const images = product.images?.map((image: any) => ({
    url: image.url,
    alt: image.altText || product.title,
  })) || [];

  // Process variants for database structure
  const variants = product.variants?.map((variant: any) => ({
    id: variant.id,
    title: variant.title || `${variant.size || ''} ${variant.color || ''}`.trim(),
    price: variant.price,
    available: variant.available,
    size: variant.size,
    color: variant.color,
  })) || [];

  const defaultVariant = variants[0];
  const price = defaultVariant?.price || 0;

  // Extract size information from variants
  const sizeSet = new Set<string>();
  variants.forEach((variant) => {
    if (variant.size) {
      sizeSet.add(variant.size);
    }
  });

  // Check if this is a clothing item
  const isClothingItem =
    product.productType?.toLowerCase().includes("t-shirt") ||
    product.productType?.toLowerCase().includes("hoodie") ||
    product.tags?.some((tag: string) =>
      tag.toLowerCase().includes("t-shirt") ||
      tag.toLowerCase().includes("tshirt") ||
      tag.toLowerCase().includes("hoodie")
    );

  // Use standard sizes for clothing items (since products are print-on-demand)
  const sizeValues = isClothingItem && sizeSet.size === 0
    ? ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"]
    : Array.from(sizeSet).sort((a, b) => {
        const order = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
        return order.indexOf(a) - order.indexOf(b);
      });

  const hasSizeOptions = sizeValues.length > 0;

  // Extract color information from variants
  const colorSet = new Set<string>();
  variants.forEach((variant) => {
    if (variant.color) {
      colorSet.add(variant.color);
    }
  });

  // Use standard colors for clothing items if none found
  const colorValues = isClothingItem && colorSet.size === 0
    ? ["Black", "White", "Red", "Blue", "Green", "Yellow", "Purple", "Gray", "Navy", "Brown", "Orange", "Pink"]
    : Array.from(colorSet);

  const hasColorOptions = colorValues.length > 0;
  
  // All colors are available since products are print-on-demand
  const colorAvailability: Record<string, boolean> = {};
  colorValues.forEach((color) => {
    colorAvailability[color] = true;
  });

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
        sizeAvailability={{}}
        hasColorOptions={hasColorOptions}
        colorOptions={colorValues}
        colorAvailability={colorAvailability}
      />
    </div>
  );
}
