// Debug recording for Run, Human, Run! (turned on with ?debug=1).
// A round is recorded as its random seed, every input and every frame's length,
// which is enough to replay it exactly through the engine (see `replayRound`).

import {
  apeStepMs,
  createGame,
  setDirection,
  update,
  type Direction,
  type GameEvent,
  type GameState,
  type Phase,
  type Point,
} from "./engine";

// A long pause (a hidden tab, a breakpoint) shouldn't fast-forward the game.
const MAX_FRAME_MS = 100;

/** Elapsed time handed to the engine for one frame. Shared by the game loop and replay so they can't drift. */
export function frameStep(rawMs: number): number {
  // A frame's timestamp can be slightly earlier than the loop's start, so never go negative.
  return Math.min(MAX_FRAME_MS, Math.max(0, rawMs));
}

/** mulberry32: a small seeded generator, so a recorded round replays the same credits and ape choices. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type InputSource = "key" | "swipe" | "pad";

export type Snapshot = {
  phase: Phase;
  credits: number;
  lives: number;
  powerMs: number;
  invulnerableMs: number;
  player: { pos: Point; dir: Point; wanted: Point | null; stepMs: number };
  apes: { pos: Point; dir: Point; personality: string; frightened: boolean; respawnMs: number; stepMs: number; intervalMs: number }[];
  creditCells: Point[];
  pelletCells: Point[];
};

export type DebugRound = {
  startedAt: string;
  seed: number;
  creditsToWin: number;
  /** Raw time between frames, before `frameStep`. Frame i is the engine's i-th update. */
  frameMs: number[];
  /** `frame` is how many updates had run when the input arrived; replay applies it before update `frame`. */
  inputs: { frame: number; dir: Direction; source: InputSource }[];
  marks: { frame: number; snapshot: Snapshot }[];
  events: { frame: number; event: GameEvent }[];
  result: Phase | "quit";
};

export type DebugLog = {
  version: 1;
  page: string;
  userAgent: string;
  screen: { width: number; height: number; pixelRatio: number; canvasCssWidth: number; canvasCssHeight: number };
  notes: string;
  rounds: DebugRound[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function snapshot(game: GameState): Snapshot {
  const { player } = game;
  return {
    phase: game.phase,
    credits: game.creditsCollected,
    lives: game.lives,
    powerMs: round2(game.powerMs),
    invulnerableMs: round2(game.invulnerableMs),
    player: { pos: { ...player.pos }, dir: { ...player.dir }, wanted: player.wanted && { ...player.wanted }, stepMs: round2(player.stepMs) },
    apes: game.apes.map((ape) => ({
      pos: { ...ape.pos },
      dir: { ...ape.dir },
      personality: ape.personality,
      frightened: ape.frightened,
      respawnMs: round2(ape.respawnMs),
      stepMs: round2(ape.stepMs),
      intervalMs: round2(apeStepMs(game, ape)),
    })),
    creditCells: game.credits.map((c) => ({ ...c })),
    pelletCells: game.pellets.map((p) => ({ ...p })),
  };
}

/** Collects rounds while the game runs. */
export class DebugRecorder {
  rounds: DebugRound[] = [];

  private get current(): DebugRound | undefined {
    return this.rounds[this.rounds.length - 1];
  }

  /** Starts a round and returns the seeded random source the game must use. */
  startRound(creditsToWin: number): () => number {
    const current = this.current;
    if (current && current.result === "ready") current.result = "quit";
    const seed = Math.floor(Math.random() * 4294967296);
    this.rounds.push({
      startedAt: new Date().toISOString(),
      seed,
      creditsToWin,
      frameMs: [],
      inputs: [],
      marks: [],
      events: [],
      result: "ready",
    });
    return seededRandom(seed);
  }

  input(dir: Direction, source: InputSource) {
    const current = this.current;
    if (current) current.inputs.push({ frame: current.frameMs.length, dir, source });
  }

  frame(rawMs: number, events: GameEvent[], game: GameState) {
    const current = this.current;
    if (!current || current.result === "won" || current.result === "lost" || current.result === "quit") return;
    const index = current.frameMs.length;
    current.frameMs.push(rawMs); // full precision: rounding here makes replay drift
    for (const event of events) current.events.push({ frame: index, event });
    current.result = game.phase;
  }

  mark(game: GameState) {
    const current = this.current;
    if (current) current.marks.push({ frame: current.frameMs.length, snapshot: snapshot(game) });
  }

  quit() {
    const current = this.current;
    if (current && (current.result === "ready" || current.result === "playing")) current.result = "quit";
  }

  toLog(notes: string, canvas: HTMLCanvasElement | null): DebugLog {
    const box = canvas?.getBoundingClientRect();
    return {
      version: 1,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        canvasCssWidth: Math.round(box?.width ?? 0),
        canvasCssHeight: Math.round(box?.height ?? 0),
      },
      notes,
      rounds: this.rounds,
    };
  }
}

/**
 * Replays a recorded round through the engine. Calls `onFrame` before each update
 * (after that frame's inputs) and returns the final state.
 */
export function replayRound(
  round: DebugRound,
  onFrame?: (frame: number, game: GameState) => void
): GameState {
  const game = createGame(round.creditsToWin, seededRandom(round.seed));
  let next = 0;
  for (let frame = 0; frame < round.frameMs.length; frame++) {
    while (next < round.inputs.length && round.inputs[next].frame === frame) {
      setDirection(game, round.inputs[next].dir);
      next++;
    }
    onFrame?.(frame, game);
    update(game, frameStep(round.frameMs[frame]));
  }
  return game;
}
