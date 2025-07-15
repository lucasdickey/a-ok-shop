import { Suspense } from "react";
import { toys, getToysByCategory, getAllCategories } from "@/src/data/toys.config";
import ToyCard from "@/app/components/toy/ToyCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VibePlusPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Extract filter values from search params
  const category =
    typeof searchParams.category === "string"
      ? searchParams.category
      : undefined;

  // Get filtered or all toys
  const displayToys = category ? getToysByCategory(category) : toys;
  const categories = getAllCategories();

  // Set page title based on category
  let pageTitle = "Vibe ++";
  if (category) {
    pageTitle = `Vibe ++ - ${category}`;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">{pageTitle}</h1>
        <p className="text-lg text-gray-600 mb-6">
          Essential gear for the ultimate vibe. These are the tools and products I personally use and recommend.
        </p>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <a
            href="/vibe-plus"
            className={`px-4 py-2 rounded-full border transition-colors ${
              !category 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
            }`}
          >
            All
          </a>
          {categories.map((cat) => (
            <a
              key={cat}
              href={`/vibe-plus?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-2 rounded-full border transition-colors ${
                category === cat 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
              }`}
            >
              {cat}
            </a>
          ))}
        </div>
      </div>

      <Suspense fallback={<p>Loading gear...</p>}>
        {displayToys.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg">
              No items found in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {displayToys.map((toy) => (
              <ToyCard key={toy.id} toy={toy} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}