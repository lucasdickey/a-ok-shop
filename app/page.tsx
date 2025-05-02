import Link from "next/link";
import Image from "next/image";
import { getAllProducts } from "@/app/lib/shopify";
import { siteConfig } from "@/app/config/siteConfig";

export default async function Home() {
  // Fetch all products
  const products = await getAllProducts();
  
  // Filter products based on the handles in siteConfig
  const featuredProducts = products.filter(product => 
    siteConfig.featuredProducts.includes(product.handle)
  );
  
  // If we couldn't find all the featured products, fall back to the first 3
  const productsToShow = featuredProducts.length === siteConfig.featuredProducts.length 
    ? featuredProducts 
    : products.slice(0, 3);

  return (
    <div className="container mx-auto py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative h-[500px] w-full overflow-hidden rounded-lg">
          <Image
            src="/images/hero-image.png"
            alt="A-OK Store"
            fill
            priority
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-dark/70 flex items-center justify-center p-4">
            <div className="hero-content bg-white/80 p-4 md:p-8 rounded-lg max-w-xl mx-auto">
              <h1 className="mb-4 text-dark font-bold">APES ON KEYS</h1>
              <p className="text-xl mb-6 text-dark">
                Nerd streetwear for AI junkies
              </p>
              <Link href="/products" className="btn btn-primary">
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsToShow.map((product) => (
            <Link
              href={`/products/${product.handle}`}
              key={product.id}
              className="group"
            >
              <div className="border-2 border-[#1F1F1F] bg-[#F5F2DC] p-5 rounded-xl text-[#1F1F1F] transition-all duration-200 hover:shadow-lg hover:scale-[1.02] h-full">
                <div className="relative aspect-square bg-light mb-4 rounded-lg overflow-hidden border border-[#1F1F1F]">
                  {product.images.edges[0]?.node.url &&
                  product.images.edges[0].node.url.startsWith("http") ? (
                    <Image
                      src={product.images.edges[0].node.url}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105 product-image-hover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">{product.title}</span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2 font-['Space_Grotesk',sans-serif]">{product.title}</h3>
                <p className="text-[#8B1E24] font-medium mb-4">
                  $
                  {parseFloat(
                    product.priceRange.minVariantPrice.amount
                  ).toFixed(2)}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/products" className="btn btn-outline">
            View All Products
          </Link>
        </div>
      </section>
    </div>
  );
}
