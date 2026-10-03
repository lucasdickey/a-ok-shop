import { buildProductMarkdown, MARKDOWN_HEADERS } from "@/app/lib/agent-docs";
import { getAllProducts } from "@/app/lib/catalog";

// A product page as markdown, for AI agents. Served at /products/<handle>.md (see next.config.js).
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ handle: product.handle }));
}

export function GET(_request: Request, { params }: { params: { handle: string } }) {
  const markdown = buildProductMarkdown(params.handle);
  if (!markdown) return new Response("Not found\n", { status: 404, headers: MARKDOWN_HEADERS });
  return new Response(markdown, { headers: MARKDOWN_HEADERS });
}
