import Link from "next/link";
import Image from "next/image";
import ChaosMonkeyCard from "@/app/components/ChaosMonkeyCard";
import PrintRequestButton from "@/app/components/PrintRequestButton";
import Asterisk from "@/app/components/Asterisk";
import MonkeyTheorem from "@/app/components/MonkeyTheorem";
import ProductCard from "@/app/components/product/ProductCard";
import type { SimpleProduct } from "@/app/lib/catalog";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";

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

// The newest Chaos Monkeys fill a 3×2 grid; the rest live on /chaos-monkeys.
const RECENT_MONKEYS = 6;

/** Receipt-style section label and headline used down the homepage. */
function SectionHeading({
  label,
  children,
  aside,
}: {
  label: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="micro mb-4">{label}</p>
        <h2 className="display-heading text-[clamp(52px,5.8vw,88px)]">{children}</h2>
      </div>
      {aside}
    </div>
  );
}

// The product whose photo sits beside "Real human. Excellent taste."
const CLUB_PRODUCT_HANDLE = "same-vibes-but-more";

const TICKER = ["Confidence: high", "Accuracy: debatable", "Outfit: A–OK", "Keep the interesting mistakes"];

export default async function Home() {
  // Fetch featured products with error handling
  let productsToShow: SimpleProduct[] = [];
  try {
    productsToShow = await getFeaturedProductsData();
    console.log(`Fetched ${productsToShow.length} featured products successfully`);
  } catch (error) {
    console.error("Error fetching featured products:", error);
  }

  const allMonkeys = getChaosMonkeys();
  const recentMonkeys = allMonkeys.slice(0, RECENT_MONKEYS);

  // The hero ticket comes from the first featured product. The club photo stays on the
  // real-person hoodie shot ("Real human."), whatever is featured.
  const heroProduct = productsToShow[0];
  const { getProductByHandle } = await import("@/app/lib/catalog");
  const clubProduct = getProductByHandle(CLUB_PRODUCT_HANDLE) ?? productsToShow[productsToShow.length - 1];
  const imageOf = (product?: SimpleProduct) => product?.images.edges[0]?.node;
  const heroImage = imageOf(heroProduct);
  const clubImage = imageOf(clubProduct);

  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 bg-club-yellow lg:grid-cols-[0.82fr_1fr]">
        <div className="px-5 pb-2 pt-8 sm:px-8 lg:pb-8 lg:pl-[4vw] lg:pr-[2vw] lg:pt-12">
          <p className="micro flex items-center gap-2 text-[10px] sm:text-[11px]">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            The hallucination club / open to all
          </p>
          <h1 className="display-heading my-6 text-[clamp(76px,19vw,125px)] lg:text-[clamp(74px,8.4vw,126px)]">
            Good
            <br />
            taste.
            <br />
            <span className="text-primary">
              Bad
              <br />
              models.
            </span>
          </h1>
          <p className="mb-7 text-[17px] leading-normal lg:text-[clamp(16px,1.5vw,22px)]">
            For the confidently incorrect.
            <br />
            The creatively misaligned.
            <br />
            The extremely well-dressed.
          </p>
          <Link href="/products" className="btn btn-primary min-h-[52px] justify-between gap-6 px-5">
            {/* On the narrowest phones this breaks between the two sentences, never inside one. */}
            <span>
              <span className="whitespace-nowrap">Shop the collection.</span>{" "}
              <span className="whitespace-nowrap">Join the club.</span>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
          <div className="micro mt-8 flex flex-wrap gap-x-[0.6em] text-[10px]">
            <span>No login. No secret handshake.</span>
            <span className="hidden sm:inline">Just good clothes.</span>
          </div>
        </div>

        <div className="star-trigger relative flex min-h-[575px] min-w-0 items-center justify-center overflow-hidden px-7 pb-[142px] pt-12 lg:px-12 lg:pb-[155px] lg:pt-16">
          <div
            className="absolute h-[60%] w-[90%] -rotate-[35deg] rounded-[50%] border border-dark"
            aria-hidden="true"
          />
          <span className="absolute left-4 top-6 z-[1] text-[66px] text-primary lg:top-16 lg:text-[84px]" aria-hidden="true">
            <span className="star-spin">
              <Asterisk />
            </span>
          </span>
          {heroImage && (
            <div className="relative w-full max-w-[510px] -rotate-[4deg] rounded-t-[260px] border-2 border-dark bg-club-paper px-4 pt-4 shadow-[8px_8px_0_#22221E] lg:px-5 lg:pt-5 lg:shadow-hard-lg">
              <div className="relative h-[350px] overflow-hidden rounded-t-[240px] lg:h-[470px]">
                <Image
                  src={heroImage.url}
                  alt={heroImage.altText || heroProduct.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 510px"
                  className="object-cover"
                  unoptimized={!heroImage.url.startsWith("http")}
                />
              </div>
            </div>
          )}
          <div className="absolute right-2.5 top-7 flex h-[123px] w-[123px] rotate-12 flex-col items-center justify-center rounded-full border-2 border-dark bg-primary text-center font-display text-[22px] font-bold leading-none text-club-paper shadow-[5px_5px_0_#22221E] lg:right-5 lg:top-16 lg:h-[164px] lg:w-[164px] lg:text-[27px]">
            APES
            <br />
            ON KEYS
            <span className="mt-3 font-mono text-[8px] font-normal">EVERYONE’S A MEMBER.</span>
          </div>
          {heroProduct && (
            <Link
              href={`/products/${heroProduct.handle}`}
              className="absolute bottom-8 left-[8%] w-[84%] max-w-[430px] rotate-3 border-2 border-dark bg-club-paper p-4 no-underline shadow-[8px_8px_0_#22221E] sm:left-[12%] sm:w-[78%] lg:bottom-12 lg:left-[16%] lg:w-[76%] lg:p-5"
            >
              <span className="micro flex justify-between gap-3 border-b border-dashed border-dark pb-2.5 text-[10px]">
                Your next good decision{" "}
                <span className="whitespace-nowrap">01 / {String(productsToShow.length).padStart(2, "0")}</span>
              </span>
              <span className="flex items-center justify-between gap-4 py-3.5">
                <strong className="display-heading text-[26px] sm:text-[30px] lg:text-[36px]">{heroProduct.title}</strong>
                <b className="shrink-0 text-[26px] lg:text-[32px]">
                  ${parseFloat(heroProduct.priceRange.minVariantPrice.amount).toFixed(0)}
                </b>
              </span>
              <span className="flex justify-between border-t border-dashed border-dark pt-2.5">
                <span className="micro text-[10px]">Choose your options</span>
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Ticker */}
      <div
        className="flex flex-wrap items-center justify-around gap-x-4 gap-y-2 border-y-2 border-dark bg-primary px-4 py-3.5 font-mono text-[10px] uppercase tracking-[0.06em] sm:text-[11px] text-club-paper"
        aria-label="Brand statement"
      >
        {TICKER.map((line, index) => (
          <span
            key={line}
            className={`flex items-center gap-4 whitespace-nowrap ${index === TICKER.length - 1 ? "hidden sm:flex" : ""}`}
          >
            {/* Below desktop the lines wrap onto more rows, so every line gets its own star and no
                row starts with a leftover one. On desktop they fit one row, so the first star goes.
                Each star spins only when it's the one under the pointer. */}
            <b className={`star-spin text-[17px] sm:text-2xl ${index === 0 ? "lg:hidden" : ""}`} aria-hidden="true">
              <Asterisk />
            </b>
            {line}
          </span>
        ))}
      </div>

      {/* Featured products */}
      <section id="shop" className="px-5 pt-10 sm:px-8 lg:px-[4vw] lg:pt-16">
        <SectionHeading
          label="001 / The wearable part"
        >
          Popular
          <br />
          line items<span className="text-primary"><span className="period-pulse">.</span></span>
        </SectionHeading>
        {/* These leave the homepage for the shop, so they read as arrow links, not filter toggles. */}
        <div className="mb-8 flex flex-col items-start justify-between gap-2 border-y-2 border-dashed border-dark py-3 sm:flex-row sm:items-center sm:gap-4">
          <nav aria-label="Browse the full shop" className="flex flex-wrap items-center gap-x-5 gap-y-0">
            <span className="micro w-full sm:w-auto">Browse the full shop:</span>
            {[
              { href: "/products", label: "All pieces" },
              { href: "/products?category=t-shirts", label: "Tees" },
              { href: "/products?category=hoodies", label: "Hoodies" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold no-underline hover:text-primary"
              >
                {link.label}
                {/* The arrow's space is always kept, so showing it on hover shifts nothing.
                    Touch screens (no hover) don't get the arrow at all. */}
                <span
                  aria-hidden="true"
                  className="hidden w-[1em] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:inline-block"
                >
                  ↗
                </span>
              </Link>
            ))}
          </nav>
          <span className="micro">
            {productsToShow.length} featured line {productsToShow.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14">
          {productsToShow.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-y-2 border-dashed border-dark py-6">
          <span className="micro">Total personality</span>
          <strong className="display-heading text-[27px] md:text-[34px]">Off the charts.</strong>
          <Link href="/products" className="inline-flex min-h-[44px] w-full items-center text-[13px] font-semibold md:w-auto">
            See the full collection ↗
          </Link>
        </div>
      </section>

      {/* The club */}
      <section id="club" className="mt-10 grid grid-cols-1 border-y-2 border-dark lg:mt-16 lg:grid-cols-2">
        <div className="relative flex flex-col justify-center border-b-2 border-dashed border-dark bg-club-gold px-9 pb-16 pt-7 lg:border-b-0 lg:border-r-2 lg:border-solid lg:px-14 lg:pb-20 lg:pt-10">
          <p className="micro mb-4 text-[10px] lg:text-[11px]">Field test / outside the simulation</p>
          {clubImage && (
            <Link
              href={`/products/${clubProduct.handle}`}
              className="relative block aspect-[4/5] -rotate-3 border-2 border-dark bg-club-paper shadow-hard-lg"
            >
              <Image
                src={clubImage.url}
                alt={clubImage.altText || clubProduct.title}
                fill
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="object-cover"
                unoptimized={!clubImage.url.startsWith("http")}
              />
            </Link>
          )}
          <div className="barcode absolute bottom-4 right-16 h-10 w-[120px] lg:bottom-[72px] lg:right-5 lg:h-[65px] lg:w-[210px]" aria-hidden="true" />
          <span className="micro mt-7 text-[10px]">Real human. Excellent taste.</span>
          <span className="absolute bottom-4 right-6 text-5xl" aria-hidden="true">
            +
          </span>
        </div>
        <div className="px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-14">
          <p className="micro">002 / Proof of belonging</p>
          <h2 className="display-heading my-6 text-[clamp(50px,12vw,76px)] lg:text-[clamp(54px,5.7vw,82px)]">
            We’re all
            <br />a little
            <br />
            <span className="text-primary">misaligned<span className="period-pulse">.</span></span>
          </h2>
          <p className="mb-4 max-w-[440px]">
            Somewhere between a happy accident and a very bad idea, you found your people.
          </p>
          <p className="mb-4 max-w-[440px]">
            Apes On Keys makes clothes for humans who make things with machines. Bring your strange ideas. Keep the
            interesting mistakes.
          </p>
          <div className="receipt-slip my-8">
            <p className="micro border-b border-dashed border-dark pb-4 text-center">A–OK / Membership receipt</p>
            <div className="receipt-line">
              <span>Curiosity</span>
              <span>UNLIMITED</span>
            </div>
            <div className="receipt-line">
              <span>Perfect answers</span>
              <span>NOT INCLUDED</span>
            </div>
            <div className="receipt-line">
              <span>Dress code</span>
              <span>BE YOURSELF</span>
            </div>
            <div className="mt-4 flex justify-between border-t-2 border-dashed border-dark pt-4 text-[15px] font-bold">
              <span>YOU BELONG HERE.</span>
              <span aria-hidden="true">✓</span>
            </div>
          </div>
          {clubProduct && (
            <Link href={`/products/${clubProduct.handle}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold">
              Get this one. Go outside. ↗
            </Link>
          )}
        </div>
      </section>

      {/* Chaos Monkeys */}
      <section id="chaos-monkeys" className="bg-primary px-5 py-10 text-club-paper sm:px-8 lg:px-[4vw] lg:py-16">
        <SectionHeading
          label="003 / Unexpected outputs"
          aside={
            <Link href="/chaos-monkeys" className="btn btn-outline min-h-[52px] gap-6">
              Every Chaos Monkey <span aria-hidden="true">↗</span>
            </Link>
          }
        >
          Chaos monkeys
          <br />
          at work.
        </SectionHeading>

        {recentMonkeys.length > 0 && (
          <>
            <p className="micro mb-6 flex justify-between gap-4">
              <span>The latest {recentMonkeys.length}</span>
              <span className="sm:hidden" aria-hidden="true">
                Swipe →
              </span>
            </p>
            {/* Phones swipe through them sideways; wider screens get a grid (3×2 on desktop). */}
            <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {recentMonkeys.map((monkey, index) => (
                <div
                  key={monkey.id}
                  className={`group w-[80%] shrink-0 snap-center border-2 border-dark sm:w-auto bg-club-paper p-3 pb-4 text-dark shadow-hard-lg transition-transform motion-reduce:transition-none ${
                    index % 2 === 0 ? "sm:-rotate-2" : "sm:rotate-2"
                  } hover:rotate-0`}
                >
                  {/* The button sits outside the link, so pressing it doesn't open the archive. */}
                  <Link href={`/chaos-monkeys#n${monkey.id}`} className="block text-dark no-underline">
                    <ChaosMonkeyCard monkey={monkey} />
                  </Link>
                  <PrintRequestButton id={monkey.id} title={monkey.title} />
                </div>
              ))}
            </div>
            {allMonkeys.length > recentMonkeys.length && (
              <Link
                href="/chaos-monkeys"
                className="micro mt-8 flex min-h-[44px] items-center justify-between border-y-2 border-dashed border-club-paper py-3 text-club-paper no-underline hover:underline"
              >
                <span>
                  + {allMonkeys.length - recentMonkeys.length} more in the archive
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            )}
          </>
        )}
      </section>

      {/* The fine print */}
      <section className="px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-16">
        <SectionHeading label="004 / The fine print">
          Who are
          <br />
          apes on keys?
        </SectionHeading>
        <MonkeyTheorem />
      </section>

      {/* Bonus item: the game */}
      <section className="flex flex-wrap items-center gap-6 border-t-2 border-dark bg-club-blue px-5 py-9 text-club-paper sm:px-8 lg:flex-nowrap lg:gap-9 lg:px-[4vw] lg:py-11">
        <div className="w-[75px] shrink-0 -rotate-6 border-2 border-dark shadow-hard lg:w-[130px]">
          <Image src="/images/a-ok-8bit-retro.png" alt="Pixel-art A-OK ape" width={160} height={160} />
        </div>
        {/* The heading's lines never break, so when they don't fit beside the picture,
            the whole text block moves below it instead. */}
        <div className="flex-1">
          <p className="micro text-[10px] lg:text-[11px]">Bonus item / a little detour</p>
          <h2 className="display-heading my-2.5 whitespace-nowrap text-[32px] lg:text-[44px]">
            Touch grass.
            <br />
            Or dodge agents.
          </h2>
          <p className="text-[13px]">Run, Human, Run! Win the game, get 25% off. The machines can wait.</p>
        </div>
        <Link href="/game" className="btn btn-secondary min-h-[52px] w-full justify-between gap-6 lg:ml-auto lg:w-auto">
          Play the game <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
