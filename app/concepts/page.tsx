import type { Metadata } from "next";
import ConceptsGallery from "./ConceptsGallery";

export const metadata: Metadata = {
  title: "Concept Gallery — A-OK Shop",
  description:
    "Fifteen homepage design concepts for the A-OK storefront across Cursor · Opus 4.8, Droid · Grok 4.6, and Codex · Sol 5.6.",
};

export default function ConceptsPage() {
  return <ConceptsGallery />;
}
