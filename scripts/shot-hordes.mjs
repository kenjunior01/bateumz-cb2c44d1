// Screenshots do parity hordes.io (desktop + mobile)
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:8099";
const EXE = process.env.PW_CHROME || undefined;

async function shoot(browser, { w, h, out, touch }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch, isMobile: touch,
    userAgent: touch ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36" : undefined,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
  await page.locator('[data-testid="bw-name-input"]').fill("LendaHordes");
  await page.locator('[data-testid="bw-class-1"]').click();
  await page.locator('[data-testid="bw-faction-1"]').click();
  await page.screenshot({ path: out.replace(".png", "-entrada.png"), fullPage: false });
  await page.locator('[data-testid="bw-enter"]').click();
  await page.waitForSelector('[data-testid="bw-play"]', { timeout: 30000 });
  await page.waitForTimeout(1000);
  if (await page.locator('[data-testid="bw-streak-ok"]').count()) await page.locator('[data-testid="bw-streak-ok"]').click();
  await page.waitForSelector('[data-testid="bw-intro"]', { timeout: 8000 }).catch(() => {});
  if (await page.locator('[data-testid="bw-intro-skip"]').count()) await page.locator('[data-testid="bw-intro-skip"]').click();
  // cast em curso + chat com mensagens + grupo
  await page.evaluate(() => {
    const E = (window).__bw.engine;
    (window).__bw.updateChar((c) => { c.level = 8; });
    E.setParty(["self", "bot_0", "bot_1"]);
    E.setHotbar([3, null, null, null, null, null]);
    E.testTeleport(120, 80);
  });
  await page.waitForTimeout(3500); // chat boot + mobs por perto
  await page.evaluate(() => { try { (window).__bw.engine.castSkill(0); } catch { } });
  await page.waitForTimeout(420);
  const style = await page.addStyleTag({ content: "* {opacity:1 !important; filter:none !important}" }).catch(() => null);
  await page.screenshot({ path: out, fullPage: false });
  await ctx.close();
  console.log("📸", out);
}

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: EXE });
fs.mkdirSync("/tmp/hordes-shots", { recursive: true });
await shoot(browser, { w: 1280, h: 800, out: "/tmp/hordes-shots/desktop.png", touch: false });
await shoot(browser, { w: 390, h: 844, out: "/tmp/hordes-shots/mobile.png", touch: true });
await browser.close();
console.log("OK");
