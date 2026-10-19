// Probe 6: ciclos repetidos abrir/fechar até quebrar
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", m => { if (m.type() === "error") console.log("[console-err]", m.text().slice(0, 180)); });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("CycleX");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(2500);

const MENUS = ["inv", "skills", "quests", "map", "fame", "party", "clan", "mounts", "home", "forge", "shop", "coupons", "bank", "settings"];
for (let round = 0; round < 3; round++) {
  for (const m of MENUS) {
    // abrir via toggle dispatch
    let opened = false;
    for (let i = 0; i < 4 && !opened; i++) {
      await page.evaluate(() => {
        const t = document.querySelector('[data-testid="bw-menu-toggle"]');
        t?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(400);
      opened = await page.locator(`[data-testid="bw-menu-${m}"]`).isVisible().catch(() => false);
    }
    if (!opened) { console.log(`RD${round} ${m}: GRID NÃO ABRIU`); continue; }
    await page.locator(`[data-testid="bw-menu-${m}"]`).click({ timeout: 4000, force: true });
    const panel = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
    if (!panel) { console.log(`RD${round} ${m}: PANEL NÃO ABRIU`); continue; }
    await page.locator('[data-testid="bw-panel-close"]').click({ timeout: 2500, force: true }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('[data-testid="bw-panel"]'), null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  console.log(`RD${round} completa`);
}
console.log("FIM — se chegou aqui, 42 ciclos OK");
await browser.close();
