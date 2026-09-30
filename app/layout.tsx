import type { Metadata } from "next";
import { Space_Grotesk, Barlow_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteChrome from "./components/layout/SiteChrome";
import CartProvider from "./components/cart/CartProvider";
import CartDrawer from "./components/cart/CartDrawer";
import GameModal from "./components/game/GameModal";
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
  title: "ꓘO-∀ - Shop A-OK Merch",
  description: "Apes On Keys - Nerd Streetwear (for real)",
  icons: {
    icon: [{ url: "/images/a-ok-o-face.png" }],
    apple: [{ url: "/images/a-ok-o-face.png" }],
  },
  openGraph: {
    title: "ꓘO-∀ - Shop A-OK Merch",
    description: "Apes On Keys - Nerd Streetwear (for real)",
    url: "https://www.a-ok.shop/",
    siteName: "a-ok.shop",
    images: [
      {
        url: "/images/og_image.png",
        width: 768,
        height: 512,
        alt: "A-OK Shop - Apes On Keys",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ꓘO-∀ - Shop A-OK Merch",
    description: "Apes On Keys - Nerd Streetwear (for real)",
    images: ["/images/og_image.png"],
  },
};

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
      </head>
      <body className={`${spaceGrotesk.className} ${spaceGrotesk.variable} ${barlowCondensed.variable}`}>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
          <CartDrawer />
          <GameModal />
        </CartProvider>
        <PostHogInit />
        <Analytics />
      </body>
    </html>
  );
}
