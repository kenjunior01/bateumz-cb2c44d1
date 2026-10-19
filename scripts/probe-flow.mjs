// Probe 7: replicar preâmbulo E2E e depois ciclos de painéis (bissecção)
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const STAGE = process.env.STAGE || "full"; // none | move | combat | full
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 250)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("LendaTeste");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-1"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(5000);

const pump = async (times = 40, dt = 0.05) => page.evaluate(([t, d]) => {
  const e = (window).__bw.engine;
  for (let i = 0; i < t; i++) {
    try { e["updateProjs"](d); e["updateMobs"](d); e["updateTowers"](d); e["updateDuel"](d); e["updateDungeon"](d); e["updateFx"](d); } catch { }
  }
}, [times, dt]);

if (STAGE !== "none") {
  // movimento
  await page.keyboard.down("w"); await page.waitForTimeout(2600); await page.keyboard.up("w");
  await page.keyboard.press("q"); await page.waitForTimeout(400);
  console.log("moveu ✓");
}
if (STAGE === "combat" || STAGE === "full") {
  await page.evaluate(() => { (window).__bw.engine.spawnTestMobPublic(false); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => { try { (window).__bw.engine["atkT"] = 0; } catch { } });
    await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
    await page.waitForTimeout(200);
  }
  await pump(90);
  console.log("combate ✓", await page.evaluate(() => (window).__bw.getChar().kills));
}
if (STAGE === "full") {
  await page.locator('[data-testid="bw-skill-0"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="bw-dodge"]').click({ timeout: 8000, force: true });
  await page.waitForTimeout(200);
  await page.evaluate(() => { try { (window).__bw.engine.testHeal(); } catch { } });
  await page.waitForTimeout(350);
  console.log("skill+dodge+heal ✓");
}

// ciclos de painéis
const MENUS = ["inv", "skills", "quests", "map", "fame", "party", "clan", "mounts", "home", "forge", "shop", "coupons", "bank", "settings"];
let fails = 0;
for (const m of MENUS) {
  let opened = false;
  for (let i = 0; i < 4 && !opened; i++) {
    await page.evaluate(() => {
      const t = document.querySelector('[data-testid="bw-menu-toggle"]');
      t?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(400);
    opened = await page.locator(`[data-testid="bw-menu-${m}"]`).isVisible().catch(() => false);
  }
  if (!opened) { fails++; console.log(`✗ ${m}: GRID NÃO ABRIU (4 dispatch)`); continue; }
  await page.locator(`[data-testid="bw-menu-${m}"]`).click({ timeout: 4000, force: true });
  const panel = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
  if (!panel) { fails++; console.log(`✗ ${m}: PANEL NÃO ABRIU`); continue; }
  await page.locator('[data-testid="bw-panel-close"]').click({ timeout: 2500, force: true }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[data-testid="bw-panel"]'), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
}
console.log(`FIM STAGE=${STAGE} — falhas: ${fails}/14`);
await browser.close();
