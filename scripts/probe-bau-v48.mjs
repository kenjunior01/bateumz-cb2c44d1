// Probe v48 — reproduz o fluxo do baú + HP lenda isoladamente
import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e)));
const cap = () => page.evaluate(() => (window).__rpg?.captura?.() || null);
const pump = (n = 20, dt = 0.05) => page.evaluate(([t, d]) => (window).__rpg.pump(t, d), [n, dt]);

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-titulo"]'), null, { timeout: 30000 });
await page.locator('[data-testid="rpg-jogar"]').click();
for (let i = 0; i < 60; i++) { if ((await cap())?.fase === "jogando") break; await page.waitForTimeout(300); }
await pump(30);
console.log("inv após kit:", await page.evaluate(() => {
  const inv = (window).__rpg.motor.inv;
  return { pao: inv.contar(121), maca: inv.contar(107), slots: inv.slots.filter(Boolean).map((s) => `${s.id}×${s.qtd}`) };
}));
// baú da aldeia (mesmo caminho do teste)
await page.evaluate(() => { (window).__rpg.definirHora(0.35); (window).__rpg.teleportar(4.5, 33.02, 6.5); });
await page.evaluate(() => { (window).__rpg.motor.mundo.setBloco(4, 33, 5, 29, false); });
await pump(4);
let mira = null;
for (const p of [-0.42, 0.42, -0.8, 0.8, -0.25, 0.25]) {
  await page.evaluate((pp) => (window).__rpg.olhar(0.3217, pp), p);
  await pump(6);
  mira = await page.evaluate(() => (window).__rpg.motor.mira?.id ?? null);
  if (mira === 29) break;
}
console.log("mira:", mira);
if (mira === 29) {
  await page.evaluate(() => (window).__rpg.atacarDirecto());
  await pump(6);
}
console.log("inv após baú:", await page.evaluate(() => {
  const inv = (window).__rpg.motor.inv;
  return { pao: inv.contar(121), maca: inv.contar(107), baus: (window).__rpg.capturaRpg().descobertas.baus };
}));
console.log("avisos:", (await page.evaluate(() => (window).__rpg.capturaRpg().avisos)).map((a) => a.texto));
// HP lenda
await page.evaluate(() => { (window).__rpg.definirHora(0.85); (window).__rpg.definirDificuldade("lenda"); });
await page.evaluate(() => (window).__rpg.spawnarMob("zumbi", 4, 0));
await pump(2);
console.log("zumbis (vivo):", await page.evaluate(() => (window).__rpg.motor.gestor.mobs
  .filter((mm) => mm.tipo === "zumbi").map((mm) => ({ vivo: mm.vivo, hpMax: mm.hpMax, __boss: !!(mm).__boss }))));
await browser.close();
