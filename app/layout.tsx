import type { Metadata } from "next";
import { Space_Grotesk, Barlow_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteChrome from "./components/layout/SiteChrome";
import CartProvider from "./components/cart/CartProvider";
import CartDrawer from "./components/cart/CartDrawer";
import GameModal from "./components/game/GameModal";
import WebMcpTools from "./components/WebMcpTools";
import { SITE_URL } from "./lib/site";
import PostHogInit from "./components/analytics/PostHogInit";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
});
// Headline face for the Club Receipt design.
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: '--font-display',
  weight: ['700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ꓘO-∀ - A-OK Merch",
  description: "Apes On Keys - Nerd Streetwear (for real)",
  icons: {
    icon: [{ url: "/images/a-ok-o-face.png" }],
    apple: [{ url: "/images/a-ok-o-face.png" }],
  },
  openGraph: {
    title: "ꓘO-∀ - A-OK Merch",
    description: "Apes On Keys - Nerd Streetwear (for real)",
    url: `${SITE_URL}/`,
    siteName: "a-ok.ai",
    images: [
      {
        url: "/images/og-club-receipt.png",
        width: 1200,
        height: 630,
        alt: "Good taste. Keep the receipt. The Hallucination Club v1.0 tee in navy with an A-OK receipt ticket, $30.",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ꓘO-∀ - A-OK Merch",
    description: "Apes On Keys - Nerd Streetwear (for real)",
    images: ["/images/og-club-receipt.png"],
  },
};

// Chrome and Edge run WebMCP for visitors only on sites in their Origin Trials. Set this to the
// trial token(s), comma-separated, to turn it on (see .env.example).
const WEBMCP_TRIAL_TOKENS = (process.env.NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL_TOKENS ?? "")
  .split(",")
  .map((token) => token.trim())
  .filter(Boolean);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {WEBMCP_TRIAL_TOKENS.map((token) => (
          <meta key={token} httpEquiv="origin-trial" content={token} />
        ))}
      </head>
      <body className={`${spaceGrotesk.className} ${spaceGrotesk.variable} ${barlowCondensed.variable}`}>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
          <CartDrawer />
          <GameModal />
          <WebMcpTools />
        </CartProvider>
        <PostHogInit />
        <Analytics />
      </body>
    </html>
  );
}
