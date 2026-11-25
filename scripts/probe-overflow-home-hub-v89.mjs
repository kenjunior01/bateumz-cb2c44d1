// probe-overflow-v87 — que elementos ultrapassam a largura do viewport?
import { spawn } from "node:child_process";

const BASE = "http://localhost:8099";
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
  throw new Error("vite não subiu");
}

(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  for (const [nome, url, w] of [["home1600", "/", 1600], ["hub1600", "/lives", 1600], ["hub1280", "/lives", 1280]]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    const culpados = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > W + 1 && r.width > 8) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.position === "absolute") {
            const p = el.parentElement;
            if (p && (getComputedStyle(p).position === "fixed" || getComputedStyle(p).position === "absolute")) continue; // só o topo da cadeia
          }
          out.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || undefined,
            testid: el.getAttribute("data-testid") || undefined,
            cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 80) || undefined,
            right: Math.round(r.right), w: Math.round(r.width),
          });
        }
      }
      return { W, over: document.documentElement.scrollWidth - W, lista: out.slice(0, 12) };
    });
    console.log(`\n=== ${nome} (W=${culpados.W}, overflow=${culpados.over}) ===`);
    for (const c of culpados.lista) console.log(" ", JSON.stringify(c));
    await page.close();
  }
  await browser.close();
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  process.exit(0);
})().catch((e) => { console.error(e); if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {} process.exit(1); });
