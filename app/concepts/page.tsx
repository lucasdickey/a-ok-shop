import type { Metadata } from "next";
import ConceptsGallery from "./ConceptsGallery";

export const metadata: Metadata = {
  title: "Concept Gallery — A-OK Shop",
  description:
    "Side-by-side homepage design concepts for the A-OK storefront, labeled by harness and model origin (Cursor · Opus 4.8 vs Droid · Grok 4.6).",
};

export default function ConceptsPage() {
  return <ConceptsGallery />;
}
