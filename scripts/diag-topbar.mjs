// Diagnóstico: estilos computados do topbar/bottombar na home mobile
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1",
});
const page = await ctx.newPage();
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForSelector('[data-testid="mh-quick"]', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const topbar = document.querySelector(".mob-topbar");
  const bar = document.querySelector(".mob-bottom-bar-inner");
  const darkDiv = document.querySelector("div.dark");
  const cs = (el) => el ? {
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    bgVar: getComputedStyle(el).getPropertyValue("--background"),
    fgVar: getComputedStyle(el).getPropertyValue("--foreground"),
  } : null;
  return {
    darkDivExists: !!darkDiv,
    darkDivParentClass: darkDiv?.parentElement?.className?.slice(0, 60) || null,
    topbar: cs(topbar),
    bottombar: cs(bar),
    rootBg: getComputedStyle(document.documentElement).getPropertyValue("--background"),
    htmlClass: document.documentElement.className,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
