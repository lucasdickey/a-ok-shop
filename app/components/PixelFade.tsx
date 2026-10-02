"use client";

import { useId } from "react";

/*
 * A faint 8-bit halftone behind a box: tiny 1.5px dots on a 2px grid whose number grows
 * steadily from none at the top left to every grid spot at the bottom right, where they
 * nearly merge. The dots are placed by ordered dithering: a 4×4 pattern decides which
 * spots fill in first, so each step of the fade adds dots evenly instead of making them darker.
 *
 * Place it as the first child of a `relative isolate` box; it sits behind the content
 * and never takes clicks.
 */

// 4×4 Bayer matrix: the order in which the 16 spots of each 8px tile fill in.
const ORDER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const LEVELS = 16;
const CELL = 2; // px between dot centers
const DOT = 1.5; // px dot size: at the dense end the dots nearly merge

export default function PixelFade() {
  const id = useId().replace(/:/g, "");
  const levels = Array.from({ length: LEVELS }, (_, level) => {
    const [row, col] = ORDER.flatMap((cells, r) => cells.map((value, c) => [value, r, c] as const))
      .filter(([value]) => value === level)
      .map(([, r, c]) => [r, c])[0];
    // Where along the top-left → bottom-right diagonal this level's dots start appearing.
    // The first tenth stays clear, so the top-left corner is clean paper.
    const start = 0.1 + (0.9 * (level + 0.5)) / LEVELS;
    return { level, row, col, start };
  });

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-dark opacity-20"
      shapeRendering="crispEdges"
    >
      <defs>
        {levels.map(({ level, row, col, start }) => (
          <g key={level}>
            <pattern id={`${id}p${level}`} width={CELL * 4} height={CELL * 4} patternUnits="userSpaceOnUse">
              <rect x={col * CELL} y={row * CELL} width={DOT} height={DOT} fill="currentColor" />
            </pattern>
            <linearGradient id={`${id}g${level}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset={start} stopColor="#000" />
              <stop offset={start} stopColor="#fff" />
            </linearGradient>
            <mask id={`${id}m${level}`}>
              <rect width="100%" height="100%" fill={`url(#${id}g${level})`} />
            </mask>
          </g>
        ))}
      </defs>
      {levels.map(({ level }) => (
        <rect key={level} width="100%" height="100%" fill={`url(#${id}p${level})`} mask={`url(#${id}m${level})`} />
      ))}
    </svg>
  );
}
