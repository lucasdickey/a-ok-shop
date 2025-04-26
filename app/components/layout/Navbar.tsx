"use client";

import Link from "next/link";
import Image from "next/image";
import CartButton from "../cart/CartButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-secondary bg-light/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/images/a-ok-o-face.png" 
              alt="A-OK Logo" 
              width={48} 
              height={48} 
              className="rounded-full"
            />
            <span className="text-xl font-bold text-primary">a-ok.shop</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/products"
              className="text-sm font-medium hover:text-primary"
            >
              All Products
            </Link>
            <Link
              href="/products?category=t-shirts"
              className="text-sm font-medium hover:text-primary"
            >
              T-Shirts
            </Link>
            <Link
              href="/products?category=hoodies"
              className="text-sm font-medium hover:text-primary"
            >
              Hoodies
            </Link>
            <Link
              href="/products?category=hats"
              className="text-sm font-medium hover:text-primary"
            >
              Hats
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
