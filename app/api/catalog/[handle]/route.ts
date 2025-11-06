import { NextRequest, NextResponse } from "next/server";
import { getProductByHandle } from "@/app/lib/catalog";

export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const product = getProductByHandle(params.handle);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
