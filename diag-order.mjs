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
  const banner = [...document.querySelectorAll("a")].find(a => a.getAttribute("href") === "/lives-agora" && /Participar Agora/.test(a.textContent));
  const rel = banner && skip ? document.compareDocumentPosition(skip) & document.compareDocumentPosition(banner) : -1;
  // DocumentPosition: FOLLOWING=4. skip FOLLOWING de banner => banner vem antes
  const skipAfterBanner = banner ? !!(banner.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
  const rootKids = [...document.getElementById("root").children].map(c => `${c.tagName}.${(c.className||"").toString().slice(0,50)}`);
  return {
    skipAfterBanner, // true => skip vem DEPOIS do banner no DOM
    skipTree: (() => { let n = skip, out = []; while (n && out.length < 8) { out.push(`${n.tagName}#${n.id || ""}.${(n.className||"").toString().slice(0,30)}`); n = n.parentElement; } return out; })(),
    bannerTree: (() => { let n = banner, out = []; while (n && out.length < 8) { out.push(`${n.tagName}#${n.id || ""}.${(n.className||"").toString().slice(0,30)}`); n = n.parentElement; } return out; })(),
    rootKids,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
