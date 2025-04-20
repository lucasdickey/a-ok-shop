import Link from 'next/link';
import Image from 'next/image';
import { getAllProducts } from '@/app/lib/shopify';

export default async function Home() {
  // Fetch products for the featured section
  const products = await getAllProducts();
  const featuredProducts = products.slice(0, 3); // Take the first 3 products for the featured section
  
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
          <div className="absolute inset-0 bg-dark/70 flex items-center">
            <div className="text-center bg-white/50 p-8 rounded-lg max-w-xl ml-8 mr-auto">
              <h1 className="mb-4 text-dark font-bold">Welcome to A-OK Store</h1>
              <p className="text-xl mb-6 text-dark">Premium products for discerning customers</p>
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
          {featuredProducts.map((product) => (
            <Link href={`/products/${product.handle}`} key={product.id} className="group">
              <div className="bg-secondary p-4 rounded-lg">
                <div className="relative h-64 bg-light mb-4 rounded-md overflow-hidden">
                  {/* Use a div with background color instead of Image component to avoid image loading issues */}
                  <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">{product.title}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-lg">{product.title}</h3>
                <p className="text-primary font-medium">${parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}</p>
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

      {/* About Section */}
      <section className="mb-12 bg-secondary-light p-8 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">About A-OK Store</h2>
        <p className="mb-4">
          A-OK Store is your destination for premium products. We curate only the finest items to ensure
          you get the best quality and value.
        </p>
        <p>
          Our commitment to excellence means you can shop with confidence, knowing that every purchase
          is guaranteed to be A-OK.
        </p>
      </section>
    </div>
  );
}
