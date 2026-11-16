// ============================================================
// SHOTS v53 — PARTILHA VISUAL das edições: o MESMO enquadramento
// do Bruno ANTES e DEPOIS da Ana partir a parede da Casa da Sorte
// (3×3 a x=23, y 35..37, z 2..4). A dupla de imagens É a prova
// visual: o mundo do B muda pela difusão do servidor, sem o B
// fazer nada — só a difusão (o autor não envia nada ao B).
// Uso: PW_CHROME=<chromium> node scripts/shots-v53.mjs (vite 8099 + servidor 8765)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const MP_URL = process.env.MP_URL || "ws://localhost:8765";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCKS = (page) => {
  page.route(/geocoding-api\.open-meteo\.com/, (route) => route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  page.route(/^https:\/\/api\.open-meteo\.com\//, (route) => route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  page.route(/air-quality-api\.open-meteo\.com/, (route) => route.fulfill({ json: { current: { european_aqi: 21, pm2_5: 5.4 } } }));
};

async function entra(browser, nome) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  MOCKS(page);
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate((n) => { localStorage.setItem("bateu_cidade_nome", n); }, nome);
  await page.getByTestId("cd-entrar").dispatchEvent("click");
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 30000 });
  await page.evaluate((u) => window.__cidade.mpLigar(u), MP_URL);
  await page.waitForFunction(() => window.__cidade?.mpEstado?.() === "ligado", null, { timeout: 15000 });
  return page;
}

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const A = await entra(browser, "Ana-MZ");
const B = await entra(browser, "Bruno-AO");

// B caminha PRIMEIRO para o enquadramento (antes de qualquer edição — o
// teleporte direto é ILEGAL: o anti-teleport da v37 recusa d>orçamento, como
// as corridas do shot provaram). O MESMO padrão do drive do E2E: calado +
// passoImediato por waypoint no ritmo do orçamento.
const { rotaAstar } = await import("../test-rotas-cidade.mjs");
await B.evaluate(() => window.__cidade.mpCalado(true));
const rotaB = rotaAstar(0.5, 6.5, 18.5, 3.5); // 4,5 m da parede
for (const [wx, wz] of rotaB) {
  await B.evaluate(([x, z]) => { window.__cidade.teleportar(x, 35.02, z); window.__cidade.mpPassoImediato(x, z, 0, 35.02, false); }, [wx, wz]);
  await sleep(130); // ≤ 1 bloco por 130 ms = 7,7 b/s < MAX_VEL 12 — orçamento honesto
}
await B.evaluate(() => {
  const m = window.__cidade.motor;
  if (m.definirCamara) m.definirCamara("primeira");
  window.__cidade.olhar(-Math.PI / 2, -0.02); // dir = (−sin yaw, −cos yaw) → yaw −90° = olhar +x (este)
  window.__cidade.mpCalado(false);
});
console.log("B caminhou", rotaB.length, "passos pela rota A*");

// ANTES — a parede PRISTINE (sem edições): os banners/confetti assentam
await sleep(13000);
const antesProva = await B.evaluate(() => ({
  voxel35: window.__cidade.motor.mundo.getBloco(23, 35, 3),
  recebidas: window.__cidade.mpEdicoesRemotas().length,
}));
console.log("ANTES:", JSON.stringify(antesProva), "(voxel 35 tem de ser sólido)");
await B.screenshot({ path: "shots-v53/buraco-antes.png" });
console.log("screenshot: shots-v53/buraco-antes.png");

// A parte a ABERTURA 3×3 (a MESMA via do gancho aoEditar, EDIT_RATE_MS honesto)
await A.evaluate(async () => {
  const alvos = [];
  for (const y of [35, 36, 37]) for (const z of [2, 3, 4]) alvos.push([23, y, z, 0]);
  let aceites = 0;
  for (const [x, y, z, id] of alvos) {
    if (window.__cidade.mpReportarEdit(x, y, z, id)) aceites++;
    await new Promise((r) => setTimeout(r, 70));
  }
  console.log("abertura reportada:", aceites, "/ 9");
});
// B recebe as difusões e aplica — o mundo do B muda SEM ele fazer nada
await B.waitForFunction(() => (window.__cidade?.mpEdicoesRemotas?.() ?? []).length >= 9, null, { timeout: 8000 });
// a REMALHA do buraco corre no worker (v51) e o upload acontece no passo do
// rAF (~2 fps no raster por software): espera HONESTA pelo sujo=false do chunk
await B.waitForFunction(() => window.__cidade.motor.mundo.getChunk(1, 0)?.sujo === false, null, { timeout: 20000 }).catch(() => console.log("aviso: sujo ainda true (timeout)"));
await sleep(12000); // a cena assenta (confetti/banners)
const prova = await B.evaluate(() => ({
  voxel35: window.__cidade.motor.mundo.getBloco(23, 35, 3),
  voxel37: window.__cidade.motor.mundo.getBloco(23, 37, 3),
  recebidas: window.__cidade.mpEdicoesRemotas().length,
  solidos: window.__cidade.motor.mundo.solido(23, 35, 3),
  malhadasWorker: window.__cidade.motor.mundo.infoMalha().malhadasWorker,
}));
console.log("DEPOIS (PROVA no mundo do Bruno):", JSON.stringify(prova));
await B.screenshot({ path: "shots-v53/buraco-partilhado.png" });
console.log("screenshot: shots-v53/buraco-partilhado.png");

await browser.close();
