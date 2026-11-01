import { chromium } from "playwright";
const EXE = process.env.PW_CHROME;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, json: [] }));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 15000 });
await page.waitForTimeout(2000);

async function tryTab(label) {
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("Tab");
  await page.waitForTimeout(120);
  const el = await page.evaluate(() => {
    const a = document.activeElement;
    return `${a?.tagName} ${a?.getAttribute("data-testid") || a?.getAttribute("href") || ""}`;
  });
  console.log(`${label}: Tab -> ${el}`);
}

// A: opacity 0
await tryTab("A opacity-0");
// B: remover opacity (visível)
await page.evaluate(() => { const s = document.querySelector("[data-testid='skip-link']"); s.style.opacity = "1"; });
await tryTab("B visível");
// C: opacity 0.01
await page.evaluate(() => { const s = document.querySelector("[data-testid='skip-link']"); s.style.opacity = "0.01"; });
await tryTab("C opacity-0.01");
// D: mover skip-link para o 1º filho do BODY diretamente (fora do #root)
await page.evaluate(() => { const s = document.querySelector("[data-testid='skip-link']"); s.style.opacity = "0"; document.body.prepend(s); });
await tryTab("D body-prepended opacity-0");
await browser.close();
