"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SimpleProduct } from "@/app/lib/catalog";
import ProductCard from "@/app/components/product/ProductCard";
import { CATEGORY_FILTERS } from "./categories";

const DELETE_MS = 28;
const TYPE_MS = 45;

/**
 * "Shop <word>." where a new word backspaces the old one down to "Shop." and types
 * itself back out, like the apes on the keys. The red period stays on the end.
 */
function ShopTitle({ word }: { word: string }) {
  const [shown, setShown] = useState(word);
  const shownRef = useRef(word);

  useEffect(() => {
    const show = (text: string) => {
      shownRef.current = text;
      setShown(text);
    };
    if (shownRef.current === word) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(word);
      return;
    }
    // Always clear back to "Shop." first, even when the words share letters.
    let deleting = true;
    let timer = 0;
    const step = () => {
      const current = shownRef.current;
      if (deleting && current.length > 0) {
        show(current.slice(0, -1));
        timer = window.setTimeout(step, DELETE_MS);
        return;
      }
      deleting = false;
      if (current.length < word.length) {
        show(word.slice(0, current.length + 1));
        timer = window.setTimeout(step, TYPE_MS);
      }
    };
    step();
    return () => window.clearTimeout(timer);
  }, [word]);

  // The longest title sits invisibly underneath, so the heading keeps the same size
  // while typing and on every category; nothing below it moves.
  const longest = CATEGORY_FILTERS.map((item) => item.title)
    .concat(word)
    .reduce((a, b) => (b.length > a.length ? b : a));

  return (
    <h1 className="display-heading grid text-[clamp(52px,5.8vw,88px)]">
      <span className="sr-only">Shop {word}.</span>
      <span aria-hidden="true" className="invisible [grid-area:1/1]">
        Shop {longest}.
      </span>
      <span aria-hidden="true" className="[grid-area:1/1]">
        {/* trimEnd: mid-word ("all ") the period should still hug the last letter. */}
        Shop{shown.trim() ? ` ${shown.trimEnd()}` : ""}
        <span className="text-primary"><span className="period-pulse">.</span></span>
      </span>
    </h1>
  );
}

export default function ProductBrowser({
  products,
  categoryIds,
}: {
  products: SimpleProduct[];
  categoryIds: Record<string, string[]>;
}) {
  const searchParams = useSearchParams();
  const category = (searchParams.get("category") ?? "").toLowerCase();
  const filter = CATEGORY_FILTERS.find((item) => item.category === category);

  const ids = category ? categoryIds[category] : undefined;
  const visible = ids ? products.filter((product) => ids.includes(product.id)) : products;
  const lineItems = `${visible.length} line ${visible.length === 1 ? "item" : "items"}`;

  // Switch categories in place: update the address (so back, sharing and new tabs work)
  // without reloading the page, so the title and cards can animate.
  const selectCategory = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.history.pushState(null, "", href);
  };

  return (
    <>
      <header className="border-b-2 border-dark bg-club-yellow px-5 pb-8 pt-6 sm:px-8 lg:px-[4vw] lg:pb-10 lg:pt-8">
        <nav aria-label="Breadcrumb" className="micro mb-6">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link href="/" className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline">
                A–OK
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              {category ? (
                <a
                  href="/products"
                  onClick={(event) => selectCategory(event, "/products")}
                  className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
                >
                  Shop
                </a>
              ) : (
                <span aria-current="page">Shop</span>
              )}
            </li>
            {category && (
              <>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{filter?.label ?? category}</li>
              </>
            )}
          </ol>
        </nav>
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <ShopTitle word={filter?.title ?? category} />
          <p className="text-sm md:text-[17px]">
            Printed on demand, XS–2XL.
            <br />
            Keep the receipt.
          </p>
        </div>
      </header>

      <section className="px-5 pb-12 pt-6 sm:px-8 lg:px-[4vw] lg:pt-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 border-b-2 border-dashed border-dark pb-4 sm:flex-row sm:items-center">
          <nav aria-label="Filter products" className="flex flex-wrap gap-1.5 sm:gap-2">
            {/* A category with nothing in it (e.g. hats between caps) hides its chip. */}
            {CATEGORY_FILTERS.filter(
              (item) => !item.category || item.category === category || categoryIds[item.category]?.length
            ).map((item) => {
              const isCurrent = item.category === category;
              const href = item.category ? `/products?category=${item.category}` : "/products";
              return (
                <a
                  key={item.label}
                  href={href}
                  onClick={(event) => selectCategory(event, href)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center border border-dark px-3 text-xs no-underline transition-colors sm:px-5 sm:text-[13px] ${
                    isCurrent ? "bg-dark text-club-paper shadow-[3px_3px_0_#C52224]" : "hover:bg-club-yellow"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
          <span className="micro" aria-live="polite">
            {lineItems}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="border-2 border-dashed border-dark px-6 py-12 text-center">
            <p className="micro mb-2">0 line items</p>
            <p className="text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          // Keyed by category so the cards ripple in again on each switch.
          <div key={category} className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3">
            {visible.map((product, index) => (
              <div key={product.id} className="rise-in" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <ProductCard product={product} index={index} priority={index < 4} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-y-2 border-dashed border-dark py-6">
          <span className="micro">Subtotal: {lineItems}</span>
          <strong className="display-heading text-[27px] md:text-[34px]">Total personality: off the charts.</strong>
        </div>
      </section>
    </>
  );
}
