import { buildChaosMonkeysMarkdown, MARKDOWN_HEADERS } from "@/app/lib/agent-docs";

// /chaos-monkeys.md: the Chaos Monkeys page as markdown, for AI agents.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildChaosMonkeysMarkdown(), { headers: MARKDOWN_HEADERS });
}
