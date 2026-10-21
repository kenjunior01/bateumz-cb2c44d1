import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("Probe");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-1"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 30000 });
await page.waitForTimeout(1500);
if (await page.locator('[data-testid="bw-streak-ok"]').count()) await page.locator('[data-testid="bw-streak-ok"]').click();
if (await page.locator('[data-testid="bw-intro-skip"]').count()) await page.locator('[data-testid="bw-intro-skip"]').click();
const r = await page.evaluate(() => {
  const E = (window).__bw.engine;
  (window).__bw.updateChar((c) => { c.level = 25; });
  E.setHotbar([7, null, null, null, null, null]);
  E.castSkill(0);
  const st = E.getState();
  return { castInState: st.cast, castbarInDom: !!document.querySelector('[data-testid="bw-castbar"]'), hudHasCast: undefined };
});
console.log("imediato:", JSON.stringify(r));
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(150);
  const s = await page.evaluate(() => ({
    t: Date.now(),
    castInState: (window).__bw.engine.getState().cast,
    castbarInDom: !!document.querySelector('[data-testid="bw-castbar"]'),
  }));
  console.log(`t+${(i + 1) * 150}ms:`, JSON.stringify(s));
}
await browser.close();
