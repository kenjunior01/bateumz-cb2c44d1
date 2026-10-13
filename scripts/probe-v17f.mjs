import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
const ni = page.locator('input[placeholder="Nome do teu herói"]');
await ni.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await ni.fill("ProbeF");
await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
await page.locator('[data-testid="bateu-world"] canvas').waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await page.waitForTimeout(5000);

// ── painel poderes ──
await page.locator('[data-testid="bw-nav-poderes"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(900);
const pow = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "SEM PANEL");
console.log("=== PODERES (primeiras 25 linhas) ===");
console.log(pow.split("\n").slice(0, 25).join("\n"));
console.log('includes "Power Level":', pow.includes("Power Level"), '| includes "Ataque":', pow.includes("Ataque"));
await page.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
await page.waitForTimeout(500);

// ── prémio ──
await page.evaluate(() => { const e = window.__bw; e.debugGrantPrize(); });
await page.waitForTimeout(900);
console.log("prize modal visível:", await page.locator('[data-testid="bw-prize-modal"]').isVisible().catch(() => false));
await page.locator('[data-testid="bw-prize-op-movitel"]').click({ force: true }).catch(() => {});
await page.locator('[data-testid="bw-prize-phone"]').fill("848547887").catch(() => {});
await page.locator('[data-testid="bw-prize-close"]').click({ force: true }).catch((e) => console.log("close fail:", e.message?.slice(0, 70)));
await page.waitForTimeout(700);
console.log("prize modal após fechar:", await page.locator('[data-testid="bw-prize-modal"]').count());
// clicou no botão certo?
const closeInfo = await page.evaluate(() => {
  const b = document.querySelector('[data-testid="bw-prize-close"]');
  if (!b) return "botão não existe (modal fechou)";
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { rect: { x: r.x, y: r.y }, top: el?.tagName, isBtn: !!el?.closest('[data-testid="bw-prize-close"]') };
});
console.log("close info:", JSON.stringify(closeInfo));
await browser.close();
