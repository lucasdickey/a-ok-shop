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
  close(): void;
};

/**
 * Starts the server and Chrome. `roots` maps URL prefixes to directories Chrome may read images from,
 * e.g. { run: "/…/runs/2026-09-29", site: "/…/public" } serves /run/… and /site/….
 * Every call into Chrome has a timeout and fails if Chrome goes away, so a stuck render can never hang the daily job.
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
  let socket: WebSocket | null = null;
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    socket?.close();
    chrome.kill("SIGKILL");
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  };

  type Reply = { result?: { result?: { value?: unknown }; exceptionDetails?: unknown } };
  const pending = new Map<number, { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  let nextId = 0;
  const call = (method: string, params: object = {}, timeoutMs = 90_000) =>
    new Promise<Reply>((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return reject(new Error("Chrome is not connected"));
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome did not answer ${method} within ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression: string, timeoutMs = 90_000): Promise<unknown> => {
    const reply = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, timeoutMs);
    if (reply.result?.exceptionDetails) throw new Error(`render failed: ${JSON.stringify(reply.result.exceptionDetails).slice(0, 600)}`);
    return reply.result?.result?.value;
  };

  try {
    // Chrome prints the DevTools address on stderr once it is listening.
    const browserUrl = await new Promise<string>((resolve, reject) => {
      let buffer = "";
      const timer = setTimeout(() => reject(new Error("Chrome did not start")), 30_000);
      const onData = (chunk: Buffer) => {
        buffer += chunk;
        const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) {
          clearTimeout(timer);
          chrome.stderr.off("data", onData);
          resolve(match[1]);
        }
      };
      chrome.stderr.on("data", onData);
      chrome.on("error", reject);
      chrome.on("exit", () => reject(new Error("Chrome exited during startup")));
    });
    const httpBase = browserUrl.replace(/^ws:\/\/([^/]+)\/.*$/, "http://$1");
    const targets = (await (await fetch(`${httpBase}/json/list`, { signal: AbortSignal.timeout(10_000) })).json()) as Array<{
      type: string;
      webSocketDebuggerUrl: string;
    }>;
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("Chrome opened no page");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    socket = ws;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("could not connect to Chrome")), 10_000);
      ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      ws.onerror = () => reject(new Error("could not connect to Chrome"));
    });
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as Reply & { id?: number };
      const waiting = message.id === undefined ? undefined : pending.get(message.id);
      if (!waiting || message.id === undefined) return;
      clearTimeout(waiting.timer);
      pending.delete(message.id);
      waiting.resolve(message);
    };
    ws.onclose = () => {
      for (const waiting of pending.values()) {
        clearTimeout(waiting.timer);
        waiting.reject(new Error("Chrome closed the connection"));
      }
      pending.clear();
    };

    await call("Page.navigate", { url: `http://127.0.0.1:${port}/page.html` });
    // Short probes against a wall-clock deadline: a page that never loads fails in about 30 seconds.
    const deadline = Date.now() + 30_000;
    for (;;) {
      const probe = "JSON.stringify({ ready: window.READY === true, error: window.ERROR ?? null })";
      const state = String(await evaluate(probe, 5_000).catch(() => "{}"));
      const parsed = JSON.parse(state || "{}") as { ready?: boolean; error?: string | null };
      if (parsed.error) throw new Error(`render page: ${parsed.error}`);
      if (parsed.ready) break;
      if (Date.now() > deadline) throw new Error("render page never became ready");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } catch (error) {
    close();
    throw error;
  }

  return {
    async render(spec: object): Promise<Buffer> {
      const dataUrl = await evaluate(`render(${JSON.stringify(spec)})`);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) throw new Error("render returned no image");
      return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    },
    close,
  };
}
