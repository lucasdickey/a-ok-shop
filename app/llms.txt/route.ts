import { buildLlmsTxt, MARKDOWN_HEADERS } from "@/app/lib/agent-docs";

// /llms.txt: a plain-text map of the shop for AI agents (https://llmstxt.org).
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), { headers: MARKDOWN_HEADERS });
}
