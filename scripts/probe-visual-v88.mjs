// v88 — verificação visual das correções: sorteios claro, RG no rodapé, topo do /tournaments
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();

// 1 · homepage: secção sorteios (light) + rodapé com RG legível
await pg.goto("http://localhost:8099/", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1500);
const sortEl = await pg.$('[aria-label="Sorteios disponíveis"]');
if (sortEl) {
  await sortEl.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(1200);
  await sortEl.screenshot({ path: "/tmp/v88-sorteios.png" });
}
const footerEl = await pg.$("footer");
if (footerEl) {
  await footerEl.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(1200);
  await footerEl.screenshot({ path: "/tmp/v88-footer.png" });
}
// hero
await pg.evaluate(() => window.scrollTo(0, 0));
await pg.waitForTimeout(800);
await pg.screenshot({ path: "/tmp/v88-hero.png" });

// 2 · /tournaments: topo com título visível
await pg.goto("http://localhost:8099/tournaments", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1500);
await pg.screenshot({ path: "/tmp/v88-torneios-topo.png" });

// 3 · /lives: área do jogo (roda encolhida para a coluna)
await pg.goto("http://localhost:8099/lives", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1800);
const area = await pg.$("#game-content-area");
if (area) {
  await area.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(1200);
  await area.screenshot({ path: "/tmp/v88-lives-area.png" });
}
await browser.close();
console.log("capturas feitas");
