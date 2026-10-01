/**
 * Renders house templates, contact sheets, and WebP files in headless Chrome, driven over the DevTools protocol
 * with Node built-ins only. A local server hands Chrome the page, the templates (TypeScript, with types stripped on
 * the fly), fonts, and images from the allowed roots.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import * as nodeModule from "node:module";
import { FONTS_DIR, TOOL_DIR, log } from "./config.ts";

const CHROME = process.env.CHAOS_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TERMINAL_FONTS = "/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts";

/** Fonts the templates use. Bebas Neue is cached from Google Fonts; the rest ship with macOS. */
const FONT_FILES: Record<string, string> = {
  "BebasNeue.woff2": path.join(FONTS_DIR, "BebasNeue.woff2"),
  "SFMono-Medium.otf": path.join(TERMINAL_FONTS, "SF-Mono-Medium.otf"),
  "SFMono-Bold.otf": path.join(TERMINAL_FONTS, "SF-Mono-Bold.otf"),
  "ArialBlack.ttf": "/System/Library/Fonts/Supplemental/Arial Black.ttf",
};

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

/** Downloads Bebas Neue (SIL Open Font License) once and caches it for offline renders. */
export async function ensureFonts(): Promise<void> {
  const target = FONT_FILES["BebasNeue.woff2"];
  if (fs.existsSync(target)) return;
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  const css = await (
    await fetch("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36" },
      signal: AbortSignal.timeout(20_000),
    })
  ).text();
  // The last @font-face block is the basic Latin subset.
  const urls = [...css.matchAll(/src:\s*url\((https:[^)]+\.woff2)\)/g)].map((m) => m[1]);
  if (!urls.length) throw new Error("could not find Bebas Neue in the Google Fonts CSS");
  const font = await fetch(urls[urls.length - 1], { signal: AbortSignal.timeout(20_000) });
  fs.writeFileSync(target, Buffer.from(await font.arrayBuffer()));
  log("cached Bebas Neue");
}

type Strip = (code: string) => string;
const stripTypes = (nodeModule as unknown as { stripTypeScriptTypes: Strip }).stripTypeScriptTypes;

export type Renderer = {
  /** Calls `render(spec)` in the page and returns the encoded image. */
  render(spec: object): Promise<Buffer>;
  close(): Promise<void>;
};

/**
 * Starts the server and Chrome. `roots` maps URL prefixes to directories Chrome may read images from,
 * e.g. { run: "/…/runs/2026-09-29", site: "/…/public" } serves /run/… and /site/….
 */
export async function openRenderer(roots: Record<string, string>): Promise<Renderer> {
  await ensureFonts();
  const renderDir = path.join(TOOL_DIR, "render");
  const templates = stripTypes(fs.readFileSync(path.join(renderDir, "templates.ts"), "utf8"));

  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const send = (status: number, body: Buffer | string, type = "text/plain") => {
      res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(body);
    };
    if (url === "/" || url === "/page.html") return send(200, fs.readFileSync(path.join(renderDir, "page.html")), MIME[".html"]);
    if (url === "/templates.js") return send(200, templates, "text/javascript");
    const [, prefix, ...rest] = url.split("/");
    let file: string | undefined;
    if (prefix === "fonts") file = FONT_FILES[rest.join("/")];
    else if (roots[prefix]) {
      const candidate = path.resolve(roots[prefix], rest.join("/"));
      if (candidate.startsWith(path.resolve(roots[prefix]) + path.sep)) file = candidate;
    }
    if (!file || !fs.existsSync(file)) return send(404, "not found");
    send(200, fs.readFileSync(file), MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chaos-chrome-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  // Chrome prints the DevTools address on stderr once it is listening.
  const browserUrl = await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 30_000);
    chrome.stderr.on("data", (chunk: Buffer) => {
      buffer += chunk;
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on("error", reject);
  });
  const httpBase = browserUrl.replace(/^ws:\/\/([^/]+)\/.*$/, "http://$1");
  const targets = (await (await fetch(`${httpBase}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("Chrome opened no page");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.onopen = () => resolve();
    socket.onerror = () => reject(new Error("could not connect to Chrome"));
  });
  let nextId = 0;
  const pending = new Map<number, (message: { result?: { result?: { value?: unknown }; exceptionDetails?: unknown } }) => void>();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  };
  const call = (method: string, params: object = {}) =>
    new Promise<{ result?: { result?: { value?: unknown }; exceptionDetails?: unknown } }>((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression: string): Promise<unknown> => {
    const message = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (message.result?.exceptionDetails) throw new Error(`render failed: ${JSON.stringify(message.result.exceptionDetails).slice(0, 600)}`);
    return message.result?.result?.value;
  };

  await call("Page.navigate", { url: `http://127.0.0.1:${port}/page.html` });
  for (let attempt = 0; ; attempt++) {
    const state = String(await evaluate("JSON.stringify({ ready: window.READY === true, error: window.ERROR ?? null })").catch(() => "{}"));
    const parsed = JSON.parse(state || "{}") as { ready?: boolean; error?: string | null };
    if (parsed.error) throw new Error(`render page: ${parsed.error}`);
    if (parsed.ready) break;
    if (attempt > 300) throw new Error("render page never became ready");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    async render(spec: object): Promise<Buffer> {
      const dataUrl = await evaluate(`render(${JSON.stringify(spec)})`);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) throw new Error("render returned no image");
      return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    },
    async close(): Promise<void> {
      socket.close();
      server.close();
      // Chrome keeps writing to its profile while it dies; removing the folder before it exits fails with ENOTEMPTY.
      const exited = chrome.exitCode !== null || chrome.signalCode !== null ? Promise.resolve() : new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGKILL");
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
      // A leftover temp folder is harmless, so cleanup never fails the run.
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (error) {
        log(`could not remove ${profile}: ${(error as Error).message}`);
      }
    },
  };
}
