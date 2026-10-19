// Probe 3: capturar stack da atribuição NaN em bodyRoot.position.y
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("ProbeZ");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const e = (window).__bw.engine;
  const br = e["player"].root.children[0];
  const target = br.position;
  (window).__nanStack = null;
  const proxy = new Proxy(target, {
    set(t, prop, value) {
      if (prop === "y" && typeof value === "number" && Number.isNaN(value) && !(window).__nanStack) {
        (window).__nanStack = new Error("NaN y atribuído").stack;
      }
      t[prop] = value;
      return true;
    },
  });
  Object.defineProperty(br, "position", { value: proxy, configurable: true });
});
await page.waitForTimeout(2500);
const st = await page.evaluate(() => ({ stack: (window).__nanStack, yNow: String((window).__bw.engine["player"].root.children[0].position.y) }));
console.log("yNow:", st.yNow);
console.log(st.stack || "(nenhuma atribuição NaN capturada em 2.5s)");
await browser.close();
