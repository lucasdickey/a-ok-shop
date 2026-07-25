"use client";

import { useState } from "react";
import Link from "next/link";
import CartButton from "../cart/CartButton";
import TextAnimatedLogo from "./TextAnimatedLogo";

const navLinks = [
  { label: "T-Shirts", href: "/products?category=t-shirts" },
  { label: "Hoodies", href: "/products?category=hoodies" },
  { label: "Hats", href: "/products?category=hats" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark/10 bg-light/80 shadow-sm backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <TextAnimatedLogo />
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map(({ label, href }) => (
              <Link key={label} href={href} className="nav-link">
                {label}
              </Link>
            ))}
            <span aria-hidden="true" className="h-4 w-px bg-dark/20" />
            <Link
              href="/game"
              className="nav-link text-maroon after:bg-charcoal-dark hover:text-charcoal-dark"
            >
              Run, Human, Run!
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <CartButton />
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-secondary-light active:scale-90 md:hidden"
          >
            <span
              className={`absolute block h-0.5 w-5 rounded-full bg-dark transition-all duration-300 ease-out-expo ${
                menuOpen ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute block h-0.5 w-5 rounded-full bg-dark transition-all duration-300 ease-out-expo ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute block h-0.5 w-5 rounded-full bg-dark transition-all duration-300 ease-out-expo ${
                menuOpen ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden">
          {/* Backdrop below the panel */}
          <div
            className="fixed inset-0 top-16 z-40 animate-fade-in bg-dark/40 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-16 z-50 border-b border-dark/10 bg-light shadow-card-hover"
          >
            <div className="stagger-children container flex flex-col py-3">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="flex items-center justify-between border-b border-dark/5 py-3.5 text-base font-semibold transition-colors duration-150 active:text-maroon"
                >
                  {label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-dark/30"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ))}
              <Link
                href="/products"
                onClick={closeMenu}
                className="flex items-center justify-between border-b border-dark/5 py-3.5 text-base font-semibold transition-colors duration-150 active:text-maroon"
              >
                Shop All
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-dark/30"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/game"
                onClick={closeMenu}
                className="flex items-center justify-between py-3.5 text-base font-semibold text-maroon transition-colors duration-150 active:text-maroon-dark"
              >
                Run, Human, Run!
                <span aria-hidden="true">🎮</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
