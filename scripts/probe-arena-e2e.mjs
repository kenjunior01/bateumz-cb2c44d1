// Probe de diagnóstico do E2E da arena (não é a suíte — só diagnostica)
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => console.log(`[${cmd}]`, String(d).trim().slice(0, 200)));
  p.stderr.on("data", (d) => console.log(`[${cmd}!]`, String(d).trim().slice(0, 200)));
  filhos.push(p);
  return p;
}
const matarTodos = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
spawnSync("pkill", ["-f", "vite --port 8099"], { stdio: "ignore" });
spawnSync("pkill", ["-f", "server/arena-servidor.mjs"], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = correr("node", ["server/arena-servidor.mjs"], { PORT: "8766" });
const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
await dormir(2500);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const pg = await browser.newPage({ viewport: { width: 1360, height: 900 } });
pg.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
pg.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log(`CONSOLE.${m.type()}:`, m.text().slice(0, 300)); });

await pg.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pg.waitForSelector('[data-testid="arena-menu"]', { timeout: 30000 });
await pg.locator('[data-testid="arena-campeao-vex"]').click();
await pg.locator('[data-testid="arena-nome"]').fill("Debug-X");
await pg.locator('[data-testid="arena-entrar"]').click();
await pg.waitForSelector('[data-testid="arena-jogo"]', { timeout: 20000 });
await dormir(3000);

console.log("== estado 1:", JSON.stringify(await pg.evaluate(() => ({ g: !!window.__arena, mp: window.__arena?.mpEstado(), solo: window.__arena?.solo(), est: window.__arena?.estado() }))));
for (let i = 0; i < 15; i++) {
  await dormir(2000);
  const e = await pg.evaluate(() => ({ mp: window.__arena.mpEstado(), solo: window.__arena.solo() })).catch((e) => ({ erro: String(e).slice(0, 80) }));
  console.log(`  t+${(i + 1) * 2}s`, JSON.stringify(e));
}
const antes = await pg.evaluate(() => window.__arena.estado());
await pg.evaluate(() => window.__arena.andarPara(-60, 60));
for (let i = 0; i < 4; i++) {
  await dormir(800);
  const e = await pg.evaluate(() => window.__arena.estado());
  console.log(`  mov t+${(i + 1) * 0.8}s pos=(${e.x},${e.z}) fps=${e.fps} anim=${e.anim}`);
}
await pg.screenshot({ path: "shots-v63/debug-jogo.png" });

// segundo motor? StrictMode pode deixar dois canvases
console.log("== canvases:", await pg.evaluate(() => document.querySelectorAll("canvas").length));
console.log("== webgl:", await pg.evaluate(() => { const c = document.querySelector('[data-testid="arena-canvas"]'); return !!c && !!c.getContext; }));

await browser.close();
matarTodos();
process.exit(0);
