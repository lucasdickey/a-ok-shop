import { buildHomeMarkdown, MARKDOWN_HEADERS } from "@/app/lib/agent-docs";

// /index.md: the home page as markdown, for AI agents.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildHomeMarkdown(), { headers: MARKDOWN_HEADERS });
}
