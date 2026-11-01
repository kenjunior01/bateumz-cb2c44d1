import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  window.__tabs = [];
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") window.__tabs.push({ prevented: e.defaultPrevented, phase: e.eventPhase, target: e.target?.tagName + "." + (e.target?.className || "").toString().slice(0, 30) });
  }, true);
});
await page.evaluate(() => { document.activeElement?.blur?.(); });
for (let i = 0; i < 3; i++) {
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
  const el = await page.evaluate(() => {
    const a = document.activeElement;
    return `${a?.tagName} ${a?.getAttribute("data-testid") || a?.getAttribute("href") || (a?.textContent || "").trim().slice(0, 18)}`;
  });
  console.log(`Tab ${i + 1} -> ${el}`);
}
console.log(JSON.stringify(await page.evaluate(() => window.__tabs)));
await browser.close();
