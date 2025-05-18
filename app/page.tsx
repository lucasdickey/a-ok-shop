import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/app/config/siteConfig";
import ImageGrid from "@/app/components/ImageGrid";
import fs from "fs";
import path from "path";

// Function to get gallery images from JSON file
async function getGalleryImages() {
  try {
    const imageListPath = path.join(
      process.cwd(),
      "app",
      "data",
      "image-list.json"
    );
    const imageList = JSON.parse(fs.readFileSync(imageListPath, "utf8"));
    console.log(
      `Loaded ${imageList.length} images from pre-generated list during build`
    );
    return imageList;
  } catch (error) {
    console.error("Error reading pre-generated image list:", error);
    return [];
  }
}

// Simple mock product for fallback
const mockProduct = {
  id: "fallback-1",
  handle: "fallback-product",
  title: "Featured Product",
  description: "Check out our amazing products",
  priceRange: {
    minVariantPrice: {
      amount: "29.99",
    },
  },
  images: {
    edges: [
      {
        node: {
          url: "/placeholder-product.jpg",
          altText: "Product placeholder",
        },
      },
    ],
  },
  variants: {
    edges: [
      {
        node: {
          id: "fallback-variant-1",
          title: "Default Title",
          price: {
            amount: "29.99",
          },
          availableForSale: true,
        },
      },
    ],
  },
};

// Dynamically import the Shopify functionality to avoid webpack issues
async function getProducts() {
  try {
    const { getAllProducts } = await import("@/app/lib/shopify");
    return await getAllProducts();
  } catch (error) {
    console.error("Error in getProducts:", error);
    return [];
  }
}

export default async function Home() {
  // Fetch all products with error handling
  let products: Array<any> = [];
  try {
    products = await getProducts();
    console.log(`Fetched ${products.length} products successfully`);
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  // Ensure we always have at least one product to show
  if (products.length === 0) {
    console.log("No products found, using fallback product");
    products = [mockProduct];
  }

  // Filter products based on the handles in siteConfig or use available products
  const featuredProducts = siteConfig.featuredProducts
    ? products.filter((product) =>
        siteConfig.featuredProducts.includes(product.handle)
      )
    : [];

  // If we couldn't find any featured products, use the first available products
  const productsToShow =
    featuredProducts.length > 0
      ? featuredProducts.slice(0, 3)
      : products.slice(0, Math.min(3, products.length));

  // Get gallery images using the new function
  let galleryImages = [];
  try {
    galleryImages = await getGalleryImages();
  } catch (error) {
    console.error("Error loading gallery images:", error);
  }
  const hasGalleryImages = galleryImages.length > 0;

  return (
    <div className="container mx-auto py-8 px-8 md:px-16 lg:px-24 xl:px-32">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative h-[500px] w-full overflow-hidden rounded-lg">
          <Image
            src="/hero.jpg"
            alt="A-OK Shop Hero"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white p-6 bg-black bg-opacity-70 rounded-lg max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">A-OK</h1>
              <p className="text-xl md:text-2xl mb-6">
                APES ON KEYS - AI NERDWEAR
              </p>
              <Link
                href="/products"
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors inline-block"
              >
                SHOP NOW
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">
          Featured Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {productsToShow.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={
                    product.images?.edges?.[0]?.node?.url ||
                    "/placeholder-product.jpg"
                  }
                  alt={
                    product.images?.edges?.[0]?.node?.altText || product.title
                  }
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{product.title}</h3>
                <p className="text-gray-700 mb-4">
                  ${product.priceRange?.minVariantPrice?.amount || "29.99"}
                </p>
                <Link
                  href={`/products/${product.handle}`}
                  className="block w-full bg-black text-white text-center py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  View Product
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Section */}
      {hasGalleryImages && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Gallery</h2>
          <ImageGrid images={galleryImages} title="Gallery Images" />
        </section>
      )}

      {/* Game Section */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Play Our Game</h2>
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="aspect-video w-full relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400">Loading game...</p>
            </div>
            <iframe
              src="https://v0-retro-style-game-concept.vercel.app/"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Chaos Monkey Game"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
