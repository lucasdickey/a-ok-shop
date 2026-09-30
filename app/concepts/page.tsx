import type { Metadata } from "next";
import ConceptsGallery from "./ConceptsGallery";

export const metadata: Metadata = {
  title: "Concept Gallery — A-OK",
  description:
    "Storefront design explorations for A-OK, including Club Receipt: Hallucination Club meets Receipt Machine.",
};

export default function ConceptsPage() {
  return <ConceptsGallery />;
}
