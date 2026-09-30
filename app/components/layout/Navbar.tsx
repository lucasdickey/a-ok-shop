"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButton from "../cart/CartButton";

const NAV_LINKS = [
  { href: "/products", label: "The collection" },
  { href: "/products?category=t-shirts", label: "Tees" },
  { href: "/products?category=hoodies", label: "Hoodies" },
  { href: "/products?category=hats", label: "Hats" },
  { href: "/chaos-monkeys", label: "Chaos Monkeys" },
  { href: "/game", label: "Run, Human, Run!" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the phone menu after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-dark bg-club-yellow">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:gap-5 lg:px-8 lg:py-5 xl:gap-7 xl:px-10">
        <Link
          href="/"
          className="flex min-h-[44px] items-center font-[Arial,sans-serif] text-[40px] font-bold leading-[0.9] tracking-[-4px] no-underline lg:text-[48px] lg:tracking-[-5px]"
          aria-label="A-OK home"
        >
          A–OK<sup className="ml-1 self-start text-[13px] tracking-normal">®</sup>
        </Link>
        <span className="micro hidden leading-tight xl:block">
          Apes on keys
          <br />
          Humans in clothes.
        </span>

        <nav aria-label="Main navigation" className="ml-auto hidden gap-4 text-sm lg:flex xl:gap-6">
          {NAV_LINKS.map((link) => {
            const isCurrent = !link.href.includes("?") && pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className="flex min-h-[44px] items-center no-underline decoration-2 underline-offset-[6px] hover:underline aria-[current=page]:underline"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <CartButton />
          <button
            type="button"
            className="min-h-[44px] px-2 text-sm font-semibold lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close −" : "Menu +"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="border-t-2 border-dark bg-club-paper px-4 py-3 lg:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex justify-between border-b border-dashed border-dark/50 py-3 no-underline last:border-b-0"
            >
              {link.label} <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
