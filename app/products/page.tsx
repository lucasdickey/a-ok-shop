import { Suspense } from "react";
import { getAllProducts, getProductsByCategory, type SimpleProduct } from "@/app/lib/catalog";
import ProductBrowser from "./ProductBrowser";
import { CATEGORY_FILTERS } from "./categories";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Disable caching for this page

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  let products: SimpleProduct[] = [];
  // Product ids in each category, worked out here with the catalog's own rules so the
  // browser can switch categories in place without asking the server again.
  const categoryIds: Record<string, string[]> = {};
  let error = null;

  const category =
    typeof searchParams.category === "string" ? searchParams.category.toLowerCase() : "";

  try {
    products = getAllProducts();
    const categories = new Set(CATEGORY_FILTERS.map((filter) => filter.category).filter(Boolean));
    // Also honor a category that has no chip, e.g. an older link.
    if (category) categories.add(category);
    for (const name of Array.from(categories)) {
      categoryIds[name] = getProductsByCategory(name).map((product) => product.id);
    }
  } catch (err) {
    console.error("Error in products page:", err);
    error = err instanceof Error ? err.message : "Unknown error occurred";
  }

  return (
    <>
      {error ? (
        <div role="alert" className="receipt-slip mx-5 mt-10 sm:mx-8 lg:mx-[4vw]">
          <p className="micro border-b border-dashed border-dark pb-3 text-primary">Error loading products</p>
          <p className="mt-3">{error}</p>
          <p className="mt-2 text-sm">Please try again or contact support if the issue persists.</p>
        </div>
      ) : null}
      {/* ProductBrowser reads the category from the address, which needs a Suspense boundary. */}
      <Suspense fallback={<p className="micro px-5 py-10 sm:px-8 lg:px-[4vw]">Loading products...</p>}>
        <ProductBrowser products={products} categoryIds={categoryIds} />
      </Suspense>
    </>
  );
}
