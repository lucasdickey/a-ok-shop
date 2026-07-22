"use client";

import Link from "next/link";
import CartButton from "../cart/CartButton";
import TextAnimatedLogo from "./TextAnimatedLogo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark/10 bg-light/80 shadow-sm backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <TextAnimatedLogo />
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/products?category=t-shirts" className="nav-link">
              T-Shirts
            </Link>
            <Link href="/products?category=hoodies" className="nav-link">
              Hoodies
            </Link>
            <Link href="/products?category=hats" className="nav-link">
              Hats
            </Link>
            <span
              aria-hidden="true"
              className="h-4 w-px bg-dark/20"
            />
            <Link
              href="/game"
              className="nav-link text-maroon after:bg-charcoal-dark hover:text-charcoal-dark"
            >
              Run, Human, Run!
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
