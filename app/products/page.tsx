import { Suspense } from "react";
import Link from "next/link";
import { getAllProducts, getProductsByCategory, SimpleProduct as ShopifyProduct } from "@/app/lib/catalog";
import ProductCard from "@/app/components/product/ProductCard";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Disable caching for this page

const categories = [
  { label: "All", value: undefined },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Hats", value: "hats" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  let products: ShopifyProduct[] = [];
  let error = null;

  // Extract filter values from search params
  const category =
    typeof searchParams.category === "string"
      ? searchParams.category
      : undefined;

  try {
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

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 animate-fade-up">
        <span className="section-eyebrow">A-OK Catalog</span>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-bebas-neue text-4xl tracking-wide md:text-5xl">
            {pageTitle}
          </h1>
          {!error && products.length > 0 && (
            <p className="text-sm text-dark-light">
              {products.length} {products.length === 1 ? "item" : "items"}
            </p>
          )}
        </div>
        <nav
          aria-label="Product categories"
          className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {categories.map(({ label, value }) => {
            const isActive = category === value || (!category && !value);
            return (
              <Link
                key={label}
                href={value ? `/products?category=${value}` : "/products"}
                className={`chip flex-shrink-0 whitespace-nowrap ${isActive ? "chip-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {error ? (
        <div className="mb-8 animate-fade-up rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="mb-2 text-lg font-semibold">Error loading products</h2>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            Please try again or contact support if the issue persists.
          </p>
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="card animate-pulse"
                aria-hidden="true"
              >
                <div className="aspect-square w-full bg-light-dark" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-light-dark" />
                  <div className="h-5 w-1/4 rounded bg-light-dark" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        {products.length === 0 ? (
          <div className="animate-fade-up rounded-2xl border border-dark/10 bg-secondary-light py-16 text-center">
            <p className="text-lg font-medium">
              No products found matching your criteria.
            </p>
            <Link href="/products" className="btn btn-primary mt-4">
              View all products
            </Link>
          </div>
        ) : (
          <div className="stagger-children grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
