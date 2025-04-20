'use client';

import Link from 'next/link';
import Image from 'next/image';
import CartButton from '../cart/CartButton';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-secondary bg-light/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">A-OK Store</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/products" className="text-sm font-medium hover:text-primary">
              All Products
            </Link>
            <Link href="/products?category=apparel" className="text-sm font-medium hover:text-primary">
              Apparel
            </Link>
            <Link href="/products?category=accessories" className="text-sm font-medium hover:text-primary">
              Accessories
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <CartButton />
        </div>
      </div>
    </header>
  );
}
