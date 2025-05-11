import type { Metadata } from "next";
import { Inter, Space_Grotesk, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import CartProvider from "./components/cart/CartProvider";
import CartDrawer from "./components/cart/CartDrawer";

const inter = Inter({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: '--font-bebas-neue',
  weight: '400',
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
      <body className={`${inter.className} ${spaceGrotesk.variable} ${bebasNeue.variable}`}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
