import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/app/lib/catalog";
import { getCorsHeaders } from "@/app/lib/cors";

export async function GET(request: NextRequest) {
  const products = getAllProducts();
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const agentProducts = products.map((product) => {
    const firstVariant = product.variants.edges[0]?.node;
    const amount = firstVariant ? parseFloat(firstVariant.price.amount) : 0;
    const currency = firstVariant?.price.currencyCode || "USD";

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: `${amount.toFixed(2)} ${currency}`,
      buyUrl: `/api/mpp/purchase`, // Base endpoint for buying via MPP
      variants: product.variants.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: parseFloat(edge.node.price.amount),
        currency: edge.node.price.currencyCode,
        sku: edge.node.sku,
        available: edge.node.availableForSale,
      })),
      capabilities: {
        paymentProtocols: ["stripe-mpp", "x402"],
        methods: ["crypto", "spt"],
      },
    };
  });

  return NextResponse.json(
    {
      version: "1.0.0",
      shop: "A-OK Shop",
      description: "Agentic commerce feed for machine-to-machine shopping.",
      products: agentProducts,
      endpoints: {
        catalog: "/api/mpp/products",
        buy: "/api/mpp/purchase",
      },
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
