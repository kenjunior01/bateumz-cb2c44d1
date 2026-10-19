// Screenshots do BATEU WORLD v18 (desktop + mobile)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const CHROME = process.env.PW_CHROME || undefined;

async function shoot(viewport, tag, opts = {}) {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: CHROME });
  const page = await browser.newPage({ viewport, hasTouch: !!opts.mobile, isMobile: !!opts.mobile, userAgent: opts.mobile ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" : undefined });
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
  await page.screenshot({ path: `/tmp/v18-${tag}-0-criacao.png` });
  await page.locator('[data-testid="bw-name-input"]').fill(tag === "mobile" ? "HeroiMovel" : "LendaDourada");
  await page.locator('[data-testid="bw-class-1"]').click(); // Mago
  await page.locator('[data-testid="bw-faction-0"]').click(); // VANGUARDA
  await page.waitForTimeout(400);
  await page.locator('[data-testid="bw-enter"]').click();
  await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
  await page.waitForTimeout(6000);
  // contorna bug de composição headless
  await page.addStyleTag({ content: "* {opacity:1 !important; filter:none !important}" });
  await page.screenshot({ path: `/tmp/v18-${tag}-1-vila.png` });
  // combate: spawn + alguns ataques
  await page.evaluate(() => { (window).__bw.engine.spawnTestMobPublic(false); });
  await page.waitForTimeout(600);
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => { try { (window).__bw.engine["atkT"] = 0; } catch { } });
    await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/v18-${tag}-2-combate.png` });
  // painel de mapa aberto
  await page.locator('[data-testid="bw-menu-toggle"]').click().catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('[data-testid="bw-menu-map"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/v18-${tag}-3-mapa.png` });
  await browser.close();
  console.log(`✓ ${tag} done`);
}

await shoot({ width: 1280, height: 800 }, "desktop");
await shoot({ width: 390, height: 844 }, "mobile", { mobile: true });
