// Run, Human, Run! rules: a human, a maze, UBI credits, Touch Grass pellets and apes.
// No React or canvas here: the component feeds in input and elapsed time, then draws the state.

export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Phase = "ready" | "playing" | "won" | "lost";
export type GameEvent = "credit" | "power" | "ape-eaten" | "life-lost" | "won" | "lost";
type Personality = "chaser" | "ambusher" | "wanderer";

// Movers sit on `pos` and are partway (stepMs) into the step toward pos + dir,
// so what's drawn is where they really are, never a cell behind.
export type Player = {
  pos: Point;
  dir: Point;
  wanted: Point | null; // buffered turn, taken at the next junction that allows it
  wantedMs: number; // how long the buffered turn has left before it's dropped
  stepMs: number;
};

export type Ape = {
  pos: Point;
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
// Caught (or an ape eaten) when the two are this close, in cells, measured where they're drawn.
const CONTACT_CELLS = 0.75;
// Long frames run as slices this long, so nothing moves far enough between contact checks to slip past.
const MAX_SLICE_MS = 20;
// A turn pressed just after passing a junction still takes it (the human snaps back to the junction).
const TURN_GRACE_MS = 50;
// A turn pressed before a junction waits this long for one, then is dropped so it can't fire somewhere unexpected.
const TURN_BUFFER_MS = 400;
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
    player: { pos: { ...PLAYER_START }, dir: STILL, wanted: null, wantedMs: 0, stepMs: 0 },
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

const isReverse = (a: Point, b: Point) => !isStill(a) && a.x === -b.x && a.y === -b.y;

/** Turns a mover around mid-step, so it heads back from exactly where it is. */
function turnAround(mover: { pos: Point; dir: Point; stepMs: number }, stepMs: number) {
  mover.pos = step(mover.pos, mover.dir);
  mover.dir = { x: -mover.dir.x, y: -mover.dir.y };
  mover.stepMs = Math.max(0, stepMs - mover.stepMs);
}

/** Arrow key, swipe or D-pad press. The first one starts the round. */
export function setDirection(state: GameState, direction: Direction) {
  if (state.phase === "ready") state.phase = "playing";
  if (state.phase !== "playing") return;
  const player = state.player;
  const want = DIRECTIONS[direction];
  player.wanted = null;
  if (same(want, player.dir)) return;

  const moving = canMove(player.pos, player.dir);
  if (moving && isReverse(want, player.dir)) {
    turnAround(player, PLAYER_STEP_MS);
  } else if (canMove(player.pos, want) && (!moving || player.stepMs <= TURN_GRACE_MS)) {
    // Standing still, or only just past a junction: turn now.
    player.dir = want;
    player.stepMs = 0;
  } else {
    player.wanted = want;
    player.wantedMs = TURN_BUFFER_MS;
  }
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
  player.dir = STILL;
  player.wanted = null;
  player.stepMs = 0;
  state.invulnerableMs = INVULNERABLE_MS;
  // Apes go back to the corners, farthest first.
  const used: Point[] = [];
  for (const ape of state.apes) {
    const home = farthestHome(state, used);
    used.push(home);
    ape.pos = { ...home };
    ape.dir = STILL;
    ape.stepMs = 0;
  }
}

/** Where a mover is right now, in cells: on its cell, partway toward the next. Drawing uses this too. */
export function moverPosition(pos: Point, dir: Point, progress: number): Point {
  const t = Math.min(1, Math.max(0, progress));
  return { x: pos.x + dir.x * t, y: pos.y + dir.y * t };
}

export function playerPosition(state: GameState): Point {
  const { pos, dir, stepMs } = state.player;
  return moverPosition(pos, dir, stepMs / PLAYER_STEP_MS);
}

export function apePosition(state: GameState, ape: Ape): Point {
  return moverPosition(ape.pos, ape.dir, ape.stepMs / apeStepMs(state, ape));
}

/** Distance in cells between two movers, the short way through the tunnel. */
function gap(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  return Math.min(dx, COLS - dx) + Math.abs(a.y - b.y);
}

/**
 * Checked every slice against where things are drawn, so a turn-around never
 * counts you on a cell you were backing away from, and nobody passes through.
 */
function resolveContact(state: GameState, events: GameEvent[]) {
  const human = playerPosition(state);
  for (const ape of state.apes) {
    if (ape.respawnMs > 0 || gap(human, apePosition(state, ape)) >= CONTACT_CELLS) continue;
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

/** The human reaches the next cell, picks up what's there, and takes a buffered turn if it fits. */
function movePlayer(state: GameState, events: GameEvent[]) {
  const player = state.player;
  if (!canMove(player.pos, player.dir)) return;
  player.pos = step(player.pos, player.dir);
  if (player.wanted && canMove(player.pos, player.wanted)) {
    player.dir = player.wanted;
    player.wanted = null;
  }

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
      // The tell: every ape turns around.
      if (canMove(ape.pos, ape.dir)) turnAround(ape, apeStepMs(state, ape));
    }
  }
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

/** The ape reaches the next cell, then picks where to head from there. */
function moveApe(state: GameState, ape: Ape, playerDist: Int16Array) {
  if (canMove(ape.pos, ape.dir)) ape.pos = step(ape.pos, ape.dir);
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
}

/** Advances the game by `elapsedMs` and returns what happened. */
export function update(state: GameState, elapsedMs: number): GameEvent[] {
  const events: GameEvent[] = [];
  let remaining = elapsedMs;
  while (remaining > 0 && state.phase === "playing") {
    const slice = Math.min(MAX_SLICE_MS, remaining);
    remaining -= slice;
    tick(state, slice, events);
  }
  return events;
}

function tick(state: GameState, elapsedMs: number, events: GameEvent[]) {
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
  if (player.wanted) {
    player.wantedMs -= elapsedMs;
    if (player.wantedMs <= 0) player.wanted = null;
  }
  if (canMove(player.pos, player.dir)) {
    player.stepMs += elapsedMs;
    while (player.stepMs >= PLAYER_STEP_MS && state.phase === "playing") {
      player.stepMs -= PLAYER_STEP_MS;
      movePlayer(state, events);
      if (!canMove(player.pos, player.dir)) {
        player.stepMs = 0; // up against a wall: stand still
        break;
      }
    }
  } else {
    player.stepMs = 0;
  }
  if (state.phase !== "playing") return;

  for (const ape of state.apes) {
    if (ape.respawnMs > 0) {
      ape.respawnMs = Math.max(0, ape.respawnMs - elapsedMs);
      if (ape.respawnMs === 0) {
        const home = farthestHome(state);
        ape.pos = { ...home };
        ape.dir = STILL;
        ape.stepMs = 0;
      }
      continue;
    }
    if (!canMove(ape.pos, ape.dir)) {
      // Standing (just placed, or facing a wall): pick a way to go right away.
      ape.stepMs = 0;
      moveApe(state, ape, distancesFrom(player.pos));
      continue;
    }
    ape.stepMs += elapsedMs;
    const interval = apeStepMs(state, ape);
    while (ape.stepMs >= interval) {
      ape.stepMs -= interval;
      moveApe(state, ape, distancesFrom(player.pos));
    }
  }

  resolveContact(state, events);
}
