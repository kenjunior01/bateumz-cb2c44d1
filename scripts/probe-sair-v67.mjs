// Sonda de diagnóstico: menu → corrida → pausa → sair → menu (porque falhou?)
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const filhos = [];
function correr(cmd, args) {
  const p = spawn(cmd, args, { cwd: RAIZ, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => console.log(`[${cmd}]`, String(d).trim().slice(0, 120)));
  filhos.push(p);
  return p;
}
const matar = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(url, ms = 60000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { try { const r = await fetch(url); if (r.status < 500) return true; } catch {} await dormir(300); }
  return false;
}

const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"]);
console.log("vite:", await esperar(`${BASE}/lives?game=kart`));
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const pg = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
pg.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
pg.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERRO:", m.text().slice(0, 220)); });
await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded" });
await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60000 });
console.log("menu ok");
await pg.locator('[data-testid="kart-entrar"]').click();
await pg.waitForSelector('[data-testid="kart-canvas"]', { timeout: 30000 });
await pg.evaluate(() => window.__kart.dirigirAuto(true));
await dormir(3000);
console.log("estado:", JSON.stringify(await pg.evaluate(() => window.__kart.estado())).slice(0, 220));
await pg.locator('[data-testid="kart-pausa"]').click();
await dormir(600);
console.log("modal pausa:", await pg.locator('[data-testid="kart-pausa-modal"]').count());
await pg.locator('[data-testid="kart-sair-pausa"]').click();
await dormir(1500);
console.log("kart-menu após sair:", await pg.locator('[data-testid="kart-menu"]').count());
console.log("kart-jogo ainda:", await pg.locator('[data-testid="kart-jogo"]').count());
await pg.screenshot({ path: "shots-v67/probe-sair.png" });
await browser.close();
matar(); spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" });
process.exit(0);
