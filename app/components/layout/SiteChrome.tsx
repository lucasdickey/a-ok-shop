"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

/** Routes that render their own full-bleed layout, without the site header and footer. */
const CHROME_FREE_ROUTES = ["/concepts"];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Fade each new page in after navigating, but not the page the visitor lands on.
  const firstPath = useRef(pathname);
  const hasNavigated = useRef(false);
  if (pathname !== firstPath.current) hasNavigated.current = true;
  const isChromeFree = CHROME_FREE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isChromeFree) {
    return <>{children}</>;
  }

  // Club Receipt: every page is a paper sheet laid on the blue background,
  // with wider blue margins at the sides than the top as the screen grows.
  return (
    <div className="px-3 pb-6 pt-2.5 sm:px-6 sm:pb-10 sm:pt-4 md:px-8 lg:px-10 xl:px-16 2xl:px-20">
      <a
        href="#main"
        className="fixed left-2.5 top-[-100px] z-[100] border-2 border-dark bg-club-paper p-3 text-sm font-semibold focus:top-2.5"
      >
        Skip to content
      </a>
      <div className="receipt-sheet">
        <Navbar />
        <main id="main" tabIndex={-1} key={pathname} className={`flex-1 outline-none ${hasNavigated.current ? "page-enter" : ""}`}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
