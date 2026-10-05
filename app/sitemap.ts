import type { MetadataRoute } from "next";
import { getAllProducts } from "@/app/lib/catalog";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";
import { SITE_URL } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const latestMonkey = getChaosMonkeys()[0]?.date;
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/products` },
    { url: `${SITE_URL}/chaos-monkeys`, lastModified: latestMonkey },
    { url: `${SITE_URL}/game` },
    { url: `${SITE_URL}/gallery` },
    { url: `${SITE_URL}/returns` },
    { url: `${SITE_URL}/terms` },
    { url: `${SITE_URL}/privacy` },
  ];
  const products = getAllProducts().map((product) => ({
    url: `${SITE_URL}/products/${product.handle}`,
    lastModified: product.updatedAt || product.createdAt,
  }));
  return [...pages, ...products];
}
