import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:8099/jogos", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6500);
await page.addStyleTag({ content: "*{opacity:1 !important; filter:none !important; transition:none !important}" });
await page.screenshot({ path: "/tmp/vis-mobile-jogos.png" });
await page.goto("http://localhost:8099/jogo/bounce", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
await page.addStyleTag({ content: "*{opacity:1 !important; filter:none !important; transition:none !important}" });
await page.screenshot({ path: "/tmp/vis-mobile-detalhe.png" });
console.log("pageerrors:", errs.length, errs.slice(0, 2));
await ctx.close();
await browser.close();
console.log("OK");
