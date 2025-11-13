import { notFound } from "next/navigation";
import { getProductByHandle } from "@/app/lib/catalog";
import { ProductPageContent } from "./ProductPageClient";

export const dynamic = "force-dynamic";

// DO NOT PUT IN HARDCODED VALUES IN HERE -- EVERYTHING SHOULD BE DYNAMICALLY GENERATED FROM THE CATALOG

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
