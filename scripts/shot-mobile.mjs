// Screenshot da home mobile (antes/depois) — Playwright
import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/mobile-home-before.png";
const URL = process.env.TURL || "http://localhost:8099/";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForSelector('[data-testid="mh-quick"], .mob-bottom-bar, #root .min-h-screen', { timeout: 45000 }).catch(() => {});
await page.waitForSelector('[data-testid="mh-quick"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: OUT });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(800);
await page.screenshot({ path: OUT.replace(".png", "-scroll.png") });
await browser.close();
console.log("OK", OUT);
