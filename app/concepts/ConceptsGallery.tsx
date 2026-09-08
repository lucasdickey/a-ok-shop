"use client";

import { useEffect, useMemo, useState } from "react";
import { concepts, Concept } from "./concepts";

type Viewport = "desktop" | "mobile";
type Filter = "all" | "cursor" | "droid" | "sol" | "gpt6";

const ORIGIN_LABEL: Record<Concept["harness"], string> = {
  Cursor: "Cursor",
  Droid: "Droid",
  Codex: "Codex",
};

const originColor: Record<Concept["harness"], string> = {
  Cursor: "indigo",
  Droid: "red",
  Codex: "emerald",
};

export default function ConceptsGallery() {
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [filter, setFilter] = useState<Filter>("gpt6");

  const visible = useMemo(
    () =>
      filter === "all"
        ? concepts
        : concepts.filter((c) => filter === "gpt6" ? c.model === "GPT-6" : filter === "sol" ? c.model === "Sol 5.6" : c.harness.toLowerCase() === filter),
    [filter]
  );

  const current: Concept = visible[index] ?? visible[0];

  const go = (next: number) => {
    if (visible.length === 0) return;
    setIndex((next + visible.length) % visible.length);
  };



  // Arrow-key traversal while the gallery (not the iframe) has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button, input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => (i - 1 + visible.length) % visible.length);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => (i + 1) % visible.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length]);

  if (!current) {
    return <div className="px-6 py-24 text-center">No concepts match.</div>;
  }

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
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#F5F2DC]/50">
            Side-by-side pass over the site refresh. Twenty prototypes across four rounds. The newest five put the buying
            flow, art studio, and mobile navigation into practice. Use the arrows
            or ← / → keys to compare.
          </p>
        </header>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by origin">
            {(
              [
                ["all", "All"],
                ["cursor", "Cursor · Opus 4.8"],
                ["droid", "Droid · Grok 4.6"],
                ["sol", "Codex · Sol 5.6"],
                ["gpt6", "Codex · GPT-6 · New"],
              ] as const
            ).map(([value, label]) => (
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

          <div className="flex gap-1 rounded-md border border-[#F5F2DC]/20 p-1" role="group" aria-label="Viewport">
            {(
              [
                ["desktop", "Desktop"],
                ["mobile", "Mobile"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setViewport(value)}
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
        </div>

        {/* Viewer */}
        <div className="relative">
          <button
            onClick={() => go(index - 1)}
            aria-label="Previous concept"
            className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#F5F2DC]/20 bg-[#141414] text-[#F5F2DC] transition hover:border-[#F5F2DC]/60 sm:flex"
          >
            ←
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="Next concept"
            className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#F5F2DC]/20 bg-[#141414] text-[#F5F2DC] transition hover:border-[#F5F2DC]/60 sm:flex"
          >
            →
          </button>

          <div
            className={
              "mx-auto overflow-hidden rounded-lg border border-[#F5F2DC]/15 bg-[#141414] shadow-2xl transition-all " +
              (viewport === "mobile" ? "w-[390px] max-w-full" : "w-full")
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
            <span
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium " +
                (originColor[current.harness] === "indigo"
                  ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-300"
                  : originColor[current.harness] === "emerald"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-[#B91C1C]/40 bg-[#B91C1C]/15 text-red-300")
              }
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {ORIGIN_LABEL[current.harness]} · {current.model}
            </span>
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
                  <span
                    className={
                      "h-2 w-2 rounded-full " +
                      (c.harness === "Cursor"
                        ? "bg-indigo-400"
                        : c.harness === "Codex"
                          ? "bg-emerald-400"
                          : "bg-red-500")
                    }
                  />
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
    </div>
  );
}
