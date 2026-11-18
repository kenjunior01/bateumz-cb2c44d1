// Probe visual: estrada renderiza? (v65 — lição do winding)
import { spawn, spawnSync } from "node:child_process";
const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const filhos = [];
const correr = (cmd, args) => {
  const p = spawn(cmd, args, { cwd: RAIZ, stdio: ["ignore", "pipe", "pipe"], detached: true });
  filhos.push(p); return p;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarAte(url, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { try { const r = await fetch(url); if (r.status < 500) return true; } catch {} await dormir(300); }
  return false;
}
const matar = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
try {
  spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" });
  correr("npx", ["vite", "--port", "8099", "--strictPort"]);
  console.log("vite:", await esperarAte(`${BASE}/lives?game=kart`));
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("bateu_kart_save", JSON.stringify({ moedas: 3000, xp: 0, kart: "viralata", possuidos: ["viralata"], melhorias: { "viralata.motor": 2 }, recordes: {}, corridas: 0, vitorias: 0, ts: 0 })); } catch {} });
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60000 });
  await dormir(2500);
  await pg.screenshot({ path: "shots-v65/kart-menu.png" });
  await pg.locator('[data-testid="kart-entrar"]').click();
  await pg.waitForSelector('[data-testid="kart-jogo"]', { timeout: 30000 });
  // espera o fim da contagem e conduz 4 s
  for (let i = 0; i < 30; i++) { const f = await pg.evaluate(() => window.__kart?.estado()?.fase).catch(() => ""); if (f === "corrida") break; await dormir(500); }
  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  await dormir(5000);
  await pg.screenshot({ path: "shots-v65/kart-corrida-estrada.png" });
  const st = await pg.evaluate(() => window.__kart.estado());
  console.log("estado:", JSON.stringify({ fase: st.fase, vel: st.vel, volta: st.volta, moedas: st.moedas }));
  await browser.close();
} finally { matar(); spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); }
process.exit(0);
