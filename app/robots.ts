import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/site";

// Everyone, AI agents included, may read the shop. Order pages and test tools stay out of indexes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/checkout/", "/test-discount", "/ingest/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
