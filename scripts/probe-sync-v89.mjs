import { spawn } from "node:child_process";
const BASE = "http://localhost:8099";
let vite = null;
async function levantarVite() {
  try { const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) }); if (r.ok) return; } catch {}
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], { cwd: process.cwd(), stdio: "ignore", detached: true });
  for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 500)); try { const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) }); if (r.ok) return; } catch {} }
  throw new Error("vite não subiu");
}
(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const pg = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await pg.goto(BASE + "/lives", { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(6000);
  const hero0 = await pg.locator('[data-testid="progressao-hero-pontos"]').innerText();
  const st0 = await pg.evaluate(() => localStorage.getItem("bateu_progressao_v78"));
  console.log("hero antes:", hero0, "| store:", (st0 || "").slice(0, 60));
  await pg.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } })));
  await pg.waitForTimeout(700);
  const hero1 = await pg.locator('[data-testid="progressao-hero-pontos"]').innerText();
  const st1 = await pg.evaluate(() => localStorage.getItem("bateu_progressao_v78"));
  console.log("hero após partida:", hero1, "| store:", (st1 || "").slice(0, 60));
  // evento manual — o ouvinte está vivo?
  await pg.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:progressao")));
  await pg.waitForTimeout(700);
  const hero2 = await pg.locator('[data-testid="progressao-hero-pontos"]').innerText();
  console.log("hero após evento manual:", hero2);
  // quantos ouvintes? instrumentar addEventListener não dá retroativo — testar removeEventListener implícito
  const counts = await pg.evaluate(() => ({
    heroExiste: !!document.querySelector('[data-testid="progressao-hero"]'),
    painelExiste: !!document.querySelector('[data-testid="painel-progressao"]'),
  }));
  console.log(counts, "| erros:", erros.length, erros.slice(0, 2));
  await browser.close();
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  process.exit(0);
})().catch((e) => { console.error(e); if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {} process.exit(1); });
