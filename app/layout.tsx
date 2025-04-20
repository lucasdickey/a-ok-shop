import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartProvider from './components/cart/CartProvider';
import CartDrawer from './components/cart/CartDrawer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'A-OK Store | Custom Shopify Storefront',
  description: 'A custom Shopify storefront built with Next.js, TypeScript, and Tailwind CSS',
  icons: {
    icon: [
      { url: '/favicon.jpg' },
    ],
    apple: [
      { url: '/favicon.jpg' },
    ],
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
