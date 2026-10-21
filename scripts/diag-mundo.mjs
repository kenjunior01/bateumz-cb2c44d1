// Diagnóstico: porquê o terreno não aparece?
import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const b = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
page.on("console", (m) => { if (m.type() === "error") console.log("ERR:", m.text().slice(0, 200)); });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.getByTestId("bc-jogar").click();
await page.waitForTimeout(3500);
const diag = await page.evaluate(() => {
  const m = window.__blocos.motor;
  const chunks = [...m.mundo.chunks.values()];
  const comMalha = chunks.filter((c) => c.malha);
  const tri = comMalha.reduce((a, c) => a + (c.malha.geometry.index?.count ?? 0) / 3, 0);
  const g0 = comMalha[0]?.malha.geometry;
  const pos0 = g0?.getAttribute("position");
  return {
    fase: m.fase, px: m.px, py: m.py, pz: m.pz,
    terrenoSob: m.mundo.alturaTerreno(Math.floor(m.px), Math.floor(m.pz)),
    chunks: chunks.length, comMalha: comMalha.length, triangulos: tri,
    attrPos: pos0 ? [pos0.count, Array.from(pos0.array.slice(0, 9))] : null,
    index0: g0?.index ? Array.from(g0.index.array.slice(0, 6)) : null,
    uv0: g0?.getAttribute("uv") ? Array.from(g0.getAttribute("uv").array.slice(0, 8)) : null,
    grupoFilhos: m.mundo.grupo.children.length,
    naCena: m.cena.children.map((o) => o.name || o.type).slice(0, 10),
    camara: [m.camara.position.x, m.camara.position.y, m.camara.position.z],
    noChao: m.noChao, vy: m.vy,
  };
});
console.log(JSON.stringify(diag, null, 1));
await b.close();
