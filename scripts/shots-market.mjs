import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch();

// marketplace mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mp = await m.newPage();
await mp.goto(`${BASE}/marketplace`, { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(6000);
await mp.screenshot({ path: "/tmp/shot-market-mobile.png" });
// scroll até à grelha
await mp.evaluate(() => window.scrollBy(0, 900));
await mp.waitForTimeout(1500);
await mp.screenshot({ path: "/tmp/shot-market-mobile-grid.png" });
await m.close();

// homepage mobile (harmonia)
const h = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const hp = await h.newPage();
await hp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await hp.waitForTimeout(6000);
await hp.evaluate(() => window.scrollBy(0, 2200));
await hp.waitForTimeout(1500);
await hp.screenshot({ path: "/tmp/shot-home-mobile-rollups.png" });
await h.close();

// marketplace desktop
const d = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dp = await d.newPage();
await dp.goto(`${BASE}/marketplace`, { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(6000);
await dp.screenshot({ path: "/tmp/shot-market-desktop.png" });
await d.close();

await browser.close();
console.log("shots OK");
