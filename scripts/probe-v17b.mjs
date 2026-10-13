import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
await nameInput.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await nameInput.fill("ProbeHero");
await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
await page.locator('[data-testid="bateu-world"] canvas').waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await page.waitForTimeout(7000);

// 1) quantos bw-photo existem?
console.log("bw-photo count:", await page.locator('[data-testid="bw-photo"]').count());

// 2) key "p" toggle
await page.keyboard.press("p");
for (let i = 0; i < 10; i++) {
  const vis = await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false);
  if (vis) { console.log(`key p → overlay visível @ ${i * 0.15}s`); break; }
  await page.waitForTimeout(150);
}

// 3) direct DOM click
await page.waitForTimeout(2500);
await page.evaluate(() => { const b = document.querySelector('[data-testid="bw-photo"]'); if (b) b.click(); });
for (let i = 0; i < 12; i++) {
  const vis = await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false);
  const hud = await page.locator('[data-testid="bw-attack"]').isVisible().catch(() => true);
  console.log(`dom click t+${(i * 0.2).toFixed(1)}s overlay=${vis} hud=${hud}`);
  if (vis) break;
  await page.waitForTimeout(200);
}

// 4) playwright click + rect info
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const b = document.querySelector('[data-testid="bw-photo"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const nav = b.parentElement.getBoundingClientRect();
  return { btn: { x: r.x, y: r.y, w: r.width, h: r.height }, nav: { x: nav.x, w: nav.width, sw: b.parentElement.scrollWidth, cw: b.parentElement.clientWidth }, center: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.getAttribute?.("data-testid") };
});
console.log("photo btn info:", JSON.stringify(info));
await page.locator('[data-testid="bw-photo"]').click({ force: true }).catch((e) => console.log("pw click fail:", e.message?.slice(0, 80)));
for (let i = 0; i < 10; i++) {
  const vis = await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false);
  if (vis) { console.log(`pw click → overlay visível @ ${(i * 0.2).toFixed(1)}s`); break; }
  await page.waitForTimeout(200);
}

// 5) steal: painel abre com atraso?
await page.evaluate(() => { const e = window.__bw; e.debugReceiveSteal(); });
await page.waitForTimeout(400);
console.log("localStorage após steal:", (await page.evaluate(() => localStorage.getItem("bateu_world_char_v6") || "")).includes("Roubada"));
await page.waitForTimeout(1200);
console.log("localStorage +1.2s:", (await page.evaluate(() => localStorage.getItem("bateu_world_char_v6") || "")).includes("Roubada"));

await browser.close();
