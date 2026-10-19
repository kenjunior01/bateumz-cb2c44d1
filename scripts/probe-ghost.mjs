// Probe 4: existem 2 instâncias do HUD (árvore fantasma)?
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 200)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("GhostX");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(2000);

const count = async (label) => {
  const r = await page.evaluate(() => ({
    toggles: document.querySelectorAll('[data-testid="bw-menu-toggle"]').length,
    canvases: document.querySelectorAll('[data-testid="bw-canvas-host"] canvas').length,
    hosts: document.querySelectorAll('[data-testid="bw-canvas-host"]').length,
    plays: document.querySelectorAll('[data-testid="bw-play"]').length,
    portals: Array.from(document.body.children).map(c => `${c.tagName}#${c.id}.${String(c.className).slice(0, 30)}`).slice(0, 8),
  }));
  console.log(label, JSON.stringify(r));
};

await count("inicio:");
// ciclo: abrir 3 painéis e fechar (como o teste)
for (const m of ["inv", "skills", "quests"]) {
  for (let i = 0; i < 8; i++) {
    const vis = await page.locator(`[data-testid="bw-menu-${m}"]`).isVisible().catch(() => false);
    if (vis) break;
    await page.evaluate(() => {
      const t = document.querySelector('[data-testid="bw-menu-toggle"]');
      t?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(500);
  }
  const opened = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
  console.log(`painel ${m}: grid→${opened}`);
  if (!opened) { await count("FALHA:"); break; }
  await page.locator('[data-testid="bw-panel-close"]').click({ force: true }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[data-testid="bw-panel"]'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(250);
  await count(`pos-${m}:`);
}
await browser.close();
