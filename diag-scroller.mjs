import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(1000);
const info = await page.evaluate(() => {
  window.scrollTo(0, 999999);
  const se = document.scrollingElement;
  const overflowRoot = getComputedStyle(document.documentElement).overflowY;
  const overflowBody = getComputedStyle(document.body).overflowY;
  const bigKids = [...document.querySelectorAll("body *")].filter(d => d.scrollHeight > 3000 && /(auto|scroll)/.test(getComputedStyle(d).overflowY)).slice(0, 3).map(d => `${d.tagName}.${(d.className||"").toString().slice(0,60)} sh=${d.scrollHeight}`);
  return {
    winScrollY: window.scrollY,
    seScrollTop: se?.scrollTop,
    seScrollHeight: se?.scrollHeight,
    innerH: innerHeight,
    overflowRoot, overflowBody,
    bigKids,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
