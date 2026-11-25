// probe-v89 — prova visual rápida das superfícies alteradas (não é a suíte)
// 1600×900 e 1280×800 no hub /lives, 1600×900 na home /, 390×844 telemóvel.
import { spawn } from "node:child_process";
import fs from "node:fs";

const BASE = "http://localhost:8099";
const OUT = "shots-v89";
fs.mkdirSync(OUT, { recursive: true });

let vite = null;
async function levantarVite() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok) { console.log("vite já em :8099"); return; }
  } catch { /* não está a correr */ }
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], {
    cwd: process.cwd(), stdio: "ignore", detached: true,
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch { /* ainda a subir */ }
  }
  throw new Error("vite não subiu em :8099");
}

const erros = [];
async function navegar(page, url, waitMs = 4500) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(waitMs);
}

(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // 1. hub 1600×900
  const p1 = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  p1.on("pageerror", (e) => erros.push("hub1600: " + String(e)));
  await navegar(p1, "/lives", 6000);
  const over1 = await p1.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log("hub1600 overflowX:", over1);
  const heroBox = await p1.locator('[data-testid="progressao-hero"]').boundingBox().catch(() => null);
  console.log("progressao-hero box:", heroBox && { y: Math.round(heroBox.y), h: Math.round(heroBox.height) });
  const kartPontos = await p1.locator('[data-testid="livehub-hero-kart-pontos"]').innerText().catch(() => "AUSENTE");
  console.log("kart pontos:", kartPontos);
  for (const id of ["tetris", "spaceshooter", "chess"]) {
    const info = await p1.locator(`[data-testid="livehub-hero-atalho-info-${id}"]`).innerText().catch(() => "AUSENTE");
    console.log(`atalho ${id}:`, info);
  }
  const pontosFull = await p1.locator('[data-testid="progressao-pontos"]').innerText().catch(() => "AUSENTE");
  const pontosHero = await p1.locator('[data-testid="progressao-hero-pontos"]').innerText().catch(() => "AUSENTE");
  console.log("pontos painel completo:", pontosFull, "| painel hero:", pontosHero);
  // sync: uma partida REAL anunciada no bus → os dois números têm de subir juntos
  await p1.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } })));
  await p1.waitForTimeout(600);
  const pontosFull2 = await p1.locator('[data-testid="progressao-pontos"]').innerText().catch(() => "?");
  const pontosHero2 = await p1.locator('[data-testid="progressao-hero-pontos"]').innerText().catch(() => "?");
  console.log("após partida → completo:", pontosFull2, "| hero:", pontosHero2);
  await p1.screenshot({ path: `${OUT}/probe-hub-1600.png` });

  // 2. hub 1280×800
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  p2.on("pageerror", (e) => erros.push("hub1280: " + String(e)));
  await navegar(p2, "/lives", 5500);
  const over2 = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log("hub1280 overflowX:", over2);
  await p2.screenshot({ path: `${OUT}/probe-hub-1280.png` });

  // 3. home 1600×900 (topo comprimido)
  const p3 = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  p3.on("pageerror", (e) => erros.push("home1600: " + String(e)));
  await navegar(p3, "/", 5500);
  const over3 = await p3.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log("home1600 overflowX:", over3);
  const trustBox = await p3.locator('[data-testid="trust-bar"]').boundingBox().catch(() => null);
  console.log("trust-bar h:", trustBox && Math.round(trustBox.height));
  await p3.screenshot({ path: `${OUT}/probe-home-1600.png` });

  // 4. telemóvel 390×844 — painel hero NÃO pode existir
  const p4 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p4.on("pageerror", (e) => erros.push("mob390: " + String(e)));
  await navegar(p4, "/lives", 5000);
  const heroMob = await p4.locator('[data-testid="progressao-hero"]').count();
  console.log("mobile progressao-hero count (esperado 0):", heroMob);
  await p4.screenshot({ path: `${OUT}/probe-hub-390.png` });

  await browser.close();
  console.log("pageerrors:", erros.length, erros.slice(0, 3));
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(0);
})().catch((e) => {
  console.error("PROBE FALHOU:", e);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(1);
});
