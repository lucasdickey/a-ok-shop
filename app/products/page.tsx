import { Suspense } from "react";
import Link from "next/link";
import { getAllProducts, getProductsByCategory, type SimpleProduct } from "@/app/lib/catalog";
import ProductCard from "@/app/components/product/ProductCard";

const CATEGORY_LINKS = [
  { label: "All pieces", category: "" },
  { label: "Tees", category: "t-shirts" },
  { label: "Hoodies", category: "hoodies" },
  { label: "Hats", category: "hats" },
];

export const dynamic = "force-dynamic";
export const revalidate = 0; // Disable caching for this page

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  let products: SimpleProduct[] = [];
  let error = null;

  // Extract filter values from search params
  const category =
    typeof searchParams.category === "string"
      ? searchParams.category
      : undefined;

  try {
    console.log("Fetching products in page component...");
    
    // Use category-specific API if category is provided
    if (category) {
      products = await getProductsByCategory(category);
    } else {
      products = await getAllProducts();
    }
  } catch (err) {
    console.error("Error in products page:", err);
    error = err instanceof Error ? err.message : "Unknown error occurred";
  }

  // Set page title based on category
  let pageTitle = "Shop All Products";
  if (category) {
    pageTitle = `Shop ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  }

  const activeCategory = category?.toLowerCase() ?? "";
  const lineItems = `${products.length} line ${products.length === 1 ? "item" : "items"}`;

  return (
    <section className="px-5 pb-12 pt-10 sm:px-8 lg:px-[4vw] lg:pt-16">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="micro mb-4">001 / The wearable part</p>
          <h1 className="display-heading text-[clamp(52px,5.8vw,88px)]">
            {pageTitle}
            <span className="text-primary">.</span>
          </h1>
        </div>
        <p className="text-sm md:text-[17px]">
          Printed on demand, XS–2XL.
          <br />
          Keep the receipt.
        </p>
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-3 border-y-2 border-dashed border-dark py-3.5 sm:flex-row sm:items-center">
        <nav aria-label="Filter products" className="flex flex-wrap gap-1.5 sm:gap-2">
          {CATEGORY_LINKS.map((link) => {
            const isCurrent = link.category === activeCategory;
            return (
              <Link
                key={link.label}
                href={link.category ? `/products?category=${link.category}` : "/products"}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center border border-dark px-3 text-xs no-underline sm:px-5 sm:text-[13px] ${
                  isCurrent ? "bg-dark text-club-paper shadow-[3px_3px_0_#C52224]" : "hover:bg-club-yellow"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <span className="micro" aria-live="polite">
          {lineItems}
        </span>
      </div>

      {error ? (
        <div role="alert" className="receipt-slip mb-10">
          <p className="micro border-b border-dashed border-dark pb-3 text-primary">Error loading products</p>
          <p className="mt-3">{error}</p>
          <p className="mt-2 text-sm">Please try again or contact support if the issue persists.</p>
        </div>
      ) : null}

      <Suspense fallback={<p className="micro">Loading products...</p>}>
        {products.length === 0 ? (
          <div className="border-2 border-dashed border-dark px-6 py-12 text-center">
            <p className="micro mb-2">0 line items</p>
            <p className="text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} priority={index < 3} />
            ))}
          </div>
        )}
      </Suspense>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-y-2 border-dashed border-dark py-6">
        <span className="micro">Subtotal: {lineItems}</span>
        <strong className="display-heading text-[27px] md:text-[34px]">Total personality: off the charts.</strong>
      </div>
    </section>
  );
}
