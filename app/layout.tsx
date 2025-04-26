import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import CartProvider from "./components/cart/CartProvider";
import CartDrawer from "./components/cart/CartDrawer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "A-OK: Shop Apes On Keys",
  description: "Apes On Keys - Nerd Streetwear (for real)",
  icons: {
    icon: [{ url: "/images/a-ok-o-face.png" }],
    apple: [{ url: "/images/a-ok-o-face.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
