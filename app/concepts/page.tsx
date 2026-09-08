import type { Metadata } from "next";
import ConceptsGallery from "./ConceptsGallery";

export const metadata: Metadata = {
  title: "Concept Gallery — A-OK Shop",
  description:
    "Twenty storefront design concepts for the A-OK storefront across Cursor · Opus 4.8, Droid · Grok 4.6, Codex · Sol 5.6, and Codex · GPT-6.",
};

export default function ConceptsPage() {
  return <ConceptsGallery />;
}
