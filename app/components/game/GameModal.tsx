"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import GamePlayer from "./GamePlayer";

/**
 * Plays Run, Human, Run! in a large modal. Any plain click on a /game link opens it;
 * new-tab clicks and direct visits still reach the /game page.
 */
export default function GameModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Catch clicks on /game links before the link navigates (capture phase).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest('a[href="/game"]');
      if (!link || pathname === "/game") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Close when navigating elsewhere.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock page scroll, move focus in, keep Tab inside, Escape closes,
  // and return focus afterwards. The lock sits on <html> so the game's own
  // body scroll handling can't undo it.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), canvas[tabindex], [tabindex="0"]')
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-club-blue-dark/70" aria-hidden="true" onClick={() => setOpen(false)} />
      {/* 5% of the screen on every side. */}
      <div className="page-enter absolute inset-[5vh_5vw]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-title"
          className="flex h-full flex-col overflow-hidden border-2 border-dark bg-dark shadow-[10px_10px_0_#22221E]"
        >
          <div className="flex shrink-0 items-center gap-4 border-b-2 border-dark bg-club-yellow px-4 py-2 sm:px-6">
            <p className="micro hidden sm:block">Bonus item / a little detour</p>
            <h2 id="game-title" className="display-heading text-2xl sm:text-3xl">
              Run, Human, Run!
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto flex min-h-[44px] items-center gap-2 border-2 border-dark bg-club-paper px-4 text-sm font-semibold shadow-hard-sm hover:bg-club-paper/80"
            >
              Close <span aria-hidden="true">×</span>
            </button>
          </div>
          {/* translateZ keeps the game's full-screen layers inside this area, below the title bar. */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto [transform:translateZ(0)]">
            <div className="w-full max-w-4xl">
              <GamePlayer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
