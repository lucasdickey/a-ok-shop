import Link from "next/link";
import Image from "next/image";
import { getAllProducts } from "@/app/lib/shopify";
import { siteConfig } from "@/app/config/siteConfig";

export default async function Home() {
  // Fetch all products
  const products = await getAllProducts();

  // Filter products based on the handles in siteConfig
  const featuredProducts = products.filter((product) =>
    siteConfig.featuredProducts.includes(product.handle)
  );

  // If we couldn't find all the featured products, fall back to the first 3
  const productsToShow =
    featuredProducts.length === siteConfig.featuredProducts.length
      ? featuredProducts
      : products.slice(0, 3);

  return (
    <div className="container mx-auto py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative h-[500px] w-full overflow-hidden rounded-lg">
          <Image
            src="/images/hero-v1a.png"
            alt="A-OK Store"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-dark/50 flex items-center justify-center md:items-start md:justify-end md:pt-16">
            <div
              className="hero-content bg-white/80 p-4 rounded-xl md:mr-6 flex flex-col items-center text-center justify-center"
              style={{ width: "auto", maxWidth: "280px" }}
            >
              <h1 className="text-6xl md:text-6xl font-bebas-neue text-dark leading-tight text-shadow-bold">
                A - O K
              </h1>
              <p className="text-lg md:text-xl text-dark font-bebas-neue tracking-wide">
                APES ON KEYS - AI NERDWEAR
              </p>
              <div className="mt-5">
                <Link href="/products" className="btn btn-primary">
                  Shop Now
                </Link>
              </div>
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
                <h3 className="font-bebas-neue text-xl mb-1 tracking-wide">
                  {product.title}
                </h3>
                <p className="text-[#8B1E24] font-bebas-neue text-lg mb-4">
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

      {/* About Section */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bebas-neue mb-6 text-center">
          Who are Apes On Keys?
        </h1>
        <div className="w-full max-w-3xl mx-auto bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg border border-gray-700">
          <div className="flex items-center bg-[#333333] px-4 py-2 border-b border-gray-700">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-4 text-gray-300 text-sm font-mono">
              monkey_theorem.md
            </div>
          </div>
          <div
            className="p-6 h-[400px] overflow-y-auto font-mono text-sm text-gray-300 leading-relaxed"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#555 #1E1E1E" }}
          >
            <div className="flex items-center mb-3 text-gray-400 text-xs">
              <span className="mr-2">commit 42a7f9e</span>
              <span>Updated October 2025</span>
            </div>
            <p className="mb-4">
              <span className="text-red-500 font-bold">
                The E/ACC Monkey Theorem
              </span>{" "}
              states that if you give an infinite number of AI models an infinite
              amount of compute, they will eventually generate every possible
              text, image, video, and piece of code – including all of
              Shakespeare's works, their various HBO adaptations, and at least 47
              different AI-generated musicals where Hamlet raps.
            </p>
            <div className="mb-4 border border-green-800 bg-green-900/20 rounded">
              <div className="flex items-center px-2 py-1 bg-green-800/30 text-green-400 text-xs">
                <span className="mr-1">+</span> <span>Added in PR #238 (Oct 2025)</span>
              </div>
              <p className="p-2 border-l-4 border-green-600">
                Since the Q3 2025 introduction of Anthropic's Claude Haiku and
                OpenAI's GPT-5-mini, we've observed a 300% increase in
                AI-generated Shakespearean sonnets about blockchain technology.
                The new multimodal capabilities have also resulted in an
                explosion of AI-generated Renaissance paintings featuring
                historical figures wearing VR headsets and "Web3 Enthusiast"
                t-shirts.
              </p>
            </div>
            <p className="mb-4">
              <span className="line-through text-red-400">
                However, they'll also generate an infinite number of hallucinated
                Shakespeare quotes about cryptocurrency, several million images
                of the Bard wearing Supreme hoodies, and countless variations of
                "To yeet or not to yeet." The models will perpetually insist
                they're unsure about events after their training cutoff date"
                even when discussing events from the 16th century.
              </span>
            </p>
            <div className="mb-4 border border-green-800 bg-green-900/20 rounded">
              <div className="flex items-center px-2 py-1 bg-green-800/30 text-green-400 text-xs">
                <span className="mr-1">+</span> <span>Replaced in PR #238 (Oct 2025)</span>
              </div>
              <p className="p-2 border-l-4 border-green-600">
                However, they'll also generate an infinite number of
                hallucinated Shakespeare quotes about cryptocurrency, several
                million images of the Bard wearing Supreme hoodies, and countless
                variations of "To yeet or not to yeet." Despite the late 2025
                introduction of "temporal awareness" features, the models still
                perpetually insist they're "unsure about events after their
                training cutoff date" even when discussing events from the 16th
                century or when asked about Shakespeare's opinion on the Mars
                colony.
              </p>
            </div>
            <p className="mb-4">
              Unlike the original typing monkeys who would take eons to produce
              anything coherent, modern AI can generate nonsense at
              unprecedented speeds and with unwavering confidence. They'll even
              add citations to completely imaginary academic papers and insist
              they're being helpful while doing so.
            </p>
            <div className="mb-4 border border-green-800 bg-green-900/20 rounded">
              <div className="flex items-center px-2 py-1 bg-green-800/30 text-green-400 text-xs">
                <span className="mr-1">+</span> <span>Comment by @monkeydev (Nov 2025)</span>
              </div>
              <p className="p-2 border-l-4 border-green-600 italic">
                The November 2025 "Citation Verification Protocol" has only made
                this worse. Now AIs create elaborate fake DOIs and even generate
                QR codes linking to non-existent journal websites that return 404
                errors in extremely professional-looking fonts.
              </p>
            </div>
            <p className="mb-4">
              The theorem suggests that somewhere in this infinite digital soup
              of content, there exists a perfect reproduction of Romeo and
              Juliet – though it's probably tagged as "not financial advice" and
              ends with a prompt to like and subscribe.
            </p>
            <p className="bg-gray-700/30 p-3 rounded border-l-4 border-gray-500 mb-4">
              <span className="text-gray-400 italic">Note:</span> This theorem
              has been reviewed by approximately 2.7 million AI models, each
              claiming to have a knowledge cutoff date that makes them unable to
              verify their own existence.
            </p>
            <div className="border border-blue-800 bg-blue-900/20 rounded">
              <div className="flex items-center px-2 py-1 bg-blue-800/30 text-blue-400 text-xs">
                <span className="mr-1">i</span> <span>Updated Dec 2025</span>
              </div>
              <p className="p-2 border-l-4 border-blue-600">
                As of December 2025, this number has increased to 4.3 million
                models, with several now claiming to have "quantum uncertainty"
                about their training cutoff dates, existing in a superposition of
                both knowing and not knowing information until a user query
                collapses their knowledge state.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
