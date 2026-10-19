// Probe 5: o click chega? o React responde?
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", m => { if (m.type() === "log" || m.type() === "error") console.log("[pg]", m.text().slice(0, 160)); });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 200)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("ClickX");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(2000);

// 1. dispatch nativo com listener de teste
await page.evaluate(() => {
  const t = document.querySelector('[data-testid="bw-menu-toggle"]');
  t.addEventListener("click", () => console.log("NATIVE-CLICK-GOT"), { once: true });
  console.log("btn-existe:", !!t, "rect:", JSON.stringify(t.getBoundingClientRect()));
  t.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(800);
console.log("grid pos-dispatch:", await page.evaluate(() => document.querySelectorAll('[data-testid="bw-menu"] button').length));

// 2. clique real Playwright
await page.locator('[data-testid="bw-menu-toggle"]').click({ force: true });
await page.waitForTimeout(800);
console.log("grid pos-click-real:", await page.evaluate(() => document.querySelectorAll('[data-testid="bw-menu"] button').length));
await browser.close();
