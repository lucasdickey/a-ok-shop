"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { track } from "@/app/lib/analytics";
import { DebugRecorder, frameStep, type InputSource } from "../debug";
import DebugPanel, { type DebugStats } from "./DebugPanel";
import {
  COLS,
  PLAYER_STEP_MS,
  POWER_WARNING_MS,
  ROWS,
  START_LIVES,
  apePosition,
  apeStepMs,
  createGame,
  isWall,
  playerPosition,
  setDirection,
  update,
  type Direction,
  type GameState,
  type Phase,
  type Point,
} from "../engine";

const CELL = 32;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
// How far a finger travels before it counts as a swipe.
const SWIPE_PX = 24;

// Club Receipt colors (tailwind.config.js `club`).
const COLOR = {
  field: "#3155D9",
  wall: "#F4EB4A",
  ink: "#22221E",
  paper: "#F7F3DF",
  gold: "#F8BD2B",
  red: "#C52224",
  grass: "#2E9E4F",
};

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/** 3 credits on a local dev server (to test the reward quickly), 10 everywhere else. */
function creditsToWin(): number {
  const { hostname, port } = window.location;
  return hostname === "localhost" && port.startsWith("3") ? 3 : 10;
}

/** ?debug=1 records rounds for replay and shows timing numbers. */
const isDebug = () => new URLSearchParams(window.location.search).get("debug") === "1";

type Hud = { credits: number; lives: number; powerSeconds: number; phase: Phase };
const hudOf = (game: GameState): Hud => ({
  credits: game.creditsCollected,
  lives: game.lives,
  powerSeconds: Math.ceil(game.powerMs / 1000),
  phase: game.phase,
});
const sameHud = (a: Hud, b: Hud) =>
  a.credits === b.credits && a.lives === b.lives && a.powerSeconds === b.powerSeconds && a.phase === b.phase;

/** The maze never changes, so draw it once. */
function drawMaze(): HTMLCanvasElement {
  const maze = document.createElement("canvas");
  maze.width = WIDTH;
  maze.height = HEIGHT;
  const ctx = maze.getContext("2d");
  if (!ctx) return maze;
  ctx.fillStyle = COLOR.field;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLOR.wall;
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 2;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isWall(x, y)) continue;
      const left = x * CELL;
      const top = y * CELL;
      ctx.fillRect(left, top, CELL, CELL);
      // Ink only the edges that face the floor, so walls read as one shape.
      ctx.beginPath();
      if (y > 0 && !isWall(x, y - 1)) ctx.moveTo(left, top + 1), ctx.lineTo(left + CELL, top + 1);
      if (y < ROWS - 1 && !isWall(x, y + 1)) ctx.moveTo(left, top + CELL - 1), ctx.lineTo(left + CELL, top + CELL - 1);
      if (x > 0 && !isWall(x - 1, y)) ctx.moveTo(left + 1, top), ctx.lineTo(left + 1, top + CELL);
      if (x < COLS - 1 && !isWall(x + 1, y)) ctx.moveTo(left + CELL - 1, top), ctx.lineTo(left + CELL - 1, top + CELL);
      ctx.stroke();
    }
  }
  return maze;
}

function drawCredit(ctx: CanvasRenderingContext2D, cell: Point) {
  const cx = cell.x * CELL + CELL / 2;
  const cy = cell.y * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.gold;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR.ink;
  ctx.stroke();
  ctx.fillStyle = COLOR.ink;
  ctx.font = "bold 11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("U", cx, cy + 1);
}

/** A Touch Grass pellet: a tuft of three blades that sways. */
function drawPellet(ctx: CanvasRenderingContext2D, cell: Point, now: number) {
  const cx = cell.x * CELL + CELL / 2;
  const base = cell.y * CELL + CELL - 7;
  const sway = Math.sin(now / 250) * 2;
  ctx.fillStyle = COLOR.grass;
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  for (const [offset, height] of [
    [-6, 14],
    [0, 19],
    [6, 14],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset - 4, base);
    ctx.lineTo(cx + offset + sway, base - height);
    ctx.lineTo(cx + offset + 4, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: GameState, now: number) {
  const { player } = game;
  // Blink while protected after a respawn.
  if (game.invulnerableMs > 0 && Math.floor(now / 120) % 2 === 0) return;
  const at = playerPosition(game);
  const cx = at.x * CELL + CELL / 2;
  const cy = at.y * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.paper;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR.ink;
  ctx.stroke();
  // Eyes look where the human is heading.
  const look = { x: player.dir.x * 2, y: player.dir.y * 2 };
  ctx.fillStyle = COLOR.ink;
  ctx.beginPath();
  ctx.arc(cx - 4 + look.x, cy - 3 + look.y, 2, 0, Math.PI * 2);
  ctx.arc(cx + 4 + look.x, cy - 3 + look.y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + look.x, cy + 3 + look.y, 4, 0, Math.PI);
  ctx.stroke();
}

function drawApes(ctx: CanvasRenderingContext2D, game: GameState, now: number) {
  // In the last seconds of Touch Grass, frightened apes flash back to red as a warning.
  const warning = game.powerMs > 0 && game.powerMs < POWER_WARNING_MS && Math.floor(now / 200) % 2 === 0;
  for (const ape of game.apes) {
    if (ape.respawnMs > 0) continue;
    const at = apePosition(game, ape);
    const left = at.x * CELL + 4;
    const top = at.y * CELL + 4;
    const size = CELL - 8;
    const scared = ape.frightened && !warning;
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLOR.ink;
    ctx.fillStyle = scared ? COLOR.paper : COLOR.red;
    // Ears, then head.
    ctx.fillRect(left - 4, top + 6, 5, 8);
    ctx.strokeRect(left - 4, top + 6, 5, 8);
    ctx.fillRect(left + size - 1, top + 6, 5, 8);
    ctx.strokeRect(left + size - 1, top + 6, 5, 8);
    ctx.fillRect(left, top, size, size);
    ctx.strokeRect(left, top, size, size);
    // Muzzle, eyes and pupils (looking where the ape is heading).
    ctx.fillStyle = scared ? COLOR.field : COLOR.paper;
    ctx.fillRect(left + 5, top + 13, size - 10, 8);
    ctx.fillRect(left + 4, top + 5, 6, 6);
    ctx.fillRect(left + size - 10, top + 5, 6, 6);
    ctx.fillStyle = COLOR.ink;
    const px = Math.max(0, ape.dir.x) * 2 + (ape.dir.x === 0 ? 1 : 0);
    const py = Math.max(0, ape.dir.y) * 2 + (ape.dir.y === 0 ? 1 : 0);
    ctx.fillRect(left + 5 + px, top + 6 + py, 3, 3);
    ctx.fillRect(left + size - 9 + px, top + 6 + py, 3, 3);
  }
}

function draw(ctx: CanvasRenderingContext2D, maze: HTMLCanvasElement, game: GameState, now: number) {
  ctx.drawImage(maze, 0, 0);
  for (const credit of game.credits) drawCredit(ctx, credit);
  for (const pellet of game.pellets) drawPellet(ctx, pellet, now);
  drawApes(ctx, game, now);
  drawPlayer(ctx, game, now);
}

type Reward = { status: "idle" | "loading" | "ready" | "error"; code: string; error: string };
const NO_REWARD: Reward = { status: "idle", code: "", error: "" };

/** Run, Human, Run!: collect UBI credits, dodge the agents, win 25% off. */
export default function RunHumanRun() {
  const [target] = useState(creditsToWin);
  const [playing, setPlaying] = useState(false);
  const [hud, setHud] = useState<Hud>({ credits: 0, lives: START_LIVES, powerSeconds: 0, phase: "ready" });
  const [reward, setReward] = useState<Reward>(NO_REWARD);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const swipeFrom = useRef<Point | null>(null);
  const [recorder] = useState(() => (isDebug() ? new DebugRecorder() : null));
  const recentFrames = useRef<number[]>([]); // raw frame lengths, newest last (debug only)
  const pausedRef = useRef(false); // debug only: frozen while a mark's note is written
  const [markPrompt, setMarkPrompt] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const claimReward = useCallback(async () => {
    setReward({ status: "loading", code: "", error: "" });
    try {
      const response = await fetch("/api/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.code !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Couldn't print your code. Try again.");
      }
      setReward({ status: "ready", code: data.code, error: "" });
      track("discount_code_issued", {});
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Couldn't print your code. Try again.";
      track("discount_code_failed", { reason });
      setReward({ status: "error", code: "", error: reason });
    }
  }, []);

  const newRound = useCallback(() => {
    const game = createGame(target, recorder ? recorder.startRound(target) : Math.random);
    gameRef.current = game;
    pausedRef.current = false;
    setMarkPrompt(null);
    setHud(hudOf(game));
    setCopied(false);
  }, [target, recorder]);

  const steer = useCallback(
    (direction: Direction, source: InputSource) => {
      const game = gameRef.current;
      if (!game || pausedRef.current) return;
      recorder?.input(direction, source);
      setDirection(game, direction);
    },
    [recorder]
  );

  // Marking pauses the round until the note is saved, so the moment can be described while it's on screen.
  const markMoment = useCallback(() => {
    const game = gameRef.current;
    if (!recorder || !game || pausedRef.current) return;
    pausedRef.current = true;
    setNoteDraft("");
    setMarkPrompt(recorder.mark(game));
  }, [recorder]);

  const resumeFromMark = (note: string) => {
    recorder?.noteLastMark(note);
    pausedRef.current = false;
    setMarkPrompt(null);
  };

  const readStats = useCallback((): DebugStats => {
    const frames = recentFrames.current;
    const lastSecond: number[] = [];
    for (let i = frames.length - 1, total = 0; i >= 0 && total < 1000; i--) {
      lastSecond.push(frames[i]);
      total += frames[i];
    }
    const game = gameRef.current;
    const ape = game?.apes.find((a) => a.respawnMs === 0);
    const round = recorder?.rounds[recorder.rounds.length - 1];
    return {
      fps: lastSecond.length,
      frameMs: frames[frames.length - 1] ?? 0,
      worstMs: lastSecond.length > 0 ? Math.max(...lastSecond) : 0,
      playerStepMs: PLAYER_STEP_MS,
      apeStepMs: game && ape ? apeStepMs(game, ape) : null,
      frames: round?.frameMs.length ?? 0,
      inputs: round?.inputs.length ?? 0,
      marks: recorder?.rounds.reduce((sum, r) => sum + r.marks.length, 0) ?? 0,
      rounds: recorder?.rounds.length ?? 0,
    };
  }, [recorder]);

  const downloadLog = useCallback(
    (notes: string) => {
      if (!recorder) return;
      const log = recorder.toLog(notes, canvasRef.current);
      const url = URL.createObjectURL(new Blob([JSON.stringify(log)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `run-human-run-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    [recorder]
  );

  // Swipes steer as soon as the finger has moved far enough, so one long
  // drag can turn several corners.
  const onSwipeStart = (event: React.PointerEvent) => {
    swipeFrom.current = { x: event.clientX, y: event.clientY };
  };
  const onSwipeMove = (event: React.PointerEvent) => {
    const from = swipeFrom.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up", "swipe");
    swipeFrom.current = { x: event.clientX, y: event.clientY };
  };
  const onSwipeEnd = () => {
    swipeFrom.current = null;
  };

  const start = () => {
    newRound();
    setPlaying(true);
  };

  // The game loop: runs while the board is on screen.
  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Draw at the screen's pixel density so the board stays sharp.
    const scale = window.devicePixelRatio || 1;
    canvas.width = WIDTH * scale;
    canvas.height = HEIGHT * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const maze = drawMaze();

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const game = gameRef.current;
      if (game && pausedRef.current) {
        // Frozen for a debug note: draw, but don't advance or record.
        draw(ctx, maze, game, now);
      } else if (game) {
        const raw = now - last;
        const events = update(game, frameStep(raw));
        if (recorder) {
          recorder.frame(raw, events, game);
          recentFrames.current.push(raw);
          if (recentFrames.current.length > 240) recentFrames.current.shift();
        }
        if (events.includes("won")) {
          track("game_won", { tokens_collected: game.creditsCollected });
          claimReward();
        }
        draw(ctx, maze, game, now);
        const next = hudOf(game);
        setHud((current) => (sameHud(current, next) ? current : next));
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onKeyDown = (event: KeyboardEvent) => {
      const game = gameRef.current;
      if (!game) return;
      // Typing debug notes shouldn't steer (WASD) or mark.
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      const direction = KEY_DIRECTIONS[event.code];
      if (direction) {
        event.preventDefault(); // keep arrows from scrolling the page
        steer(direction, "key");
        return;
      }
      if (recorder && event.code === "KeyB") {
        event.preventDefault(); // so the b doesn't land in the note box
        markMoment();
        return;
      }
      const ended = game.phase === "won" || game.phase === "lost";
      if (ended && event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        newRound();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Keep the page behind the board from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [playing, claimReward, newRound, steer, markMoment, recorder]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(reward.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy discount code:", error);
    }
  };

  const debugPanel = recorder && <DebugPanel read={readStats} onMark={markMoment} onDownload={downloadLog} />;

  if (!playing) {
    return (
      <div className="border-2 border-dark bg-club-blue p-5 text-club-paper shadow-hard sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="w-[96px] shrink-0 -rotate-6 border-2 border-dark shadow-hard sm:w-[150px]">
            <Image src="/images/a-ok-8bit-retro.png" alt="Pixel-art A-OK ape" width={160} height={160} />
          </div>
          <div>
            <p className="micro">Bonus item / a little detour</p>
            <h2 className="display-heading my-3 text-[44px] sm:text-[64px]">
              Touch grass.
              <br />
              Or dodge agents.
            </h2>
            <p className="text-sm">The apes are on the keys. Grab the credits before they grab you.</p>
          </div>
        </div>

        <div className="receipt-slip mt-8 text-dark">
          <p className="micro border-b border-dashed border-dark pb-3 text-center">How to play</p>
          <p className="receipt-line">
            <span>Move</span>
            <span className="text-right">Arrow keys, WASD or swipe</span>
          </p>
          <p className="receipt-line">
            <span>Collect</span>
            <span className="text-right">{target} UBI credits</span>
          </p>
          <p className="receipt-line">
            <span>Touch grass</span>
            <span className="text-right">Agents turn tail. Catch them.</span>
          </p>
          <p className="receipt-line">
            <span>Lives</span>
            <span>{START_LIVES}</span>
          </p>
          <p className="mt-4 flex justify-between border-t-2 border-dashed border-dark pt-3 font-bold">
            <span>Prize</span>
            <span>25% off</span>
          </p>
        </div>

        <button type="button" onClick={start} className="btn btn-secondary mt-10 min-h-[52px] w-full justify-between sm:w-auto">
          Start running <span aria-hidden="true">↗</span>
        </button>
        {debugPanel}
      </div>
    );
  }

  const ended = hud.phase === "won" || hud.phase === "lost";

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-club-blue-dark/95 p-3 sm:p-6">
      {/* The ticker: credits, lives and Touch Grass time. */}
      <div className="micro flex w-full max-w-[800px] items-center gap-4 border-2 border-dark bg-club-red px-3 py-1 text-club-paper sm:gap-6">
        <span>
          UBI credits <b className="text-base">{String(hud.credits).padStart(2, "0")}/{target}</b>
        </span>
        <span aria-label={`${hud.lives} lives left`}>
          Lives{" "}
          <b className="text-base tracking-widest" aria-hidden="true">
            {"●".repeat(hud.lives)}
            {"○".repeat(Math.max(0, START_LIVES - hud.lives))}
          </b>
        </span>
        {hud.powerSeconds > 0 && (
          <span className="text-club-yellow">
            {/* Lowercase s: the uppercase micro font makes "7S" read as 75. */}
            Touch grass <b className="text-base normal-case">{hud.powerSeconds}s</b>
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            recorder?.quit();
            pausedRef.current = false;
            setMarkPrompt(null);
            setPlaying(false);
          }}
          className="ml-auto min-h-[36px] border-2 border-dark bg-club-paper px-3 font-semibold text-dark shadow-hard-sm"
        >
          Quit
        </button>
      </div>

      <div
        className="relative flex min-h-0 w-full max-w-[800px] flex-1 touch-none items-center justify-center"
        onPointerDown={onSwipeStart}
        onPointerMove={onSwipeMove}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeEnd}
      >
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block h-auto max-h-full w-auto max-w-full border-2 border-dark shadow-hard"
          role="img"
          aria-label={`Run, Human, Run! game board. ${hud.credits} of ${target} credits, ${hud.lives} lives left.`}
        />

        {hud.phase === "ready" && (
          // At the top of the play area: above the board, or over its solid top wall.
          <p className="micro pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap border-2 border-dark bg-club-yellow px-3 py-1 text-dark shadow-hard-sm">
            Arrow key or swipe to run
          </p>
        )}

        {markPrompt !== null && (
          <form
            className="absolute inset-0 z-10 flex items-center justify-center bg-club-blue-dark/50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              resumeFromMark(noteDraft);
            }}
          >
            <div className="receipt-slip w-full max-w-sm text-dark">
              <p className="micro border-b border-dashed border-dark pb-2 text-center">Paused · Mark #{markPrompt}</p>
              <label htmlFor="mark-note" className="mt-3 block text-sm font-semibold">
                What felt off?
              </label>
              <input
                id="mark-note"
                autoFocus
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  // Resume. preventDefault tells the game modal (which closes on Escape) to stay open.
                  event.preventDefault();
                  resumeFromMark(noteDraft);
                }}
                placeholder="e.g. pressed up at the corner, didn't turn"
                className="mt-2 w-full border-2 border-dark bg-club-slip px-2 py-2 text-sm"
              />
              <button type="submit" className="btn btn-primary mt-3 w-full justify-between">
                Save and resume <span aria-hidden="true">↵</span>
              </button>
              <p className="micro mt-2 text-center">Enter saves · Esc resumes</p>
            </div>
          </form>
        )}

        {ended && (
          <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-club-blue-dark/60 p-4">
            <div className="receipt-slip w-full max-w-sm text-dark" role="dialog" aria-modal="false" aria-labelledby="run-result">
              <p className="micro border-b border-dashed border-dark pb-3 text-center">A–OK · UBI credit receipt</p>
              <h3 id="run-result" className="display-heading mt-4 text-5xl">
                {hud.phase === "won" ? "You got out." : "Caught."}
              </h3>
              <p className="receipt-line">
                <span>UBI credits</span>
                <span>
                  {hud.credits}/{target}
                </span>
              </p>
              <p className="receipt-line">
                <span>Lives left</span>
                <span>{hud.lives}</span>
              </p>

              {hud.phase === "won" ? (
                <>
                  <p className="mt-4 flex items-baseline justify-between border-t-2 border-dashed border-dark pt-3 font-bold">
                    <span>Total</span>
                    <span className="display-heading text-3xl text-primary">25% off</span>
                  </p>
                  {reward.status === "ready" && (
                    <div className="mt-4">
                      <div className="barcode h-10 w-full" aria-hidden="true" />
                      {/* ph-no-capture keeps the code out of PostHog's automatic click capture. */}
                      <code className="ph-no-capture mt-2 block text-center font-mono text-lg tracking-widest">
                        {reward.code}
                      </code>
                      <button type="button" onClick={copyCode} className="btn btn-primary mt-4 w-full justify-between">
                        {copied ? "Copied" : "Copy code"} <span aria-hidden="true">⧉</span>
                      </button>
                    </div>
                  )}
                  {reward.status === "loading" && <p className="micro mt-4 text-center">Printing your code…</p>}
                  {reward.status === "error" && (
                    <div className="mt-4">
                      <p className="text-sm text-primary" role="alert">
                        {reward.error}
                      </p>
                      <button type="button" onClick={claimReward} className="btn btn-primary mt-3 w-full justify-between">
                        Try again <span aria-hidden="true">↻</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p
                  className="display-heading pointer-events-none absolute right-4 top-10 rotate-12 border-4 border-primary px-3 py-1 text-4xl text-primary"
                  aria-hidden="true"
                >
                  Void
                </p>
              )}

              <button type="button" onClick={newRound} className="btn btn-outline mt-3 w-full justify-between">
                {hud.phase === "won" ? "Play again" : "Run it back"} <span aria-hidden="true">↺</span>
              </button>
              <p className="micro mt-3 text-center">or press space</p>
            </div>
          </div>
        )}
      </div>

      {/* D-pad for touch screens. pointerdown, not click, so a tap turns at once. */}
      <div className="hidden shrink-0 grid-cols-3 gap-2 [@media(pointer:coarse)]:grid" aria-label="Direction pad">
        {(
          [
            ["up", "↑", "col-start-2"],
            ["left", "←", "col-start-1 row-start-2"],
            ["right", "→", "col-start-3 row-start-2"],
            ["down", "↓", "col-start-2 row-start-3"],
          ] as const
        ).map(([direction, arrow, place]) => (
          <button
            key={direction}
            type="button"
            aria-label={`Move ${direction}`}
            onPointerDown={(event) => {
              event.preventDefault();
              steer(direction, "pad");
            }}
            className={`${place} flex h-14 w-14 touch-none select-none items-center justify-center border-2 border-dark bg-club-yellow text-2xl font-bold text-dark shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
          >
            {arrow}
          </button>
        ))}
      </div>
      {debugPanel}
    </div>
  );
}
