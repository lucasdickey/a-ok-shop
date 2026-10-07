// Render code-drawn monkeys in headless Chrome (Node built-ins only).
//   node render.mjs 0413 0414 0415
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const ROOT = import.meta.dirname, ids = process.argv.slice(2);
const PORT = 8100 + Math.floor(Math.random() * 800), DBG = 9400 + Math.floor(Math.random() * 500);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const done = code => { try { chrome.kill('SIGKILL'); } catch {} server.close(); fs.rmSync(profile, { recursive: true, force: true }); process.exit(code); };
let targets; for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json(); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let seq = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => { const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 800)); return m.result?.result?.value; };
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
for (let i = 0; ; i++) {
  const s = JSON.parse(await evaluate('JSON.stringify({r: window.READY === true, e: window.ERROR || null})').catch(() => '{}') || '{}');
  if (s.e) { console.error(s.e); done(1); } if (s.r) break; if (i > 300) { console.error('timeout'); done(1); }
  await new Promise(r => setTimeout(r, 100));
}
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
for (const id of ids) {
  const url = await evaluate(`renderMonkey('${id}')`);
  fs.writeFileSync(path.join(ROOT, 'out', `${id}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log('rendered', id);
}
done(0);
