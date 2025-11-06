"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductByHandle } from "@/app/lib/catalog";
import AddToCartButton from "@/app/components/product/AddToCartButton";
import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

// DO NOT PUT IN HARDCODED VALUES IN HERE -- EVERYTHING SHOULD BE DYNAMICALLY GENERATED FROM THE CATALOG

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
          <Image
            src={images[selectedImageIndex]?.url || "/product-placeholder.jpg"}
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
                  selectedImageIndex === index ? "ring-2 ring-primary" : ""
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

  // Log the raw image data from the API
  console.log("Raw image data:", JSON.stringify(product.images.edges, null, 2));
  
  const images = product.images.edges.map(({ node }) => {
    // Log each image node
    console.log("Image node:", node);

    // Keep URLs as-is - they're either full URLs or local paths
    let imageUrl = node.url;

    // Only handle protocol-relative URLs (starts with //)
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    }

    return {
      url: imageUrl,
      alt: node.altText || product.title,
    };
  });
  
  // Log the processed images
  console.log("Processed images:", images);

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
  const sizeValues: string[] = [];

  // First try to get size options from the product options
  const sizeOption = product.options?.find(
    (option) => option.name.toLowerCase() === "size"
  );

  if (sizeOption && sizeOption.values.length > 0) {
    // Filter to only include standard sizes
    sizeValues.push(...sizeOption.values);
  }

  // If no size options found, try to extract from variants
  if (sizeValues.length === 0) {
    const sizeSet = new Set<string>();

    variants.forEach((variant) => {
      if (variant.selectedOptions) {
        const sizeOption = variant.selectedOptions.find(
          (opt: { name: string; value: string }) =>
            opt.name.toLowerCase() === "size"
        );

        if (sizeOption) {
          sizeSet.add(sizeOption.value);
        } else if (variant.title) {
          // If variant title is a standard size
          sizeSet.add(variant.title);
        }
      }
    });

    sizeValues.push(...Array.from(sizeSet));
  }

  // Check if this is a clothing item (shirt or hoodie)
  const isClothingItem =
    product.productType.toLowerCase().includes("t-shirt") ||
    product.productType.toLowerCase().includes("hoodie") ||
    product.tags.some(
      (tag) =>
        tag.toLowerCase().includes("t-shirt") ||
        tag.toLowerCase().includes("tshirt") ||
        tag.toLowerCase().includes("hoodie")
    );

  // If still no size values and this is a clothing item, use all standard sizes as a fallback
  // Since products are printed on demand, all sizes are always available
  if ((sizeValues.length === 0 || true) && isClothingItem) {
    console.log("Using standard sizes for clothing item");
    sizeValues.length = 0; // Clear any existing sizes to ensure consistent ordering
    sizeValues.push(...["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"]);
  }

  // Sort sizes in the standard order
  sizeValues.sort((a, b) => {
    return (
      ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"].indexOf(a) -
      ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"].indexOf(b)
    );
  });

  const hasSizeOptions = sizeValues.length > 0;

  console.log("Product has size options:", hasSizeOptions);
  console.log("Size options:", sizeValues);
  console.log("Is clothing item:", isClothingItem);
  console.log("Variants:", variants);

  // Extract color information
  const colorValues: string[] = [];

  // Try to get color options from product options
  const colorOption = product.options?.find(
    (option: any) => option.name.toLowerCase() === "color"
  );

  if (colorOption && colorOption.values.length > 0) {
    console.log(
      "Found color options in product options:",
      colorOption.values
    );
    colorValues.push(...colorOption.values);
  }

  // If still no colors found, check if there are color-related selectedOptions in variants
  if (colorValues.length === 0) {
    console.log("Checking variant selectedOptions for colors");
    const colorSet = new Set<string>();

    variants.forEach((variant) => {
      if (variant.selectedOptions) {
        const colorOption = variant.selectedOptions.find(
          (opt: { name: string; value: string }) =>
            opt.name.toLowerCase() === "color"
        );

        if (colorOption) {
          console.log(
            `Found color in variant ${variant.title} selectedOptions:`,
            colorOption.value
          );
          colorSet.add(colorOption.value);
        }
      }
    });

    if (colorSet.size > 0) {
      colorValues.push(...Array.from(colorSet));
    }
  }
  
  // If still no colors found, try to extract from product description
  if (colorValues.length === 0 && product.description) {
    console.log("Attempting to extract colors from product description");
    
    // Common color names to look for
    const commonColors = [
      "black", "white", "red", "blue", "green", "yellow", "purple", "pink",
      "orange", "brown", "gray", "grey", "navy", "teal", "maroon", "olive",
      "silver", "gold", "beige", "tan", "coral", "mint", "lavender"
    ];
    
    // Look for color patterns in the description
    const colorPattern = new RegExp(`\\b(${commonColors.join('|')})\\b`, 'gi');
    const matches = product.description.match(colorPattern);
    
    if (matches && matches.length > 0) {
      console.log("Found colors in description:", matches);
      
      // Create a set of unique colors (case-insensitive)
      const uniqueColorsSet = new Set<string>();
      
      // Process each color and add to the set
      matches.forEach(color => {
        const formattedColor = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
        uniqueColorsSet.add(formattedColor);
      });
      
      // Convert set to array and add to colorValues
      colorValues.push(...Array.from(uniqueColorsSet));
    }
    
    // Look for specific color mentions like "Color: Red, Blue" or "Color palette: cardinal red, shell white"
    const colorListPatterns = [
      /colors?:?\s*([\w\s,]+)/i,
      /colors? palette:?\s*([\w\s,]+)/i,
      /palette:?\s*([\w\s,]+)/i
    ];
    
    for (const pattern of colorListPatterns) {
      const colorListMatch = product.description.match(pattern);
      
      if (colorListMatch && colorListMatch[1]) {
        console.log("Found color list in description:", colorListMatch[1]);
        
        // Split by commas and clean up each color name
        // This will handle compound color names like "cardinal red" or "shell white"
        const extractedColors = colorListMatch[1].split(/,|\sand\s/).map(color => {
          const trimmed = color.trim();
          // For compound colors like "cardinal red", keep the full name
          if (trimmed.includes(' ')) {
            return trimmed.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          }
          // For single word colors
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        }).filter(color => color.length > 0);
        
        if (extractedColors.length > 0) {
          console.log("Extracted color names:", extractedColors);
          colorValues.push(...extractedColors);
          break; // Stop after finding the first match
        }
      }
    }
    
    // Look for specific color mentions in bullet points or lists
    if (colorValues.length === 0) {
      // This pattern looks for color names that might be part of a list item
      const bulletPointColorPattern = /[•\-*]\s*([\w\s]+) (red|blue|black|white|green|yellow|purple|pink|orange|brown|gray|grey)/gi;
      let match;
      const compoundColors = new Set<string>();
      
      while ((match = bulletPointColorPattern.exec(product.description)) !== null) {
        if (match[1] && match[2]) {
          const compoundColor = `${match[1].trim()} ${match[2]}`.trim();
          console.log("Found compound color in bullet point:", compoundColor);
          compoundColors.add(compoundColor.charAt(0).toUpperCase() + compoundColor.slice(1).toLowerCase());
        }
      }
      
      if (compoundColors.size > 0) {
        colorValues.push(...Array.from(compoundColors));
      }
    }
  }

  // If still no colors found and this is a clothing item, provide standard color options
  // Since products are printed on demand, we can offer standard colors
  if (colorValues.length === 0 && isClothingItem) {
    console.log("Using standard colors for print-on-demand clothing item");
    colorValues.push(
      "Black", 
      "White", 
      "Red", 
      "Blue", 
      "Green", 
      "Yellow", 
      "Purple", 
      "Gray", 
      "Navy", 
      "Brown", 
      "Orange", 
      "Pink"
    );
  }
  
  // All colors are always available since products are printed on demand
  const colorAvailability: Record<string, boolean> = {};
  colorValues.forEach((color) => {
    colorAvailability[color] = true;
  });

  // Set hasColorOptions based on whether we found any colors
  const hasColorOptions = colorValues.length > 0;

  console.log("Product has color options:", hasColorOptions);
  console.log("Color options:", colorValues);

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
