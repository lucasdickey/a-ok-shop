// Drive headless Chromium over the DevTools protocol (Node built-ins only), capture every frame,
// and encode with ffmpeg. The server serves the repository root, so the film reads the shop's own
// photos (public/) and catalog (product-catalog.json).
//   node capture.mjs [--frames 0-959] [--only 10,112,300] [--png DIR] [--png-every N] [--mp4 FILE] [--audio FILE]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '../../../..');
const PAGE = '/' + path.relative(REPO, path.join(import.meta.dirname, 'index.html')).split(path.sep).join('/');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [VW, VH] = [1920, 1080];
const [F0, F1] = arg('--frames', '0-959').split('-').map(Number);
const ONLY = arg('--only') ? arg('--only').split(',').map(Number) : null;
const PNG_DIR = arg('--png'), MP4 = arg('--mp4'), AUDIO = arg('--audio'), PNG_EVERY = Number(arg('--png-every', '1'));
const PORT = 8000 + Math.floor(Math.random() * 900), DBG = 9300 + Math.floor(Math.random() * 600);
const CHROME = process.env.CHROME || [
  '/opt/pw-browsers/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(REPO, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(REPO + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aok-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, `--window-size=${VW},${VH}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--disable-dev-shm-usage', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} server.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

async function getJSON(u) { for (let i = 0; i < 100; i++) { try { return await (await fetch(u)).json(); } catch { await new Promise(r => setTimeout(r, 150)); } } throw new Error('devtools unavailable'); }
const targets = await getJSON(`http://127.0.0.1:${DBG}/json/list`);
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 1500));
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${PAGE}` });
const t0 = Date.now();
for (;;) {
  const st = await evaluate('JSON.stringify({ready: window.READY === true, err: window.ERROR || null})').catch(() => '{}');
  const s = JSON.parse(st || '{}');
  if (s.err) { console.error('PAGE ERROR\n' + s.err); process.exit(1); }
  if (s.ready) break;
  if (Date.now() - t0 > 180000) { console.error('timeout waiting for READY'); process.exit(1); }
  await new Promise(r => setTimeout(r, 200));
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

let ff = null;
if (MP4) {
  const enc = MP4.endsWith('.mkv')
    ? ['-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgr0']                      // lossless intermediate
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];   // quick preview
  ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', ...enc, MP4], { stdio: ['pipe', 'inherit', 'inherit'] });
}
if (PNG_DIR) fs.mkdirSync(PNG_DIR, { recursive: true });
const frames = ONLY || Array.from({ length: F1 - F0 + 1 }, (_, i) => F0 + i);
const tStart = Date.now();
for (const f of frames) {
  await evaluate(`renderFrame(${f})`);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: VW, height: VH, scale: 1 }, captureBeyondViewport: false });
  const buf = Buffer.from(shot.data, 'base64');
  if (PNG_DIR && (ONLY || f % PNG_EVERY === 0)) fs.writeFileSync(path.join(PNG_DIR, `f${String(f).padStart(3, '0')}.png`), buf);
  if (ff && !ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 30 === 0 || ONLY) process.stdout.write(`frame ${f}  ${((Date.now() - tStart) / 1000).toFixed(1)}s\n`);
}
if (AUDIO) {
  const b64 = await evaluate('renderAudio()');
  if (b64) { fs.writeFileSync(AUDIO, Buffer.from(b64, 'base64')); console.log('audio written', AUDIO); }
}
if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('video written', MP4); }
console.log(`done ${frames.length} frames in ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
cleanup(); process.exit(0);
