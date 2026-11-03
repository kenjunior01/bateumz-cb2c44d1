// ============================================================
// E2E — CIDADE BATEU v1 (/cidade)
// Mundo determinístico (semente 20251103), mocks só da rede
// externa (open-meteo). O mundo e a física correm reais.
// Uso: PW_CHROME=<chromium> node test-cidade.mjs  (vite dev 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🏙️  CIDADE BATEU E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // Mocks open-meteo (determinísticos): geocoding + forecast
  await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));

  // ── 1. Ecrã de início ──
  console.log("— Início");
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  ok("ecrã de início visível", await page.getByTestId("cd-inicio").isVisible().catch(() => false));
  ok("título Cidade Bateu", (await page.getByTestId("cd-inicio").textContent().catch(() => "")).includes("Cidade Bateu"));
  await page.waitForFunction(
    () => { const el = document.querySelector("[data-testid=cd-clima-inicio]"); return el && (el.textContent.includes("26,4") || el.textContent.includes("26.4") || el.textContent.includes("dispon\u00edvel")); },
    null, { timeout: 12000 },
  ).catch(() => {});
  ok("chip de clima real (Maputo 26,4°)", /26[.,]4/.test(await page.getByTestId("cd-clima-inicio").textContent()));
  const climaDbg = await page.evaluate(() => window.__cidade?.clima?.());
  if (!climaDbg?.clima) console.log("   ↳ clima debug:", JSON.stringify(climaDbg)?.slice(0, 160));

  // ── 2. Entrar no mundo ──
  console.log("— Mundo");
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 }).catch(() => {});
  ok("fase jogando", await page.evaluate(() => window.__cidade?.fase() === "jogando"));
  await page.evaluate(() => window.__cidade.pump(60));
  const pos = await page.evaluate(() => { const c = window.__cidade.captura(); return { px: c.pos[0], py: c.pos[1], pz: c.pos[2] }; });
  ok("spawn na praça (~0.5, 35, 6.5)", Math.abs(pos.px - 0.5) < 2 && Math.abs(pos.pz - 6.5) < 2 && pos.py > 34 && pos.py < 40);
  ok("sem NaN na posição", Number.isFinite(pos.px) && Number.isFinite(pos.py) && Number.isFinite(pos.pz));

  // ── 3. Cidade determinística (blocos reais) ──
  console.log("— Construção");
  const blocos = await page.evaluate(() => {
    const m = window.__cidade.motor;
    return {
      imbondeiro: m.mundo.getBloco(0, 36, 0),        // tronco do imbondeiro
      praca: m.mundo.getBloco(0, 34, 3),              // pavimento da praça
      paredeSorteios: m.mundo.getBloco(27, 36, 4),    // parede da Casa da Sorte (tábuas)
      janelaArena: m.mundo.getBloco(8, 37, 24),       // vidro? (janela da Arena/Estádio)
      tochaPoste: m.mundo.getBloco(0, 36, -8),        // poste de tocha norte
    };
  });
  ok("imbondeiro no centro (tronco)", blocos.imbondeiro === 7);
  ok("praça pavimentada", blocos.praca === 3 || blocos.praca === 4);
  ok("Casa da Sorte em tábuas (27,36,4)", blocos.paredeSorteios === 9);
  ok("tocha no poste da praça", blocos.tochaPoste === 17);

  // ── 4. Câmaras (5 modos) ──
  console.log("— Câmaras");
  const cams = await page.evaluate(() => {
    const m = window.__cidade.motor;
    const vistas = new Set([m.ciclarCamara(), m.ciclarCamara(), m.ciclarCamara(), m.ciclarCamara(), m.ciclarCamara()]);
    return vistas.size;
  });
  ok("ciclo de 5 câmaras distinto", cams === 5);

  // ── 5. Missões + créditos (visitas reais por proximidade) ──
  console.log("— Missões");
  ok("painel de missões visível", await page.getByTestId("cd-missoes").isVisible().catch(() => false));
  const nMissoes = await page.getByTestId("cd-missoes").locator("div.text-\\[11px\\]").count();
  ok("3 missões urbanas", nMissoes === 3);

  const visitas = [
    ["sorteios", 20.5, 36, 0], ["leiloes", 16.7, 36, 12.2],
    ["lives", -20.5, 36, 0], ["desporto", 6, 36, 19.8],
  ];
  for (const [id, x, y, z] of visitas) {
    await page.evaluate(([px, py, pz]) => { window.__cidade.teleportar(px, py, pz); window.__cidade.pump(20); }, [x, y, z]);
    await sleep(350); // rótulos/proximidade a ~8 Hz
    const perto = await page.evaluate(([px, pz]) => window.__cidade.portalPerto(px, pz)?.distrito?.id ?? null, [x, z]);
    ok(`portal ${id} detetado por proximidade`, perto === id);
  }
  const creditos1 = await page.evaluate(() => window.__cidade.creditos());
  ok(`créditos ganhos por visitas reais (${creditos1} ≥ 15)`, creditos1 >= 15);

  // casa → missão "lar doce lar"
  await page.evaluate(() => { window.__cidade.teleportar(17.5, 36, 4.5); window.__cidade.pump(20); });
  await sleep(350);
  const feitas = await page.evaluate(() => window.__cidade.missao().reclamadas.length);
  ok(`missões concluídas (${feitas} ≥ 2)`, feitas >= 2);
  const creditos2 = await page.evaluate(() => window.__cidade.creditos());
  ok(`créditos somam casa (${creditos2} ≥ 30)`, creditos2 >= 30);

  // ── 6. Portal: CTA navega para a rota real ──
  console.log("— Portal");
  await page.evaluate(() => { window.__cidade.teleportar(-20.5, 36, 0); window.__cidade.olhar(0, -0.1); window.__cidade.pump(20); });
  // tentar yaws até o CTA ficar visível (rótulo precisa de estar virado ao edifício)
  let clicou = false;
  for (const yaw of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) {
    await page.evaluate((y) => { window.__cidade.olhar(y, -0.12); }, yaw);
    await sleep(400);
    const cta = page.getByTestId("cd-portal-cta");
    if (await cta.isVisible().catch(() => false)) { await cta.click(); clicou = true; break; }
  }
  ok("CTA do portal Palco da Praça clicável", clicou);
  await page.waitForURL("**/lives**", { timeout: 6000 }).catch(() => {});
  ok("navegou para /lives (rota real)", page.url().includes("/lives"));

  // ── 7. Sala de Troféus + clima honesto ──
  console.log("— Troféus & clima");
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 }).catch(() => {});
  await page.getByTestId("cd-trofeus-btn").click();
  ok("modal de troféus abre", await page.getByTestId("cd-modal-trofeus").isVisible().catch(() => false));
  const troTexto = await page.getByTestId("cd-modal-trofeus").textContent().catch(() => "");
  ok("troféus mostram créditos reais", troTexto.includes(String(creditos2 >= 30 ? creditos2 : creditos1)));
  ok("atribuição open-meteo visível", troTexto.toLowerCase().includes("open-meteo") || troTexto.includes("Open-Meteo"));
  const climaChip = await page.getByTestId("cd-clima").textContent().catch(() => "");
  ok("chip clima com cidade real ou estado offline honesto", climaChip.length > 0);

  // relógio e meteo do motor
  const hora = (await page.getByTestId("cd-relogio").textContent().catch(() => ""))?.trim() ?? "";
  ok("relógio do mundo no formato HH:MM", /^\d{2}:\d{2}$/.test(hora));

  // ── 8. Mobile: joystick + saltar ──
  console.log("— Mobile");
  await page.setViewportSize({ width: 375, height: 700 });
  await sleep(500);
  ok("joystick visível no móvel", await page.getByTestId("cd-joystick").isVisible().catch(() => false));
  ok("botão saltar visível no móvel", await page.getByTestId("cd-saltar").isVisible().catch(() => false));
  ok("minimapa visível", await page.getByTestId("cd-minimapa").isVisible().catch(() => false));

  // ── 9. Erros de consola ──
  const erros = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros fatais de consola", erros.length === 0);
  if (erros.length) console.log("   ↳ erros:", erros.slice(0, 4));

  await browser.close();
  console.log(`\n══════════════════════════════════`);
  console.log(`  PASSOU: ${passed}  FALHOU: ${failed}`);
  if (fails.length) console.log(`  Falhas: ${fails.join(" · ")}`);
  console.log(`══════════════════════════════════\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
