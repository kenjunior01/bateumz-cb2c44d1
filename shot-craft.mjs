import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
// desktop
const d = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dp = await d.newPage();
await dp.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("bateu_world_char") || k.startsWith("bateu_craft") || k === "bateu_wmode" || k === "liveActiveGame") localStorage.removeItem(k); } catch {} });
await dp.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(5000);
const ni = dp.locator('input[placeholder="Nome do teu herói"]');
await ni.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
if (await ni.count()) { await ni.fill("CraftHero"); await dp.locator('button:has-text("Guerreiro")').first().click(); await dp.locator('button:has-text("ENTRAR NO MUNDO")').first().click(); }
await dp.waitForFunction(() => !!(window).__bwcraft, { timeout: 25000 });
await dp.waitForTimeout(6000);
await dp.screenshot({ path: "shots/craft-desktop.png" });
await dp.evaluate(() => { const w = (window).__bwcraft; w.give("b8", 6); w.give("wood_pickaxe", 1); w.setTime(0.22); });
await dp.waitForTimeout(1200);
await dp.locator('[data-testid="craft-btn-inv"]').click();
await dp.waitForTimeout(800);
await dp.screenshot({ path: "shots/craft-desktop-mochila.png" });
await dp.locator('[data-testid="craft-panel"] button:has(svg.lucide-x)').first().click();
await dp.waitForTimeout(500);
await dp.locator('[data-testid="craft-btn-tablet"]').click();
await dp.waitForTimeout(800);
await dp.screenshot({ path: "shots/craft-desktop-tablet.png" });
await d.close();
// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (Linux; Android 13) Mobile" });
const mp = await m.newPage();
await mp.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("bateu_world_char") || k.startsWith("bateu_craft") || k === "bateu_wmode" || k === "liveActiveGame") localStorage.removeItem(k); } catch {} });
await mp.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(5000);
const ni2 = mp.locator('input[placeholder="Nome do teu herói"]');
await ni2.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
if (await ni2.count()) { await ni2.fill("CraftMovel"); await mp.locator('button:has-text("Guerreiro")').first().click(); await mp.locator('button:has-text("ENTRAR NO MUNDO")').first().click(); }
await mp.waitForFunction(() => !!(window).__bwcraft, { timeout: 25000 });
await mp.waitForTimeout(6000);
await mp.screenshot({ path: "shots/craft-mobile.png" });
await mp.evaluate(() => { const w = (window).__bwcraft; w.give("b8", 4); w.setTime(0.75); });
await mp.waitForTimeout(1500);
await mp.screenshot({ path: "shots/craft-mobile-noite.png" });
await m.close();
await browser.close();
console.log("shots ok");
