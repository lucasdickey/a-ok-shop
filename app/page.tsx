import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
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
            className="object-cover"
          />
          <div className="absolute inset-0 bg-dark/40 flex items-center justify-center">
            <div className="text-center text-light p-6">
              <h1 className="mb-4">Welcome to A-OK Store</h1>
              <p className="text-xl mb-6">Premium products for discerning customers</p>
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
          {/* This will be populated with actual products from Shopify */}
          <div className="bg-secondary p-4 rounded-lg">
            <div className="h-64 bg-light mb-4 rounded-md"></div>
            <h3 className="font-semibold text-lg">Product Name</h3>
            <p className="text-primary font-medium">$99.99</p>
          </div>
          <div className="bg-secondary p-4 rounded-lg">
            <div className="h-64 bg-light mb-4 rounded-md"></div>
            <h3 className="font-semibold text-lg">Product Name</h3>
            <p className="text-primary font-medium">$99.99</p>
          </div>
          <div className="bg-secondary p-4 rounded-lg">
            <div className="h-64 bg-light mb-4 rounded-md"></div>
            <h3 className="font-semibold text-lg">Product Name</h3>
            <p className="text-primary font-medium">$99.99</p>
          </div>
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
