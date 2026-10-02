// Run, Human, Run! rules: a human, a maze, UBI credits, Touch Grass pellets and apes.
// No React or canvas here: the component feeds in input and elapsed time, then draws the state.

export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Phase = "ready" | "playing" | "won" | "lost";
export type GameEvent = "credit" | "power" | "ape-eaten" | "life-lost" | "won" | "lost";
type Personality = "chaser" | "ambusher" | "wanderer";

export type Player = {
  pos: Point;
  prev: Point; // where the last step started, for smooth drawing
  dir: Point;
  wanted: Point | null; // buffered turn, taken as soon as the maze allows it
  stepMs: number;
};

export type Ape = {
  pos: Point;
  prev: Point;
  dir: Point;
  personality: Personality;
  frightened: boolean;
  respawnMs: number; // above 0 while an eaten ape waits off the board
  stepMs: number;
};

export type GameState = {
  phase: Phase;
  player: Player;
  apes: Ape[];
  credits: Point[];
  pellets: Point[];
  pelletTimersMs: number[]; // one countdown per eaten pellet
  creditsCollected: number;
  creditsToWin: number;
  lives: number;
  powerMs: number;
  invulnerableMs: number;
  random: () => number;
};

// 25 × 19 cells. # is wall; the open ends of the middle row are a tunnel.
const MAZE = [
  "#########################",
  "#...........#...........#",
  "#.###.#####.#.#####.###.#",
  "#.......................#",
  "#.###.#.#########.#.###.#",
  "#.....#.....#.....#.....#",
  "#####.#####.#.#####.#####",
  "#####.#...........#.#####",
  "#####.#.###.#.###.#.#####",
  "......#...........#......",
  "#####.#.###.#.###.#.#####",
  "#####.#...........#.#####",
  "#####.#.#########.#.#####",
  "#...........#...........#",
  "#.###.#####.#.#####.###.#",
  "#...#...............#...#",
  "#.#.#.#.#########.#.#.#.#",
  "#.....#...........#.....#",
  "#########################",
];

export const COLS = MAZE[0].length;
export const ROWS = MAZE.length;

export const PLAYER_STEP_MS = 125;
const APE_STEP_MS = 230;
const APE_STEP_MIN_MS = 150;
const APE_SPEEDUP_PER_CREDIT_MS = 8;
const FRIGHTENED_SLOWDOWN = 1.6;
export const POWER_MS = 7000;
export const POWER_WARNING_MS = 2000;
export const INVULNERABLE_MS = 2000;
const APE_RESPAWN_MS = 3000;
const PELLET_RESPAWN_MS = 8000;
export const START_LIVES = 3;
const CREDITS_ON_BOARD = 4;
const PELLETS_ON_BOARD = 2;
const START_APES = 3;
const MAX_APES = 6;
const CREDITS_PER_EXTRA_APE = 3;
const PERSONALITIES: Personality[] = ["chaser", "ambusher", "wanderer"];

const PLAYER_START: Point = { x: 12, y: 11 };
const APE_HOMES: Point[] = [
  { x: 1, y: 1 },
  { x: COLS - 2, y: 1 },
  { x: 1, y: ROWS - 2 },
  { x: COLS - 2, y: ROWS - 2 },
];

const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const ALL_DIRS = Object.values(DIRECTIONS);
const STILL: Point = { x: 0, y: 0 };

export function isWall(x: number, y: number): boolean {
  if (y < 0 || y >= ROWS) return true;
  return MAZE[y][(x + COLS) % COLS] === "#";
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const isStill = (d: Point) => d.x === 0 && d.y === 0;
const step = (p: Point, d: Point): Point => ({ x: (p.x + d.x + COLS) % COLS, y: p.y + d.y });
const canMove = (p: Point, d: Point) => !isStill(d) && !isWall(p.x + d.x, p.y + d.y);

/** Steps from `from` to every cell (through the tunnel too); -1 where unreachable. */
function distancesFrom(from: Point): Int16Array {
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  dist[from.y * COLS + from.x] = 0;
  const queue: Point[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    const d = dist[cell.y * COLS + cell.x];
    for (const dir of ALL_DIRS) {
      if (!canMove(cell, dir)) continue;
      const next = step(cell, dir);
      const index = next.y * COLS + next.x;
      if (dist[index] !== -1) continue;
      dist[index] = d + 1;
      queue.push(next);
    }
  }
  return dist;
}

const distanceAt = (dist: Int16Array, p: Point) => dist[p.y * COLS + p.x];

/** The ape corner farthest from the human, so nothing appears next to them. */
function farthestHome(state: GameState, skip: Point[] = []): Point {
  const dist = distancesFrom(state.player.pos);
  const homes = APE_HOMES.filter((home) => !skip.some((p) => same(p, home)));
  const pool = homes.length > 0 ? homes : APE_HOMES;
  return pool.reduce((best, home) => (distanceAt(dist, home) > distanceAt(dist, best) ? home : best));
}

function newApe(state: GameState, home: Point): Ape {
  return {
    pos: { ...home },
    prev: { ...home },
    dir: STILL,
    personality: PERSONALITIES[state.apes.length % PERSONALITIES.length],
    frightened: false,
    respawnMs: 0,
    stepMs: 0,
  };
}

/** A free cell away from the human and the apes; falls back to any free cell. */
function freeCell(state: GameState): Point | null {
  const taken = [state.player.pos, ...state.credits, ...state.pellets];
  const playerDist = distancesFrom(state.player.pos);
  const open: Point[] = [];
  const safe: Point[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = { x, y };
      if (isWall(x, y) || taken.some((p) => same(p, cell))) continue;
      open.push(cell);
      const nearApe = state.apes.some((ape) => Math.abs(ape.pos.x - x) + Math.abs(ape.pos.y - y) < 3);
      if (!nearApe && distanceAt(playerDist, cell) >= 4) safe.push(cell);
    }
  }
  const pool = safe.length > 0 ? safe : open;
  return pool.length > 0 ? pool[Math.floor(state.random() * pool.length)] : null;
}

function placeCredit(state: GameState) {
  const cell = freeCell(state);
  if (cell) state.credits.push(cell);
}

function placePellet(state: GameState) {
  const cell = freeCell(state);
  if (cell) state.pellets.push(cell);
}

export function createGame(creditsToWin: number, random: () => number = Math.random): GameState {
  const state: GameState = {
    phase: "ready",
    player: { pos: { ...PLAYER_START }, prev: { ...PLAYER_START }, dir: STILL, wanted: null, stepMs: 0 },
    apes: [],
    credits: [],
    pellets: [],
    pelletTimersMs: [],
    creditsCollected: 0,
    creditsToWin,
    lives: START_LIVES,
    powerMs: 0,
    invulnerableMs: 0,
    random,
  };
  for (let i = 0; i < START_APES; i++) {
    state.apes.push(newApe(state, APE_HOMES[i % APE_HOMES.length]));
  }
  for (let i = 0; i < CREDITS_ON_BOARD; i++) placeCredit(state);
  for (let i = 0; i < PELLETS_ON_BOARD; i++) placePellet(state);
  return state;
}

/** Arrow key, swipe or D-pad press. The first one starts the round. */
export function setDirection(state: GameState, direction: Direction) {
  if (state.phase === "ready") state.phase = "playing";
  if (state.phase !== "playing") return;
  const player = state.player;
  player.wanted = DIRECTIONS[direction];
  // A standing human moves on the next update instead of waiting out a step.
  if (isStill(player.dir)) player.stepMs = PLAYER_STEP_MS;
}

export function apeStepMs(state: GameState, ape: Ape): number {
  const base = Math.max(APE_STEP_MIN_MS, APE_STEP_MS - state.creditsCollected * APE_SPEEDUP_PER_CREDIT_MS);
  return ape.frightened ? base * FRIGHTENED_SLOWDOWN : base;
}

function loseLife(state: GameState, events: GameEvent[]) {
  state.lives -= 1;
  events.push("life-lost");
  if (state.lives <= 0) {
    state.phase = "lost";
    events.push("lost");
    return;
  }
  const player = state.player;
  player.pos = { ...PLAYER_START };
  player.prev = { ...PLAYER_START };
  player.dir = STILL;
  player.wanted = null;
  state.invulnerableMs = INVULNERABLE_MS;
  // Apes go back to the corners, farthest first.
  const used: Point[] = [];
  for (const ape of state.apes) {
    const home = farthestHome(state, used);
    used.push(home);
    ape.pos = { ...home };
    ape.prev = { ...home };
    ape.dir = STILL;
    ape.stepMs = 0;
  }
}

/** Checked after every single move, so a human and an ape can never pass through each other. */
function resolveContact(state: GameState, events: GameEvent[]) {
  for (const ape of state.apes) {
    if (ape.respawnMs > 0 || !same(ape.pos, state.player.pos)) continue;
    if (ape.frightened) {
      ape.frightened = false;
      ape.respawnMs = APE_RESPAWN_MS;
      events.push("ape-eaten");
    } else if (state.invulnerableMs <= 0) {
      loseLife(state, events);
      return;
    }
  }
}

function movePlayer(state: GameState, events: GameEvent[]) {
  const player = state.player;
  player.prev = player.pos;
  if (player.wanted && canMove(player.pos, player.wanted)) {
    player.dir = player.wanted;
    player.wanted = null;
  }
  if (!canMove(player.pos, player.dir)) return;
  player.pos = step(player.pos, player.dir);

  const creditIndex = state.credits.findIndex((c) => same(c, player.pos));
  if (creditIndex !== -1) {
    state.credits.splice(creditIndex, 1);
    state.creditsCollected += 1;
    events.push("credit");
    if (state.creditsCollected >= state.creditsToWin) {
      state.phase = "won";
      events.push("won");
      return;
    }
    placeCredit(state);
    if (state.creditsCollected % CREDITS_PER_EXTRA_APE === 0 && state.apes.length < MAX_APES) {
      const ape = newApe(state, farthestHome(state));
      ape.respawnMs = 1000; // a beat before it enters
      state.apes.push(ape);
    }
  }

  const pelletIndex = state.pellets.findIndex((p) => same(p, player.pos));
  if (pelletIndex !== -1) {
    state.pellets.splice(pelletIndex, 1);
    state.pelletTimersMs.push(PELLET_RESPAWN_MS);
    state.powerMs = POWER_MS;
    events.push("power");
    for (const ape of state.apes) {
      if (ape.respawnMs > 0) continue;
      ape.frightened = true;
      ape.dir = { x: -ape.dir.x, y: -ape.dir.y }; // the tell: every ape turns around
    }
  }

  resolveContact(state, events);
}

function apeTarget(state: GameState, ape: Ape): Point {
  const { pos, dir } = state.player;
  if (ape.personality === "ambusher") {
    // Aim a few cells ahead of the human.
    for (let ahead = 3; ahead > 0; ahead--) {
      const cell = { x: pos.x + dir.x * ahead, y: pos.y + dir.y * ahead };
      if (!isWall(cell.x, cell.y)) return { x: (cell.x + COLS) % COLS, y: cell.y };
    }
  }
  return pos;
}

function moveApe(state: GameState, ape: Ape, playerDist: Int16Array, events: GameEvent[]) {
  ape.prev = ape.pos;
  const reverse = { x: -ape.dir.x, y: -ape.dir.y };
  let options = ALL_DIRS.filter((d) => canMove(ape.pos, d) && !same(d, reverse));
  if (options.length === 0) options = ALL_DIRS.filter((d) => canMove(ape.pos, d));
  if (options.length === 0) return;

  let choice: Point;
  if (ape.frightened || (ape.personality === "wanderer" && state.random() < 0.5)) {
    if (ape.frightened && state.random() >= 0.2) {
      // Run from the human.
      choice = options.reduce((best, d) =>
        distanceAt(playerDist, step(ape.pos, d)) > distanceAt(playerDist, step(ape.pos, best)) ? d : best
      );
    } else {
      choice = options[Math.floor(state.random() * options.length)];
    }
  } else {
    const target = apeTarget(state, ape);
    const dist = same(target, state.player.pos) ? playerDist : distancesFrom(target);
    let best = Infinity;
    choice = options[0];
    for (const d of options) {
      const value = distanceAt(dist, step(ape.pos, d));
      if (value !== -1 && (value < best || (value === best && state.random() < 0.5))) {
        best = value;
        choice = d;
      }
    }
  }

  ape.dir = choice;
  ape.pos = step(ape.pos, choice);
  resolveContact(state, events);
}

/** Advances the game by `elapsedMs` and returns what happened. */
export function update(state: GameState, elapsedMs: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== "playing") return events;

  state.invulnerableMs = Math.max(0, state.invulnerableMs - elapsedMs);
  if (state.powerMs > 0) {
    state.powerMs = Math.max(0, state.powerMs - elapsedMs);
    if (state.powerMs === 0) for (const ape of state.apes) ape.frightened = false;
  }
  state.pelletTimersMs = state.pelletTimersMs.map((ms) => ms - elapsedMs);
  while (state.pelletTimersMs.length > 0 && state.pelletTimersMs[0] <= 0) {
    state.pelletTimersMs.shift();
    placePellet(state);
  }

  const player = state.player;
  player.stepMs += elapsedMs;
  while (player.stepMs >= PLAYER_STEP_MS && state.phase === "playing") {
    player.stepMs -= PLAYER_STEP_MS;
    const livesBefore = state.lives;
    movePlayer(state, events);
    if (state.lives !== livesBefore) player.stepMs = 0;
  }

  const livesBeforeApes = state.lives;
  for (const ape of state.apes) {
    // Stop once the round ends or a caught human resets the board.
    if (state.phase !== "playing" || state.lives !== livesBeforeApes) break;
    if (ape.respawnMs > 0) {
      ape.respawnMs = Math.max(0, ape.respawnMs - elapsedMs);
      if (ape.respawnMs === 0) {
        const home = farthestHome(state);
        ape.pos = { ...home };
        ape.prev = { ...home };
        ape.dir = STILL;
        ape.stepMs = 0;
      }
      continue;
    }
    ape.stepMs += elapsedMs;
    const interval = apeStepMs(state, ape);
    while (ape.stepMs >= interval && state.phase === "playing") {
      ape.stepMs -= interval;
      moveApe(state, ape, distancesFrom(player.pos), events);
      if (state.lives !== livesBeforeApes) break;
    }
  }

  return events;
}
