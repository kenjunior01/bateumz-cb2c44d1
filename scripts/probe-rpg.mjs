// Probe: diagnóstico do spawn escalado + chefe no BATEU RPG
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" && !/supabase|net::|404|JWT|PGRST|AudioContext|THREE|WebGL/i.test(m.text())) console.log("[console]", m.text().slice(0, 160)); });
await page.route("**/supabase.co/**", (r) => r.fulfill({ json: [] }));

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-jogar"]'), null, { timeout: 30000, polling: 200 }).catch(() => {});
await page.locator('[data-testid="rpg-jogar"]').click();
await page.waitForFunction(() => (window).__rpg?.motor?.fase === "jogando", null, { timeout: 30000, polling: 200 });

const pump = (n = 20) => page.evaluate(([t]) => (window).__rpg.pump(t, 0.05), [n]);

// 1. spawn escalado na aldeia
await pump(20);
const hp = await page.evaluate(() => {
  const w = (window).__rpg;
  w.definirHora(0.35);
  const mob = w.spawnarMob("zumbi", 3, 0);
  return { hp: mob.hp, hpMax: mob.hpMax, tipo: mob.tipo, x: mob.x, y: mob.y, vivo: mob.vivo };
});
console.log("spawn aldeia:", JSON.stringify(hp));

// 2. auto-aim kill
await page.evaluate(() => {
  const w = (window).__rpg, m = w.motor;
  const mob = m.gestor.mobs.find((mm) => mm.vivo && mm.tipo === "zumbi");
  if (mob) { const dx = mob.x - m.px, dz = mob.z - m.pz; m.yaw = Math.atan2(-dx, -dz); }
});
for (let t = 0; t < 30; t++) {
  const alive = await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    const mob = m.gestor.mobs.find((mm) => mm.vivo && mm.tipo === "zumbi");
    if (!mob) return false;
    const dx = mob.x - m.px, dz = mob.z - m.pz;
    m.yaw = Math.atan2(-dx, -dz);
    w.atacarDirecto();
    return true;
  });
  if (!alive) { console.log("mob morto após", t + 1, "ataques"); break; }
  await pump(2);
}
const r1 = await page.evaluate(() => ({ kills: (window).__rpg.capturaRpg().kills, xp: (window).__rpg.perfil().xp, nivel: (window).__rpg.capturaRpg().nivel }));
console.log("depois da kill:", JSON.stringify(r1));

// 3. mira no baú — sondar pitches
await page.evaluate(() => { (window).__rpg.teleportar(4.5, 33.02, 6.5); });
for (const p of [0.42, -0.42, 0.8, -0.8, 0.25, -0.25]) {
  await page.evaluate((pp) => { (window).__rpg.olhar(0.3217, pp); }, p);
  await pump(4);
  const mira = await page.evaluate(() => {
    const mm = (window).__rpg.motor.mira;
    return mm ? { id: mm.id, x: mm.x, y: mm.y, z: mm.z, nome: mm.nome } : null;
  });
  console.log(`pitch ${p}: mira =`, JSON.stringify(mira));
  if (mira?.id === 29) break;
}

// 4. chefe
await page.evaluate(() => {
  const p = (window).__rpg.perfil();
  p.missoes.historiaFeitas = ["h1", "h2", "h3", "h4", "h5"];
});
await page.evaluate(() => { (window).__rpg.teleportar(82.5, 45, 52.5); });
await pump(40);
await page.evaluate(() => { (window).__rpg.teleportar(60.5, 40, -42.5); });
for (let i = 0; i < 6; i++) { await pump(10); await page.waitForTimeout(100); }
const boss = await page.evaluate(() => {
  const w = (window).__rpg;
  const mobs = w.motor.gestor.mobs.filter((mm) => mm.vivo);
  return {
    vivo: w.capturaRpg().boss,
    mobs: mobs.map((mm) => ({ tipo: mm.tipo, hp: mm.hp, hpMax: mm.hpMax, boss: !!mm.__boss, x: +mm.x.toFixed(1), z: +mm.z.toFixed(1) })),
    regiao: w.capturaRpg().regiao?.id,
  };
});
console.log("chefe:", JSON.stringify(boss, null, 1));

await browser.close();
