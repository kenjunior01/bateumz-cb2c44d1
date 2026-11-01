import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(2500);
const pre = await page.evaluate(() => {
  document.activeElement?.blur?.();
  return document.activeElement?.tagName || "none";
});
await page.keyboard.press("Tab");
const post = await page.evaluate(() => {
  const el = document.activeElement;
  const skip = document.querySelector("[data-testid='skip-link']");
  const all = [...document.querySelectorAll("a,button,input,[tabindex]:not([tabindex='-1'])")];
  const idx = (x) => all.indexOf(x);
  return {
    active: el ? `${el.tagName} ${el.getAttribute("data-testid") || ""} ${el.getAttribute("href") || ""} ${(el.textContent||"").trim().slice(0,30)}` : "none",
    skipIdx: skip ? idx(skip) : -1,
    first3: all.slice(0, 3).map(a => `${a.tagName}#${a.getAttribute("data-testid") || a.getAttribute("href") || a.textContent.trim().slice(0,15)}`),
  };
});
console.log("pre-blur active:", pre);
console.log("post-Tab active:", JSON.stringify(post, null, 1));
await browser.close();
