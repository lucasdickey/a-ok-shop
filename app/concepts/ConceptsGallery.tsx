"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { concepts, Concept } from "./concepts";

type Viewport = "desktop" | "mobile";
type Filter = "all" | "cursor" | "droid" | "sol" | "gpt6";

const ORIGIN_LABEL: Record<Concept["harness"], string> = {
  Cursor: "Cursor",
  Droid: "Droid",
  Codex: "Codex",
};

const BADGE_CLASS: Record<Concept["harness"], string> = {
  Cursor: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  Droid: "border-[#B91C1C]/40 bg-[#B91C1C]/15 text-red-300",
  Codex: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

const DOT_CLASS: Record<Concept["harness"], string> = {
  Cursor: "bg-indigo-400",
  Droid: "bg-red-500",
  Codex: "bg-emerald-400",
};

const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
  ["all", "All"],
  ["cursor", "Cursor · Opus 4.8"],
  ["droid", "Droid · Grok 4.6"],
  ["sol", "Codex · Sol 5.6"],
  ["gpt6", "Codex · GPT-6 · New"],
];

const VIEWPORTS: ReadonlyArray<readonly [Viewport, string]> = [
  ["desktop", "Desktop"],
  ["mobile", "Mobile"],
];

function OriginBadge({ concept }: { concept: Concept }) {
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium " +
        BADGE_CLASS[concept.harness]
      }
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {ORIGIN_LABEL[concept.harness]} · {concept.model}
    </span>
  );
}

function ViewportToggle({
  viewport,
  onChange,
}: {
  viewport: Viewport;
  onChange: (next: Viewport) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-[#F5F2DC]/20 p-1" role="group" aria-label="Viewport">
      {VIEWPORTS.map(([value, label]) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          aria-pressed={viewport === value}
          className={
            "rounded px-3 py-1 text-xs uppercase tracking-wider transition " +
            (viewport === value
              ? "bg-[#F5F2DC] text-[#0A0A0A]"
              : "text-[#F5F2DC]/60 hover:text-[#F5F2DC]")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ArrowButton({
  direction,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous concept" : "Next concept"}
      className={
        "z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#F5F2DC]/20 bg-[#141414] text-[#F5F2DC] transition hover:border-[#F5F2DC]/60 " +
        className
      }
    >
      {direction === "prev" ? "←" : "→"}
    </button>
  );
}

export default function ConceptsGallery() {
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [filter, setFilter] = useState<Filter>("gpt6");
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(
    () =>
      filter === "all"
        ? concepts
        : concepts.filter((c) => filter === "gpt6" ? c.model === "GPT-6" : filter === "sol" ? c.model === "Sol 5.6" : c.harness.toLowerCase() === filter),
    [filter]
  );

  const current: Concept | undefined = visible[index] ?? visible[0];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (visible.length === 0 ? 0 : (i + delta + visible.length) % visible.length));
    },
    [visible.length]
  );

  // Arrow-key traversal while the gallery (not the iframe) has focus; Escape leaves fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        setExpanded(false);
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, expanded]);

  // Keep the page behind the lightbox from scrolling.
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  if (!current) {
    return <div className="px-6 py-24 text-center">No concepts match.</div>;
  }

  const frameWidth = viewport === "mobile" ? "w-[390px] max-w-full" : "w-full";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F2DC]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[5px] text-[#F5F2DC]/40">
            A-OK.SHOP · Design review
          </p>
          <h1
            className="mt-2 text-4xl leading-none tracking-wide text-[#F5F2DC] sm:text-6xl"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Concept Gallery
          </h1>
        </header>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by origin">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setFilter(value); setIndex(0); }}
                aria-pressed={filter === value}
                className={
                  "rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition " +
                  (filter === value
                    ? "border-[#B91C1C] bg-[#B91C1C] text-white"
                    : "border-[#F5F2DC]/20 text-[#F5F2DC]/60 hover:border-[#F5F2DC]/50")
                }
              >
                {label}
              </button>
            ))}
          </div>

          <ViewportToggle viewport={viewport} onChange={setViewport} />
        </div>

        {/* Viewer */}
        <div className="relative">
          <ArrowButton
            direction="prev"
            onClick={() => go(-1)}
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 sm:flex"
          />
          <ArrowButton
            direction="next"
            onClick={() => go(1)}
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:flex"
          />

          <div
            className={
              "mx-auto overflow-hidden rounded-lg border border-[#F5F2DC]/15 bg-[#141414] shadow-2xl transition-all " +
              frameWidth
            }
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-[#F5F2DC]/10 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 truncate rounded bg-[#0A0A0A] px-3 py-1 font-mono text-xs text-[#F5F2DC]/50">
                a-ok.shop{current.file}
              </div>
              <button
                onClick={() => setExpanded(true)}
                className="shrink-0 rounded border border-[#F5F2DC]/20 px-2.5 py-1 text-xs uppercase tracking-wider text-[#F5F2DC]/70 transition hover:border-[#F5F2DC]/60 hover:text-[#F5F2DC]"
              >
                Expand ⤢
              </button>
              <a
                href={current.file}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs uppercase tracking-wider text-[#F5F2DC]/60 hover:text-[#F5F2DC]"
              >
                Open ↗
              </a>
            </div>

            <iframe
              key={current.id + viewport}
              src={current.file}
              title={current.title}
              className="h-[68vh] w-full border-0 bg-white"
            />
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 rounded-lg border border-[#F5F2DC]/15 bg-[#141414] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <OriginBadge concept={current} />
            <h2
              className="text-3xl leading-none tracking-wide text-[#F5F2DC]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {current.id} — {current.title}
            </h2>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#F5F2DC]/70">
            {current.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {current.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-[#F5F2DC]/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[2px] text-[#F5F2DC]/40"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-[3px] text-[#F5F2DC]/40">
              Key parts of the experience
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {current.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-[#F5F2DC]/70">
                  <span className="mt-0.5 text-[#B91C1C]">▸</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Strip */}
        <div
          className="mt-8 flex snap-x gap-3 overflow-x-auto pb-2"
          role="group"
          aria-label="Concept list"
        >
          {visible.map((c, i) => {
            const selected = c.id === current.id;
            return (
              <button
                key={c.id}
                aria-pressed={selected}
                onClick={() => setIndex(i)}
                className={
                  "min-w-[150px] snap-start rounded-md border px-3 py-2 text-left transition " +
                  (selected
                    ? "border-[#B91C1C] bg-[#B91C1C]/15"
                    : "border-[#F5F2DC]/10 hover:border-[#F5F2DC]/40")
                }
              >
                <div className="flex items-center gap-2">
                  <span className={"h-2 w-2 rounded-full " + DOT_CLASS[c.harness]} />
                  <span
                    className="text-lg leading-none text-[#F5F2DC]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {c.id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#F5F2DC]/60">{c.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${current.id} — ${current.title}`}
          className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0A]"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-[#F5F2DC]/10 px-4 py-3">
            <OriginBadge concept={current} />
            <h2
              className="text-2xl leading-none tracking-wide text-[#F5F2DC]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {current.id} — {current.title}
            </h2>
            <span className="text-xs uppercase tracking-wider text-[#F5F2DC]/40">
              {index + 1} / {visible.length}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <ViewportToggle viewport={viewport} onChange={setViewport} />
              <a
                href={current.file}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-wider text-[#F5F2DC]/60 hover:text-[#F5F2DC]"
              >
                Open ↗
              </a>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close fullscreen"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F5F2DC]/20 text-lg text-[#F5F2DC] transition hover:border-[#F5F2DC]/60"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-stretch justify-center overflow-hidden px-2 py-3 sm:px-16"
            onClick={(e) => {
              if (e.target === e.currentTarget) setExpanded(false);
            }}
          >
            <ArrowButton
              direction="prev"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 sm:flex"
            />
            <ArrowButton
              direction="next"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 sm:flex"
            />

            <iframe
              key={"expanded" + current.id + viewport}
              src={current.file}
              title={current.title}
              className={
                "h-full rounded-lg border border-[#F5F2DC]/15 bg-white shadow-2xl " + frameWidth
              }
            />
          </div>

          <div
            className="flex gap-2 overflow-x-auto border-t border-[#F5F2DC]/10 px-4 py-2.5"
            role="group"
            aria-label="Concept list"
          >
            {visible.map((c, i) => {
              const selected = c.id === current.id;
              return (
                <button
                  key={c.id}
                  aria-pressed={selected}
                  onClick={() => setIndex(i)}
                  className={
                    "flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition " +
                    (selected
                      ? "border-[#B91C1C] bg-[#B91C1C]/15 text-[#F5F2DC]"
                      : "border-[#F5F2DC]/10 text-[#F5F2DC]/60 hover:border-[#F5F2DC]/40 hover:text-[#F5F2DC]")
                  }
                >
                  <span className={"h-2 w-2 rounded-full " + DOT_CLASS[c.harness]} />
                  <span className="font-mono">{c.id}</span>
                  <span className="max-w-[140px] truncate">{c.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
