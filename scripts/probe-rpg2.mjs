// Probe 2: porque é que os golpes não registam kills
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.route("**/supabase.co/**", (r) => r.fulfill({ json: [] }));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('[data-testid="rpg-jogar"]'), null, { timeout: 30000, polling: 200 });
await page.locator('[data-testid="rpg-jogar"]').click();
await page.waitForFunction(() => (window).__rpg?.motor?.fase === "jogando", null, { timeout: 30000, polling: 200 });
const pump = (n = 20) => page.evaluate(([t]) => (window).__rpg.pump(t, 0.05), [n]);
await pump(20);

// noite + spawn + um golpe com telemetria
await page.evaluate(() => { (window).__rpg.definirHora(0.85); });
await pump(2);
await page.evaluate(() => { (window).__rpg.spawnarMob("zumbi", 3, 0); });
const passo = async () => await page.evaluate(() => {
  const w = (window).__rpg, m = w.motor;
  const todos = m.gestor.mobs.map((mm) => ({ t: mm.tipo, v: mm.vivo, hp: +mm.hp.toFixed(1), x: +mm.x.toFixed(1), z: +mm.z.toFixed(1) }));
  const mob = m.gestor.mobs.find((mm) => mm.vivo && mm.tipo === "zumbi");
  if (!mob) return { fim: true, todos, kills: w.capturaRpg().kills };
  const dx = mob.x - m.px, dz = mob.z - m.pz;
  m.yaw = Math.atan2(-dx, -dz);
  const antes = mob.hp;
  const ret = w.atacarDirecto();
  return {
    fim: false,
    dist: +Math.hypot(dx, dz).toFixed(2),
    antes, depois: +mob.hp.toFixed(1), ret: !!ret,
    fase: m.fase, yaw: +m.yaw.toFixed(2), px: +m.px.toFixed(1), py: +m.py.toFixed(1),
    selecao: m.inv.selecao, slotId: m.inv.slots[m.inv.selecao]?.id,
    todos,
  };
});
for (let t = 0; t < 12; t++) {
  const s = await passo();
  console.log(`golpe ${t + 1}:`, JSON.stringify(s));
  if (s.fim) break;
  await pump(1);
}
const fin = await page.evaluate(() => ({ kills: (window).__rpg.capturaRpg().kills, xp: (window).__rpg.perfil().xp, vida: (window).__rpg.motor.vida, fase: (window).__rpg.motor.fase }));
console.log("final:", JSON.stringify(fin));
await browser.close();
