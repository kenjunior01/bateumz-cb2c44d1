// Diagnóstico da física pós-fusão
import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const b = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROME || undefined });
const page = await b.newPage({ viewport: { width: 1100, height: 620 } });
page.on("pageerror", (e) => console.log("PAGEERR:", String(e).slice(0, 200)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.getByTestId("bc-jogar").click();
await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const w = window.__blocos, m = w.motor;
  const fx = Math.floor(m.px), fz = Math.floor(m.pz);
  let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3);
    m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
    for (let dy = 0; dy <= 5; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0);
  }
  w.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
  w.olhar(0, 0);
  w.pump(3);
  const p0 = { x: m.px, y: m.py, z: m.pz, noChao: m.noChao, chaoSolido: m.mundo.solido(Math.floor(m.px), Math.floor(m.py) - 1, Math.floor(m.pz)) };
  m.entrada.frente = 1;
  w.pump(20);
  m.entrada.frente = 0;
  const p1 = { x: m.px, y: m.py, z: m.pz, noChao: m.noChao, blocoSob: m.mundo.getBloco(Math.floor(m.px), Math.floor(m.py) - 1, Math.floor(m.pz)) };
  return { fy, p0, p1 };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
