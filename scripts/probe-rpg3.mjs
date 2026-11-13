// Probe 3b: duelo com o Guardião — direct vs motor attack
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

await page.evaluate(() => {
  const w = (window).__rpg;
  w.perfil().missoes.historiaFeitas = ["h1", "h2", "h3", "h4", "h5"];
  w.teleportar(82.5, 45, 52.5);
});
const pump = (n = 20) => page.evaluate(([t]) => (window).__rpg.pump(t, 0.05), [n]);
await pump(40);
await page.evaluate(() => { (window).__rpg.teleportar(60.5, 40, -42.5); });
await pump(30);

const duel = await page.evaluate(() => {
  const w = (window).__rpg, m = w.motor;
  const i = m.inv.slots.findIndex((s) => s && s.id === 112);
  if (i >= 0) m.inv.selecao = i;
  const log = [];
  for (let t = 0; t < 60; t++) {
    m.passo(0.05);
    w.sistema.tick(0.05);
    m.vida = 20;
    const mob = m.gestor.mobs.find((mm) => mm.vivo && mm.__boss);
    if (!mob) return { fim: true, t, log: log.slice(-8), boss: w.capturaRpg().boss };
    if (t % 10 === 0) {
      const dx2 = mob.x - m.px, dz2 = mob.z - m.pz;
      const yaw2 = Math.atan2(-dx2, -dz2);
      const direct = m.gestor.atacar(m.px, m.py + 1.2, m.pz, yaw2, 3.4, 10);
      const hpAfterDirect = mob.hp;
      const viaMotor = m.atacar();
      log.push({
        t, direct: direct ? { tipo: direct.tipo, hp: +direct.hp.toFixed(1) } : null,
        hpAfterDirect: +hpAfterDirect.toFixed(1),
        motor: viaMotor ? { tipo: viaMotor.tipo, hp: +viaMotor.hp.toFixed(1) } : null,
        hpDepoisMotor: +mob.hp.toFixed(1),
        yaw2: +yaw2.toFixed(2), px: +m.px.toFixed(2), pz: +m.pz.toFixed(2),
        mobx: +mob.x.toFixed(2), mobz: +mob.z.toFixed(2), moby: +mob.y.toFixed(2),
        noite: m.noite, dia: m.dia, fase: m.fase, vida: +m.vida.toFixed(1), pausado: m.pausado,
        selecaoSlot: m.inv.selecionado()?.id ?? null,
      });
    }
  }
  return { fim: false, log: log.slice(-8), boss: w.capturaRpg().boss };
});
console.log(JSON.stringify(duel, null, 1));
await browser.close();
