import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/app/config/siteConfig";
import ImageGrid from "@/app/components/ImageGrid";

// Simple mock product for fallback
const mockProduct = {
  id: "fallback-1",
  handle: "fallback-product",
  title: "A-OK T-Shirt",
  description: "A comfortable t-shirt for everyday wear",
  priceRange: {
    minVariantPrice: {
      amount: "29.99",
    },
  },
  images: [
    {
      url: "/images/placeholder-product.jpg",
      altText: "A-OK T-Shirt",
    },
  ],
  variants: [
    {
      id: "1",
      title: "Default Title",
      price: {
        amount: "29.99",
      },
      availableForSale: true,
    },
  ],
};

// Function to get gallery images from API
async function getGalleryImages() {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/local-gallery`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch gallery images");
    }

    const data = await response.json();
    console.log(`Loaded ${data.counts?.total || 0} images from API`);
    return data.images || [];
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

// Dynamically import the Shopify functionality to avoid webpack issues
async function getProducts() {
  try {
    const { getAllProducts } = await import("@/app/lib/shopify");
    return await getAllProducts();
  } catch (error) {
    console.error("Error initializing Shopify client:", error);
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
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 3);

  // Get gallery images
  const galleryImages = await getGalleryImages();
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
        <h2 className="text-5xl font-bold mb-8 text-center">Featured Gear</h2>
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
        <section className="mb-16 px-4">
          <Link href="/gallery" passHref legacyBehavior>
            <a className="block">
              <h2 className="text-5xl font-bold mb-8 text-center bebas-heading hover:opacity-80 transition-opacity">
                Chaos Monkeys at work
              </h2>
            </a>
          </Link>
          <div className="max-w-7xl mx-auto">
            <ImageGrid images={galleryImages} title="Gallery Images" />
          </div>
        </section>
      )}
    </div>
  );
}
