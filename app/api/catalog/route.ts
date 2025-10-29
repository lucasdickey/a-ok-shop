import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getProductsByCategory } from "@/app/lib/catalog";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let products;

    if (category) {
      products = getProductsByCategory(category);
    } else {
      products = getAllProducts();
    }

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
