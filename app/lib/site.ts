/** The shop's public address, for links that must be absolute: agent docs, the sitemap, feeds. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://a-ok.ai").replace(/\/+$/, "");

/** Turns a site path such as /images/x.webp into a full address; full addresses pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("//")) return `https:${path}`;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
