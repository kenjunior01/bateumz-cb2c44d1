import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route("**/supabase.co/**", (r) => r.fulfill({ json: [] }));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-jogar"]'), null, { timeout: 30000, polling: 200 });
await page.evaluate(() => document.querySelector('[data-testid="rpg-jogar"]')?.click());
await page.waitForFunction(() => (window).__rpg?.motor?.fase === "jogando", null, { timeout: 30000, polling: 200 });
await page.waitForTimeout(400);
const inv = await page.evaluate(() => {
  const m = (window).__rpg.motor;
  return { slots: m.inv.slots.slice(0, 12).map((s) => s ? s.id : null), selecao: m.inv.selecao };
});
console.log("slots 0-11:", JSON.stringify(inv.slots), "| selecao:", inv.selecao);
await browser.close();
