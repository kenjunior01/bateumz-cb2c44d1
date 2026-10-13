import { chromium } from "playwright";

const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error" && !["websocket","Failed to load","supabase","404","406","net::","ERR_","ResizeObserver","AudioContext","JWT","PGRST","same key","validateDOM","vibrate","attribute"].some(n => m.text().includes(n))) console.log("CONSOLE-ERR:", m.text().slice(0, 160)); });

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
await nameInput.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await nameInput.fill("ProbeHero");
await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
await page.locator('[data-testid="bateu-world"] canvas').waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await page.waitForTimeout(8000);

// ── duel lifecycle ──
console.log("--- DUEL ---");
await page.evaluate(() => { const e = window.__bw; e.debugForceDuelReq(); });
await page.waitForTimeout(800);
console.log("req visible:", await page.locator('[data-testid="bw-duel-req"]').isVisible().catch(() => false));
await page.locator('[data-testid="bw-duel-accept"]').click({ force: true }).catch((e) => console.log("accept click fail", e.message));
await page.waitForTimeout(600);
console.log("hud visible:", await page.locator('[data-testid="bw-duel-hud"]').isVisible().catch(() => false));
await page.evaluate(() => { const e = window.__bw; e.debugEndDuel(); });
await page.waitForTimeout(500);
console.log("engine.duel:", await page.evaluate(() => window.__bw.duel));
console.log("hud visible after end:", await page.locator('[data-testid="bw-duel-hud"]').isVisible().catch(() => false));
await page.waitForTimeout(2500);
console.log("hud visible +2.5s:", await page.locator('[data-testid="bw-duel-hud"]').isVisible().catch(() => false));
console.log("body text has DUELO:", (await page.locator("body").innerText()).includes("DUELO vs"));

// ── photo ──
console.log("--- PHOTO ---");
await page.evaluate(() => { document.querySelector('[data-testid="bateu-world"]')?.scrollIntoView({ block: "center" }); });
await page.waitForTimeout(600);
await page.locator('[data-testid="bw-photo"]').click({ force: true }).catch(() => {});
for (let i = 0; i < 14; i++) {
  const vis = await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false);
  const hud = await page.locator('[data-testid="bw-attack"]').isVisible().catch(() => true);
  console.log(`t+${i * 0.3}s overlay=${vis} hud=${hud}`);
  if (vis) break;
  await page.waitForTimeout(300);
}

// ── steal ──
console.log("--- STEAL ---");
await page.evaluate(() => { const e = window.__bw; e.debugReceiveSteal(); });
await page.waitForTimeout(900);
const persisted = await page.evaluate(() => localStorage.getItem("bateu_world_char_v6") || "");
console.log("char has Roubada:", persisted.includes("Roubada"));
await page.locator('[data-testid="bw-nav-inv"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(600);
console.log("inv text has Roubada:", (await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "")).includes("Roubada"));

await browser.close();
