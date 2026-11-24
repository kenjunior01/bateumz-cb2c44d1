import { chromium } from "playwright";
const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const pg = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await pg.goto("http://localhost:8099/jogos", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1500);
const res = await pg.evaluate(() => {
  const bad = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > 1280.4 && r.width > 4) bad.push({ tag: el.tagName.toLowerCase(), right: Math.round(r.right * 10) / 10, w: Math.round(r.width), cls: String(el.className).slice(0, 100) });
  });
  return { sw: document.documentElement.scrollWidth, bad: bad.slice(0, 8) };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
