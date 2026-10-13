import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
const ni = page.locator('input[placeholder="Nome do teu herói"]');
await ni.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await ni.fill("ProbeHero3");
await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
await page.locator('[data-testid="bateu-world"] canvas').waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
await page.waitForTimeout(7000);

const snap = (label) => page.evaluate((lb) => {
  const b = document.querySelector('[data-testid="bw-photo"]');
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  const chain = [];
  let cur = el;
  while (cur && chain.length < 4) { chain.push(`${cur.tagName}.${(cur.getAttribute?.("data-testid") || cur.className || "").toString().slice(0, 60)}`); cur = cur.parentElement; }
  return { label: lb, btn: { x: r.x, y: r.y, w: r.width }, top: el?.tagName, chain };
}, label);

console.log(JSON.stringify(await snap("ANTES do painel")));

await page.locator('[data-testid="bw-nav-inv"]').click().catch((e) => console.log("inv fail", e.message?.slice(0, 80)));
await page.waitForTimeout(700);
console.log(JSON.stringify(await snap("PAINEL ABERTO")));
await page.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
await page.waitForTimeout(600);
const panelOpen = await page.locator('[data-testid="bw-panel"]').count();
console.log("painel ainda aberto?", panelOpen);
console.log(JSON.stringify(await snap("PAINEL FECHADO")));
await browser.close();
