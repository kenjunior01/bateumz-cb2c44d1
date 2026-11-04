// ============================================================
// E2E — CIDADE BATEU v36: presença partilhada (PoC N3)
// Dois jogadores no mesmo mundo + anti-teleport + bots + offline honesto.
// Padrões Veloren aplicados — ver docs/REA-veloren-estudo-v36.md
// Uso: PW_CHROME=<chromium> node test-mp-v36.mjs  (vite 8099 + servidor 8765)
// ============================================================
import { chromium } from "playwright";
import WebSocket from "ws";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const MP_URL = process.env.MP_URL || "ws://localhost:8765";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// pageerror registado CEDO (o registo tardio não via erros antigos — falha honesta v36)
const pageErrors = new Map(); // nome -> string[]
const escutaErros = (nome, pg) =>
  pg.on("pageerror", (e) => { if (!pageErrors.has(nome)) pageErrors.set(nome, []); pageErrors.get(nome).push(String(e)); });

const MOCKS = (page) => {
  page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  page.route(/air-quality-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { current: { european_aqi: 21, pm2_5: 5.4 } } }));
};

async function entraCidade(browser, nome) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  MOCKS(page);
  escutaErros(nome, page);
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate((n) => { localStorage.setItem("bateu_cidade_nome", n); }, nome);
  // dispatchEvent: clique com 2 motores three.js a correr esmagava o hit-target do Playwright (flake rAF conhecido desde a v31)
  await page.getByTestId("cd-entrar").dispatchEvent("click");
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  await page.evaluate((u) => window.__cidade.mpLigar(u), MP_URL);
  await page.waitForFunction(() => window.__cidade?.mpEstado?.() === "ligado", null, { timeout: 10000 });
  return page;
}

async function main() {
  console.log(`\n🌐 CIDADE MP E2E — ${BASE} · servidor ${MP_URL}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  console.log("— Dois jogadores entram");
  const A = await entraCidade(browser, "Ana-MZ");
  const B = await entraCidade(browser, "Bruno-AO");
  ok("A ligado", await A.evaluate(() => window.__cidade.mpEstado() === "ligado"));
  ok("B ligado", await B.evaluate(() => window.__cidade.mpEstado() === "ligado"));
  ok("B vê Ana nos remotos", await B.evaluate(() => window.__cidade.mpRemotos().some((j) => j.nome === "Ana-MZ")));
  ok("A vê Bruno nos remotos", await A.evaluate(() => window.__cidade.mpRemotos().some((j) => j.nome === "Bruno-AO")));

  // chip do HUD com contagem (2 = Ana + Bruno)
  const chipTxt = await B.getByTestId("cd-mp-n").textContent().catch(() => "");
  ok("chip HUD mostra 2 no mundo", /^\s*2\s/.test(chipTxt ?? ""), `texto="${chipTxt}"`);

  console.log("— Movimento partilhado");
  // v37: passos de 1 bloco/120 ms = 8,3 b/s — o orçamento honesto (MAX_VEL 12)
  // rejeita os antigos saltos de 2 blocos/140 ms (14,3 b/s era velocidade ilegal)
  await A.evaluate(async () => {
    const m = window.__cidade.motor;
    for (let i = 1; i <= 20; i++) {
      window.__cidade.teleportar(i, m.mundo.alturaTerreno(i, 6.5) + 1.02, 6.5);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await B.waitForFunction(() => {
    const a = window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ");
    return a && a.x > 14;
  }, null, { timeout: 8000 }).catch(() => {});
  const posB = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ") ?? null);
  ok("Bruno vê Ana em x≈20", !!posB && posB.x > 14, `x=${posB?.x}`);

  console.log("— Anti-teleport (servidor autoritativo)");
  await A.evaluate(() => window.__cidade.teleportar(100, 36, 6.5)); // salto ilegal de 80 blocos
  await sleep(1200);
  const posClamp = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ") ?? null);
  ok("salto de 100 blocos foi clampado (<25)", !!posClamp && posClamp.x < 25, `x=${posClamp?.x}`);

  console.log("— Cap e bots");
  const bots = [];
  for (let i = 0; i < 8; i++) {
    const ws = new WebSocket(MP_URL);
    ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome: `Bot-${i}` })));
    bots.push(ws);
  }
  await A.waitForFunction(() => (window.__cidade?.mpRemotos?.().length ?? 0) >= 9, null, { timeout: 8000 }).catch(() => {});
  const nRemA = await A.evaluate(() => window.__cidade.mpRemotos().length);
  ok("A vê 8 bots + Bruno = 9 remotos", nRemA === 9, `n=${nRemA}`);
  const chipN2 = await A.getByTestId("cd-mp-n").textContent().catch(() => "");
  ok("chip HUD mostra 10 no mundo", /^\s*10\s/.test(chipN2 ?? ""), `texto="${chipN2}"`);
  for (const ws of bots) try { ws.close(); } catch { /* ignore */ }

  console.log("— Offline honesto");
  // A e B fechados antes de C: 3 motores WebGL no mesmo chromium esmagavam o clique (flake v36 real)
  await A.close(); await B.close();
  const C = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  MOCKS(C);
  escutaErros("C", C);
  await C.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await C.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
  await C.getByTestId("cd-entrar").dispatchEvent("click");
  await C.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  await C.evaluate(() => window.__cidade.mpLigar("ws://localhost:8799")); // nada a ouvir
  await C.waitForFunction(() => window.__cidade?.mpEstado?.() === "erro", null, { timeout: 9000 }).catch(() => {});
  ok("estado honesto 'erro' sem servidor", await C.evaluate(() => window.__cidade.mpEstado() === "erro"));
  ok("chip mostra modo solo/offline", (await C.getByTestId("cd-mp-estado").textContent().catch(() => "")).length > 3);

  // erros de consola reais (registados cedo em escutaErros)
  for (const nome of ["Ana-MZ", "Bruno-AO", "C"]) {
    const errs = pageErrors.get(nome) ?? [];
    ok(`${nome}: sem pageerror na sessão`, errs.length === 0, errs.slice(0, 2).join(" | "));
  }

  await browser.close();
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("FALHA FATAL:", e); process.exit(1); });
