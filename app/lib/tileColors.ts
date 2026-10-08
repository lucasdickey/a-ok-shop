import type { SimpleProduct } from "./catalog";

// Grids run two or three tiles across, so the three tiles before a tile cover the one to its
// left and the one above it, and the three after cover the ones to its right and below.
const NEARBY = 3;

/** The garment colors a product has photos of, in catalog order. */
function photoColors(product: SimpleProduct): string[] {
  const colors = product.images.edges.map((edge) => edge.node.color);
  return Array.from(new Set(colors.filter((color): color is string => Boolean(color))));
}

/** A small seeded random number generator (mulberry32), returning numbers from 0 up to 1. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number for seeding pickTileColors, made once per page visit on the server. */
export function newTileSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

// A tee offered in two colors can be boxed in by the tiles before it, so the picking runs a
// few times and keeps the try with the fewest repeats.
const TRIES = 12;

/** How many tiles wear the same color as one of the three tiles before them. */
function repeats(picks: (string | undefined)[]): number {
  return picks.filter(
    (color, index) => color && picks.slice(Math.max(0, index - NEARBY), index).includes(color)
  ).length;
}

/**
 * Picks the color each tile in a product grid shows, at random, so that tiles side by side
 * or one above the other don't wear the same color. Products with a single color keep it,
 * and their neighbors steer around them. The same seed always gives the same picks, so the
 * server and the browser draw the grid alike.
 */
export function pickTileColors(products: SimpleProduct[], seed: number): (string | undefined)[] {
  const random = seededRandom(seed);
  const colorsByTile = products.map(photoColors);
  let best = pickOnce(colorsByTile, random);
  for (let attempt = 1; attempt < TRIES && repeats(best) > 0; attempt++) {
    const picks = pickOnce(colorsByTile, random);
    if (repeats(picks) < repeats(best)) best = picks;
  }
  return best;
}

function pickOnce(colorsByTile: string[][], random: () => number): (string | undefined)[] {
  const picks: (string | undefined)[] = [];

  colorsByTile.forEach((colors, index) => {
    const before = picks.slice(Math.max(0, index - NEARBY));
    const fixedAfter = colorsByTile
      .slice(index + 1, index + 1 + NEARBY)
      .filter((later) => later.length === 1)
      .map((later) => later[0]);
    const nearby = [...before, ...fixedAfter];
    const left = picks[index - 1];
    // Avoid every nearby color when possible, else at least the tile to the left.
    const choices = [
      colors.filter((color) => !nearby.includes(color)),
      colors.filter((color) => color !== left),
      colors,
    ].find((list) => list.length > 0);
    picks.push(choices ? choices[Math.floor(random() * choices.length)] : undefined);
  });

  return picks;
}
