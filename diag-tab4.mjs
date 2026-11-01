import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const skip = document.querySelector("[data-testid='skip-link']");
  // 1) focus programático funciona?
  skip.focus();
  const progFocus = document.activeElement === skip;
  // 2) rects
  const rects = [...skip.getClientRects()].map(r => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  const cs = getComputedStyle(skip);
  return {
    progFocus,
    rects,
    opacity: cs.opacity, display: cs.display, pos: cs.position,
    tabIndex: skip.tabIndex, disabled: (skip).disabled,
    // hidden attr? inert?
    inert: skip.inert, hidden: skip.hidden,
    // que elemento o browser considera o 1º tabbable? tentativa: navegação sintética não dá — mas verificamos aria-hidden nos ancestrais
    ancestorHidden: (() => { let n = skip.parentElement, out = []; while (n && n !== document.body) { if (n.getAttribute("aria-hidden") === "true" || n.inert) out.push(`${n.tagName}.${(n.className||"").toString().slice(0,40)}`); n = n.parentElement; } return out; })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
