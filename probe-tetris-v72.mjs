import { spawn, spawnSync } from "node:child_process";
const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const filhos = [];
function correr(cmd, args) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: process.env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stderr.on("data", () => {});
  filhos.push(p);
  return p;
}
const matarTodos = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
function limparZumbis() { try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {} }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarAte(url, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { try { const r = await fetch(url); if (r.status < 500) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}

limparZumbis();
const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"]);
await esperarAte(`${BASE}/`);
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();
const NOISE = ["navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture", "401", "same key", "validateDOMNesting", "autoplay", "400"];
pg.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 400)));
pg.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) console.log("CONSOLE:", m.text().slice(0, 300)); });
await pg.goto(`${BASE}/lives?game=tetris`, { waitUntil: "domcontentloaded", timeout: 90000 });
await pg.waitForSelector('[data-testid="tetris-comecar"]', { timeout: 60000 });
console.log("CARREGOU");
await pg.locator('[data-testid="tetris-comecar"]').click();
await dormir(1200);
await pg.keyboard.press(" ");
await dormir(800);
console.log("PAUSA:", await pg.locator('[data-testid="tetris-pausa"]').innerText());
await pg.locator('[data-testid="tetris-pausa"]').click();
await dormir(500);
await pg.locator('[data-testid="tetris-pausa"]').click();
await dormir(500);
console.log("PONTOS:", await pg.evaluate(() => document.querySelector('[data-testid="tetris-pontos"]')?.textContent));
await browser.close();
matarTodos();
setTimeout(() => process.exit(0), 200);
