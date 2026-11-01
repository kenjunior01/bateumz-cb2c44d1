import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const skip = document.querySelector("[data-testid='skip-link']");
  const cs = skip ? getComputedStyle(skip) : null;
  // posição no documento comparada com o banner
  const order = document.body.compareDocumentPosition(skip);
  const skipRect = skip?.getBoundingClientRect();
  return {
    skipExists: !!skip,
    skipParentChain: (() => { let n = skip, out = []; while (n && n !== document.body) { out.push(`${n.tagName}.${(n.className||"").toString().slice(0,40)}`); n = n.parentElement; } return out.slice(0, 5); })(),
    display: cs?.display, visibility: cs?.visibility, position: cs?.position,
    tabIndexAttr: skip?.getAttribute("tabindex"),
    rect: skipRect ? `${Math.round(skipRect.x)},${Math.round(skipRect.y)} ${Math.round(skipRect.width)}x${Math.round(skipRect.height)}` : null,
    // o CTA do banner existe?
    bannerCTA: !!document.querySelector("a[href='/lives-agora']"),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
