"use client";

import { useState } from "react";
import Link from "next/link";
import { HiMenu, HiX } from "react-icons/hi";
import CartButton from "../cart/CartButton";
import TextAnimatedLogo from "./TextAnimatedLogo";

const navLinks = [
  { href: "/products?category=t-shirts", label: "T-Shirts" },
  { href: "/products?category=hoodies", label: "Hoodies" },
  { href: "/products?category=hats", label: "Hats" },
  { href: "/game", label: "Run, Human, Run!", pulse: true },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

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
            <span className="text-sm text-gray-400">|</span>
            <Link
              href="/game"
              className="text-sm font-medium hover:text-primary animate-pulse"
            >
              Run, Human, Run!
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <CartButton />
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-dark hover:text-primary"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <HiX className="h-6 w-6" />
            ) : (
              <HiMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden border-t border-secondary bg-light"
        >
          <div className="container flex flex-col py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`py-3 text-sm font-medium hover:text-primary ${
                  link.pulse ? "animate-pulse" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
