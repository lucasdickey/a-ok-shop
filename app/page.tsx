import Link from "next/link";
import Image from "next/image";
import ImageGrid from "@/app/components/ImageGrid";
import ProductCard from "@/app/components/product/ProductCard";
import fs from "fs";
import path from "path";

// Function to get gallery images either from JSON file or API
async function getGalleryImages() {
  // During build time or in production, use the pre-generated JSON file
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
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

  // In development, fetch from API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    console.log(`Fetching gallery images from: ${baseUrl}/api/local-gallery`);

    const galleryResponse = await fetch(`${baseUrl}/api/local-gallery`, {
      next: { revalidate: 3600 },
    });

    if (galleryResponse.ok) {
      const galleryData = await galleryResponse.json();
      if (galleryData?.images && Array.isArray(galleryData.images)) {
        const validImages = galleryData.images.filter((img: any) => {
          if (typeof img === "string") return true;
          return img && img.url && typeof img.url === "string";
        });

        console.log("Gallery images by source:");
        const localImgs = validImages.filter(
          (img: any) => img.source === "local"
        );
        console.log(`- Local images: ${localImgs.length}`);

        return validImages;
      }
    }
    console.error(`Failed to fetch gallery images: ${galleryResponse.status}`);
    return [];
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

// Dynamically import the catalog functionality
const getFeaturedProductsData = async () => {
  try {
    const { getFeaturedProducts } = await import("@/app/lib/catalog");
    return await getFeaturedProducts();
  } catch (error) {
    console.error("Error importing or calling getFeaturedProducts:", error);
    return [];
  }
};

export default async function Home() {
  // Fetch featured products with error handling
  let productsToShow: Array<any> = [];
  try {
    productsToShow = await getFeaturedProductsData();
  } catch (error) {
    console.error("Error fetching featured products:", error);
  }

  // Get gallery images using the new function
  const galleryImages = await getGalleryImages();

  return (
    <div className="container mx-auto py-8 px-8 md:px-16 lg:px-24 xl:px-32">
      {/* Hero Section */}
      <section className="mb-16">
        <div className="relative h-[500px] w-full overflow-hidden rounded-3xl shadow-card-hover md:h-[560px]">
          <Image
            src="/images/hero-v1a.png"
            alt="A-OK Store"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/30 to-dark/10" />
          <div className="absolute inset-0 flex items-end justify-center pb-12 md:justify-start md:pb-16">
            <div className="animate-fade-up px-6 text-center md:pl-14 md:text-left">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-bone/80">
                Apes On Keys
              </p>
              <h1 className="font-bebas-neue text-6xl leading-none text-bone md:text-8xl">
                A - O K
              </h1>
              <p className="mt-3 max-w-md font-space-grotesk text-lg text-bone/90 md:text-xl">
                AI nerdwear for the terminally online.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <Link href="/products" className="btn btn-primary px-8 py-3 text-base">
                  Shop Now
                </Link>
                <Link
                  href="/game"
                  className="btn border-2 border-bone/80 bg-transparent px-8 py-3 text-base text-bone hover:bg-bone hover:text-charcoal-dark hover:-translate-y-0.5"
                >
                  Play the Game
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="mb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="section-eyebrow">Fresh off the keys</span>
            <h2 className="font-bebas-neue text-4xl tracking-wide md:text-5xl">
              Featured Products
            </h2>
          </div>
          <Link
            href="/products"
            className="group hidden items-center gap-1 text-sm font-semibold text-maroon transition-colors hover:text-maroon-dark sm:inline-flex"
          >
            View all
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="stagger-children grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productsToShow.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-10 text-center sm:hidden">
          <Link href="/products" className="btn btn-outline">
            View All Products
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="mb-20">
        <div className="mb-8 text-center">
          <span className="section-eyebrow">The lore</span>
          <h2 className="font-bebas-neue text-4xl tracking-wide md:text-5xl">
            Who are Apes On Keys?
          </h2>
        </div>
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-700 bg-[#1E1E1E] shadow-card-hover">
          <div className="flex items-center border-b border-gray-700 bg-[#333333] px-4 py-2">
            <div className="flex space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-4 font-mono text-sm text-gray-300">
              monkey_theorem.md
            </div>
          </div>
          <div
            className="h-[400px] overflow-y-auto p-6 font-mono text-sm leading-relaxed text-gray-300"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#555 #1E1E1E" }}
          >
            <div className="mb-3 flex items-center text-xs text-gray-400">
              <span className="mr-2">commit 42a7f9e</span>
              <span>Updated October 2025</span>
            </div>
            <p className="mb-4">
              <span className="font-bold text-red-500">
                The E/ACC Monkey Theorem
              </span>{" "}
              states that if you give an infinite number of AI models an
              infinite amount of compute, they will eventually generate every
              possible text, image, video, and piece of code – including all of
              Shakespeare&apos;s works, their various HBO adaptations, and at
              least 47 different AI-generated musicals where Hamlet raps.
            </p>
            <div className="mb-4 rounded border border-green-800 bg-green-900/20">
              <div className="flex items-center bg-green-800/30 px-2 py-1 text-xs text-green-400">
                <span className="mr-1">+</span>{" "}
                <span>Added in PR #238 (Oct 2025)</span>
              </div>
              <p className="border-l-4 border-green-600 p-2">
                Since the Q3 2025 introduction of Anthropic&apos;s Claude Haiku
                and OpenAI&apos;s GPT-5-mini, we&apos;ve observed a 300%
                increase in AI-generated Shakespearean sonnets about blockchain
                technology. The new multimodal capabilities have also resulted
                in an explosion of AI-generated Renaissance paintings featuring
                historical figures wearing VR headsets and &quot;Web3
                Enthusiast&quot; t-shirts.
              </p>
            </div>
            <p className="mb-4">
              <span className="line-through text-red-400">
                However, they&apos;ll also generate an infinite number of
                hallucinated Shakespeare quotes about cryptocurrency, several
                million images of the Bard wearing Supreme hoodies, and
                countless variations of &quot;To yeet or not to yeet.&quot; The
                models will perpetually insist they&apos;re unsure about events
                after their training cutoff date&quot; even when discussing
                events from the 16th century.
              </span>
            </p>
            <div className="mb-4 rounded border border-green-800 bg-green-900/20">
              <div className="flex items-center bg-green-800/30 px-2 py-1 text-xs text-green-400">
                <span className="mr-1">+</span>{" "}
                <span>Replaced in PR #238 (Oct 2025)</span>
              </div>
              <p className="border-l-4 border-green-600 p-2">
                However, they&apos;ll also generate an infinite number of
                hallucinated Shakespeare quotes about cryptocurrency, several
                million images of the Bard wearing Supreme hoodies, and
                countless variations of &quot;To yeet or not to yeet.&quot;
                Despite the late 2025 introduction of &quot;temporal
                awareness&quot; features, the models still perpetually insist
                they&apos;re &quot;unsure about events after their training
                cutoff date&quot; even when discussing events from the 16th
                century or when asked about Shakespeare&apos;s opinion on the
                Mars colony.
              </p>
            </div>
            <p className="mb-4">
              Unlike the original typing monkeys who would take eons to produce
              anything coherent, modern AI can generate nonsense at
              unprecedented speeds and with unwavering confidence. They&apos;ll
              even add citations to completely imaginary academic papers and
              insist they&apos;re being helpful while doing so.
            </p>
            <div className="mb-4 rounded border border-green-800 bg-green-900/20">
              <div className="flex items-center bg-green-800/30 px-2 py-1 text-xs text-green-400">
                <span className="mr-1">+</span>{" "}
                <span>Comment by @monkeydev (Nov 2025)</span>
              </div>
              <p className="border-l-4 border-green-600 p-2 italic">
                The November 2025 &quot;Citation Verification Protocol&quot; has
                only made this worse. Now AIs create elaborate fake DOIs and
                even generate QR codes linking to non-existent journal websites
                that return 404 errors in extremely professional-looking fonts.
              </p>
            </div>
            <p className="mb-4">
              The theorem suggests that somewhere in this infinite digital soup
              of content, there exists a perfect reproduction of Romeo and
              Juliet – though it&apos;s probably tagged as &quot;not financial
              advice&quot; and ends with a prompt to like and subscribe.
            </p>
            <p className="mb-4 rounded border-l-4 border-gray-500 bg-gray-700/30 p-3">
              <span className="italic text-gray-400">Note:</span> This theorem
              has been reviewed by approximately 2.7 million AI models, each
              claiming to have a knowledge cutoff date that makes them unable to
              verify their own existence.
            </p>
            <div className="rounded border border-blue-800 bg-blue-900/20">
              <div className="flex items-center bg-blue-800/30 px-2 py-1 text-xs text-blue-400">
                <span className="mr-1">i</span> <span>Updated Dec 2025</span>
              </div>
              <p className="border-l-4 border-blue-600 p-2">
                As of December 2025, this number has increased to 4.3 million
                models, with several now claiming to have &quot;quantum
                uncertainty&quot; about their training cutoff dates, existing in
                a superposition of both knowing and not knowing information
                until a user query collapses their knowledge state.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chaos Monkeys Image Grid - only render if we have images */}
      <section className="mb-16">
        <div className="mb-8 flex w-full justify-center">
          <Link href="/gallery" className="group no-underline hover:no-underline">
            <div className="text-center">
              <span className="section-eyebrow">The gallery</span>
              <h2 className="relative inline-flex items-center justify-center font-bebas-neue text-4xl tracking-wide md:text-5xl">
                <span className="relative z-10 transition-colors duration-300 group-hover:text-maroon">
                  CHAOS MONKEYS AT WORK
                </span>
                <span className="ml-2 inline-block -translate-x-1 text-maroon opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  →
                </span>
              </h2>
            </div>
          </Link>
        </div>
        {galleryImages && galleryImages.length > 0 ? (
          <ImageGrid images={galleryImages} title="CHAOS MONKEYS AT WORK" />
        ) : (
          <div className="rounded-2xl border border-dark/10 bg-secondary-light p-8 text-center">
            <p className="text-dark-light">
              Image gallery is currently loading or unavailable.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
