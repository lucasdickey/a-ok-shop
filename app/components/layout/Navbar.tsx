"use client";

import Link from "next/link";
import Image from "next/image";
import CartButton from "../cart/CartButton";
import TextAnimatedLogo from "./TextAnimatedLogo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-secondary bg-light/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <TextAnimatedLogo />
          <nav className="hidden md:flex gap-6">
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
            <Link
              href="/game"
              className="text-sm font-medium hover:text-primary"
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
