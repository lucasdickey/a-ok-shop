"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

/** Routes that render their own full-bleed layout, without the site header and footer. */
const CHROME_FREE_ROUTES = ["/concepts"];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChromeFree = CHROME_FREE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isChromeFree) {
    return <>{children}</>;
  }

  // Club Receipt: every page is a paper sheet laid on the blue background.
  return (
    <div className="px-2.5 pb-6 pt-2.5 sm:px-4 sm:pb-10 sm:pt-4">
      <a
        href="#main"
        className="fixed left-2.5 top-[-100px] z-[100] border-2 border-dark bg-club-paper p-3 text-sm font-semibold focus:top-2.5"
      >
        Skip to content
      </a>
      <div className="receipt-sheet">
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
