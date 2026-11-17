import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const PW = process.env.PW_CHROME || undefined;
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: PW });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
await page.waitForSelector('[data-testid="rpg-jogar"]', { timeout: 40000 });
await page.click('[data-testid="rpg-jogar"]', { force: true }).catch(() => {});
await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 20000 }).catch(() => {});
console.log("fase:", await page.evaluate(() => window.__rpg?.motor?.fase));
// simular B4→B5: pausar, retomar, andar, pausar de novo
const pausar = async (rotulo) => {
  await page.click('[data-testid="rpg-btn-pausa"]', { force: true, timeout: 8000 }).catch(async () => {
    await page.evaluate(() => document.querySelector('[data-testid="rpg-btn-pausa"]')?.click()).catch(() => {});
  });
  for (let i = 0; i < 8; i++) {
    await sleep(400);
    const st = await page.evaluate(() => ({
      pausado: window.__rpg?.motor?.pausado,
      modal: !!document.querySelector('[data-testid="rpg-modal"]'),
      retomar: !!document.querySelector('[data-testid="rpg-retomar"]'),
      sair: !!document.querySelector('[data-testid="rpg-sair"]'),
    })).catch(() => null);
    if (st?.modal) { console.log(`${rotulo}: modal ABRIU após ${(i + 1) * 400}ms`, JSON.stringify(st)); return true; }
  }
  const st = await page.evaluate(() => ({
    pausado: window.__rpg?.motor?.pausado,
    modal: !!document.querySelector('[data-testid="rpg-modal"]'),
    hud: !!document.querySelector('[data-testid="rpg-btn-pausa"]'),
    fase: window.__rpg?.motor?.fase,
  })).catch(() => null);
  console.log(`${rotulo}: modal NÃO ABRIU em 3,2s`, JSON.stringify(st));
  return false;
};
const p1 = await pausar("pausa#1");
await sleep(500);
if (p1) { await page.evaluate(() => document.querySelector('[data-testid="rpg-retomar"]')?.click()).catch(() => {}); await sleep(800); }
await page.keyboard.down("w"); await sleep(1500); await page.keyboard.up("w");
await pausar("pausa#2 (condições do B5)");
await page.screenshot({ path: "/tmp/probe-pausa.png" }).catch(() => {});
await browser.close().catch(() => {});
