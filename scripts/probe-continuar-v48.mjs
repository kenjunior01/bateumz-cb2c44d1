import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route("**/supabase.co/**", (r) => r.fulfill({ json: [] }));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-titulo"]'), null, { timeout: 30000, polling: 200 });
// prepara save com mochila: kit + espólio da aldeia + guardar
await page.evaluate(() => document.querySelector('[data-testid="rpg-jogar"]')?.click());
await page.waitForFunction(() => (window).__rpg?.motor?.fase === "jogando", null, { timeout: 30000, polling: 200 });
await page.evaluate(() => { (window).__rpg.abrirTesouro(4, 33, 5); });
await page.evaluate(() => { (window).__rpg.perfil().xp = 500; (window).__rpg.perfil().missoes.concluidasTotal = 1; }); // garante temSave
await page.evaluate(() => (window).__rpg.guardar());
await page.waitForTimeout(800);
console.log("inv ANTES do reload:", await page.evaluate(() => (window).__rpg.motor.inv.slots.filter(Boolean).map((s) => `${s.id}×${s.qtd}`)));
console.log("perfil.inv ANTES:", await page.evaluate(() => (window).__rpg.perfil().inv?.filter(Boolean).map((s) => `${s.id}×${s.qtd}`)));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-titulo"]'), null, { timeout: 30000, polling: 200 });
await page.waitForFunction(() => (window).__rpg?.temSave?.() === true, null, { timeout: 15000, polling: 200 });
await page.evaluate(() => document.querySelector('[data-testid="rpg-continuar"]')?.click());
await page.waitForFunction(() => (window).__rpg?.motor?.fase === "jogando", null, { timeout: 30000, polling: 200 });
await page.waitForTimeout(500);
console.log("inv APÓS CONTINUAR:", await page.evaluate(() => (window).__rpg.motor.inv.slots.filter(Boolean).map((s) => `${s.id}×${s.qtd}`)));
console.log("perfil.inv APÓS:", await page.evaluate(() => (window).__rpg.perfil().inv?.filter(Boolean).map((s) => `${s.id}×${s.qtd}`)));
await browser.close();
