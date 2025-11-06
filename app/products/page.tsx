import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAllProducts, getProductsByCategory, SimpleProduct as ShopifyProduct } from "@/app/lib/catalog";
import ProductCard from "@/app/components/product/ProductCard";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Disable caching for this page

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

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">{pageTitle}</h1>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold mb-2">Error loading products</h2>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            Please try again or contact support if the issue persists.
          </p>
        </div>
      ) : null}

      <Suspense fallback={<p>Loading products...</p>}>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg">
              No products found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
