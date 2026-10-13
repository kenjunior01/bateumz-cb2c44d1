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

// ciclo de duelo
await page.evaluate(() => { const e = window.__bw; e.debugForceDuelReq(); });
await page.waitForTimeout(800);
await page.locator('[data-testid="bw-duel-accept"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(600);
await page.evaluate(() => { const e = window.__bw; e.debugEndDuel(); });
await page.waitForTimeout(1500);

// foto via tecla
await page.keyboard.press("p");
let keyOk = false;
for (let i = 0; i < 10; i++) { if (await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false)) { keyOk = true; break; } await page.waitForTimeout(150); }
console.log("foto via tecla p após duelo:", keyOk);
await page.waitForTimeout(2500);

// foto via clique playwright
await page.locator('[data-testid="bw-photo"]').click({ force: true }).catch((e) => console.log("click fail:", e.message?.slice(0, 90)));
let clickOk = false;
for (let i = 0; i < 10; i++) { if (await page.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false)) { clickOk = true; break; } await page.waitForTimeout(150); }
console.log("foto via clique após duelo:", clickOk);

// foto SEM duelo prévio numa página nova
await browser.close();

const b2 = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const p2 = await b2.newPage({ viewport: { width: 1280, height: 800 } });
await p2.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
const ni = p2.locator('input[placeholder="Nome do teu herói"]');
await ni.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await ni.fill("ProbeHero2");
await p2.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
await p2.locator('[data-testid="bateu-world"] canvas').waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await p2.waitForTimeout(7000);
// clicar em Mochila primeiro (como na suite v10) e fechar, depois foto
await p2.locator('[data-testid="bw-nav-inv"]').click().catch(() => {});
await p2.waitForTimeout(700);
await p2.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
await p2.waitForTimeout(500);
await p2.locator('[data-testid="bw-photo"]').click({ force: true }).catch(() => {});
let ok2 = false;
for (let i = 0; i < 10; i++) { if (await p2.locator('[data-testid="bw-photo-overlay"]').isVisible().catch(() => false)) { ok2 = true; break; } await p2.waitForTimeout(150); }
console.log("foto sem duelo (após abrir/fechar painel):", ok2);
await b2.close();
