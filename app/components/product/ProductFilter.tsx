'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type ProductFilterProps = {
  productTypes: string[];
};

export default function ProductFilter({ productTypes }: ProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial filter values from URL
  const initialCategory = searchParams.get('category')?.toLowerCase() || '';
  
  // State for filter values
  const [category, setCategory] = useState(initialCategory);
  
  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (category) {
      params.set('category', category.toLowerCase());
    }
    
    router.push(`/products?${params.toString()}`);
  };
  
  // Reset filters
  const resetFilters = () => {
    setCategory('');
    router.push('/products');
  };
  
  return (
    <div className="space-y-6 rounded-lg border border-secondary bg-light p-4">
      <h2 className="text-lg font-medium">Filters</h2>
      
      {/* Category Filter */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Category</h3>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-secondary bg-light px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      {/* Filter Actions */}
      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-light hover:bg-primary-dark"
        >
          Apply Filters
        </button>
        <button
          onClick={resetFilters}
          className="rounded-md border border-secondary px-3 py-2 text-sm font-medium hover:bg-secondary-light"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
