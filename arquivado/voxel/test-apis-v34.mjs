// ============================================================
// E2E — APIS PÚBLICAS v34
// Radio Browser (/lives + quiosque) · Wikipédia PT (/community)
// Frankfurter (carteira) · Air Quality (cidade) · Quiz real (cidade)
// Mocks regex determinísticos + smokes REAIS no fim.
// Uso: PW_CHROME=<chromium> node test-apis-v34.mjs  (vite dev 8099)
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
  "media", "stream.teste", "The play()", "autoplay",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fixtures determinísticas ──────────────────────────────────
const estacao = (cc, n) => ({
  stationuuid: `uuid-${cc.toLowerCase()}-${n}`,
  name: `Rádio Teste ${cc} ${n}`,
  url_resolved: `https://stream.teste/${cc}-${n}.mp3`,
  url: `https://stream.teste/${cc}-${n}.mp3`,
  favicon: "", homepage: "https://radio.teste/" + cc.toLowerCase(),
  codec: "MP3", bitrate: 128, tags: "pop,local", votes: 20 - n, countrycode: cc,
});
const RADIO_FIX = {
  MZ: [estacao("MZ", 1), estacao("MZ", 2)],
  AO: [estacao("AO", 1), estacao("AO", 2)],
  CV: [estacao("CV", 1), estacao("CV", 2)],
};

const WIKI_FIX = {
  type: "standard", title: "Imbondeiro",
  extract: "O imbondeiro é uma árvore monumental africana da família das malváceas, icónica nas savanas de Moçambique, Angola e Cabo Verde.",
  thumbnail: { source: "https://upload.wikimedia.org/teste-imbondeiro.jpg" },
  content_urls: { desktop: { page: "https://pt.wikipedia.org/wiki/Imbondeiro" } },
};

const FRANK_FIX = {
  amount: 1.0, base: "USD", start_date: "2026-10-05", end_date: "2026-11-03",
  rates: { "2026-10-05": { EUR: 0.9 }, "2026-10-15": { EUR: 0.91 }, "2026-10-25": { EUR: 0.89 }, "2026-11-03": { EUR: 0.92 } },
};

const AQI_FIX = { latitude: -26.0, longitude: 32.6, current: { european_aqi: 22, pm2_5: 6.4 } };

const FX_RATES = { USD: 1, EUR: 0.92, AOA: 912.5, MZN: 63.9, BRL: 5.42, ZAR: 18.2 };

const triviaQ = (diff, n) => ({
  category: "General Knowledge", type: "multiple", difficulty: diff,
  question: `Pergunta ${diff} ${n}?`,
  correct_answer: `Correta ${diff} ${n}`,
  incorrect_answers: [`Errada A${n}`, `Errada B${n}`, `Errada C${n}`],
});

// Sessão supabase fake (rota /wallet protegida) — padrão v30
const SB = "sb-ngxrdpplyghlugoowjqj-auth-token";
const seedSessao = async (page) => {
  await page.addInitScript(([key]) => {
    const session = {
      access_token: "fake-access-v34", refresh_token: "fake-refresh-v34",
      token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-v34", aud: "authenticated", role: "authenticated",
        email: "testador@bateu.local",
        app_metadata: { provider: "email" },
        user_metadata: { display_name: "Testador" },
        created_at: "2026-01-01T00:00:00Z",
      },
    };
    try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* noop */ }
  }, [SB]);
};

async function main() {
  console.log(`\n📡 APIS PÚBLICAS v34 E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ════════════ 1. /lives — Rádios PALOP (mock) ════════════
  console.log("— /lives · Rádios PALOP (Radio Browser mockado) —");
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.route(/radio-browser\.info\//, (route) => {
    const url = route.request().url();
    const cc = url.includes("/MZ?") ? "MZ" : url.includes("/AO?") ? "AO" : url.includes("/CV?") ? "CV" : null;
    return route.fulfill({ json: cc ? RADIO_FIX[cc] : [] });
  });
  await page.route(/stream\.teste\//, (route) => route.abort()); // stream "offline" para testar erro honesto
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));

  const resp = await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("/lives responde", resp?.status() === 200);
  await page.waitForSelector('[data-testid="livehub-radios"] [data-testid="radios-lista"]', { timeout: 45000 });
  ok("Secção de rádios no LiveHub", true);
  ok("2 estações MZ reais (mock)", await page.locator('[data-testid="radios-lista"] [data-testid^="radio-row-"]').count() === 2);
  ok("Atribuição Radio Browser visível", (await page.locator('[data-testid="radio-atrib"]').innerText()).includes("radio-browser.info"));
  await page.locator('[data-testid="radio-pais-AO"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="radios-lista"]')?.textContent?.includes("Rádio Teste AO"), null, { timeout: 10000 }).catch(() => {});
  ok("Tab Angola troca a lista", (await page.locator('[data-testid="radios-lista"]').innerText()).includes("Rádio Teste AO"));

  // stream offline → erro honesto (nunca finge que toca)
  await page.locator('[data-testid="radio-pais-MZ"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="radios-lista"]')?.textContent?.includes("Rádio Teste MZ"), null, { timeout: 10000 }).catch(() => {});
  await page.locator('[data-testid="radio-btn-0"]').click();
  await page.waitForSelector('[data-testid="radio-erro-stream"]', { timeout: 8000 }).catch(() => {});
  ok("Stream offline → erro honesto visível", await page.locator('[data-testid="radio-erro-stream"]').isVisible().catch(() => false));

  // ════════════ 2. /community — Sabias que? (Wikipédia mock) ════════════
  console.log("— /community · Sabias que? (Wikipédia PT mockada) —");
  await page.route(/pt\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (route) => route.fulfill({ json: WIKI_FIX }));
  const respC = await page.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("/community responde", respC?.status() === 200);
  await page.waitForSelector('[data-testid="sabias-card"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="sabias-titulo"]', { timeout: 15000 });
  ok("Título real do artigo (mock Imbondeiro)", (await page.locator('[data-testid="sabias-titulo"]').innerText()) === "Imbondeiro");
  ok("Extracto real presente", (await page.locator('[data-testid="sabias-texto"]').innerText()).length > 40);
  ok("Link abre o artigo oficial", (await page.locator('[data-testid="sabias-link"]').getAttribute("href"))?.startsWith("https://pt.wikipedia.org/wiki/"));
  ok("Atribuição CC BY-SA visível", (await page.locator('[data-testid="sabias-atrib"]').innerText()).includes("CC BY-SA"));

  // erro honesto + retry (contexto novo: sem cache)
  console.log("— /community · erro honesto com retry —");
  const ctxErro = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageE = await ctxErro.newPage();
  await pageE.route(/pt\.wikipedia\.org\//, (route) => route.abort());
  await pageE.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await pageE.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pageE.waitForSelector('[data-testid="sabias-erro"]', { timeout: 30000 });
  ok("Erro honesto da Wikipédia com retry", true);
  await pageE.route(/pt\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (route) => route.fulfill({ json: WIKI_FIX }));
  await pageE.locator('[data-testid="sabias-retry"]').click();
  await pageE.waitForSelector('[data-testid="sabias-titulo"]', { timeout: 15000 });
  ok("Retry recupera o resumo real", (await pageE.locator('[data-testid="sabias-titulo"]').innerText()) === "Imbondeiro");
  await ctxErro.close();

  // ════════════ 3. /wallet — FxTrend (Frankfurter mock) ════════════
  console.log("— /wallet · tendência 30 dias (Frankfurter mockado) —");
  await seedSessao(page);
  await page.route(/open\.er-api\.com\/v6\/latest\/USD/, (route) =>
    route.fulfill({ json: { result: "success", base_code: "USD", time_last_update_utc: "Mon, 03 Nov 2026 00:02:31 +0000", rates: FX_RATES } }));
  await page.route(/api\.frankfurter\.dev\//, (route) => route.fulfill({ json: FRANK_FIX }));
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fx-result"]', { timeout: 45000 });
  // par por omissão USD→MZN: BCE não publica MZN → nota honesta
  await page.waitForSelector('[data-testid="fx-trend-note"]', { timeout: 15000 });
  ok("MZN → nota honesta 'BCE não publica'", (await page.locator('[data-testid="fx-trend-note"]').innerText()).includes("MZN"));
  // mudar destino para EUR → sparkline real
  await page.locator('[data-testid="fx-to"]').click();
  await page.locator('div[role="option"]:has-text("EUR")').first().click();
  await page.waitForSelector('[data-testid="fx-trend-svg"]', { timeout: 15000 });
  ok("Sparkline SVG renderiza para USD→EUR", await page.locator('[data-testid="fx-trend-svg"]').isVisible());
  const meta = await page.locator('[data-testid="fx-trend-meta"]').innerText();
  ok(`Variação real exibida (${meta.trim()})`, /2[.,]22/.test(meta));
  const range = await page.locator('[data-testid="fx-trend-range"]').innerText();
  ok("Período real da série exibido", range.includes("2026-10-05") && range.includes("2026-11-03"));
  ok("Atribuição Frankfurter/BCE visível", (await page.locator('[data-testid="fx-trend"]').innerText()).includes("BCE"));

  await page.close();

  // ════════════ 4. /cidade — Quiosque + Quiz + AQI ════════════
  console.log("— /cidade · Quiosque da Praça (rádio + quiz reais) —");
  const pageC = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pageC.on("pageerror", (e) => consoleErrors.push(String(e)));
  pageC.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  // mocks da rede externa que a cidade toca
  await pageC.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await pageC.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  await pageC.route(/^https:\/\/air-quality-api\.open-meteo\.com\//, (route) => route.fulfill({ json: AQI_FIX }));
  await pageC.route(/radio-browser\.info\//, (route) => {
    const url = route.request().url();
    const cc = url.includes("/MZ?") ? "MZ" : url.includes("/AO?") ? "AO" : url.includes("/CV?") ? "CV" : null;
    return route.fulfill({ json: cc ? RADIO_FIX[cc] : [] });
  });
  await pageC.route(/stream\.teste\//, (route) => route.abort());
  await pageC.route(/opentdb\.com\//, (route) => {
    const url = route.request().url();
    if (url.includes("api_token.php")) return route.fulfill({ json: { response_code: 0, token: "tok-v34" } });
    if (url.includes("api.php")) {
      const u = new URL(url);
      const diff = u.searchParams.get("difficulty") ?? "easy";
      const n = parseInt(u.searchParams.get("amount") ?? "0", 10);
      return route.fulfill({ json: { response_code: 0, results: Array.from({ length: n || 2 }, (_, i) => triviaQ(diff, i + 1)) } });
    }
    return route.fulfill({ json: { response_code: 1, results: [] } });
  });

  await pageC.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pageC.getByTestId("cd-entrar").click();
  await pageC.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 }).catch(() => {});

  // 4a. bloco do quiosque existe no mundo (determinístico)
  const qui = await pageC.evaluate(() => ({
    balcao: window.__cidade.motor.mundo.getBloco(5, 35, -5),
    telhado: window.__cidade.motor.mundo.getBloco(5, 38, -5),
    tocha: window.__cidade.motor.mundo.getBloco(5, 39, -5),
  }));
  ok("Quiosque carimbado no mundo (balcão/telhado/tocha)", qui.balcao === 15 && qui.telhado === 8 && qui.tocha === 17);

  // 4b. proximidade → portal quiosque
  await pageC.evaluate(() => { window.__cidade.teleportar(5.5, 35.02, -1.5); window.__cidade.pump(20); });
  await sleep(450);
  const tipo = await pageC.evaluate(() => window.__cidade.portalPerto(5.5, -1.5)?.tipo ?? null);
  ok("portalPerto devolve 'quiosque' por proximidade", tipo === "quiosque");
  await pageC.getByTestId("cd-portal-especial").click();
  await pageC.waitForSelector('[data-testid="cd-modal-quiosque"]', { timeout: 8000 });
  ok("Modal do quiosque abre", true);
  await pageC.waitForSelector('[data-testid="cd-modal-quiosque"] [data-testid="radios-lista"]', { timeout: 15000 });
  ok("Tab Rádio lista estações reais (mock)", (await pageC.locator('[data-testid="cd-modal-quiosque"] [data-testid^="radio-row-"]').count()) === 2);

  // 4c. quiz — 6 perguntas reais (mock Open Trivia DB), sempre acerta
  const creditosAntes = await pageC.evaluate(() => window.__cidade.creditos());
  await pageC.locator('[data-testid="cd-quiosque-tab-quiz"]').click();
  await pageC.waitForSelector('[data-testid="cd-quiz-inicio"]', { timeout: 8000 });
  ok("Quiz: intro com nota honesta EN", (await pageC.locator('[data-testid="cd-quiz-inicio"]').innerText()).includes("Open Trivia DB"));
  await pageC.locator('[data-testid="cd-quiz-comecar"]').click();
  const quizCtx = pageC.locator('[data-testid="cd-quiz-jogando"]');
  try {
    await quizCtx.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    const erroQuiz = await pageC.locator('[data-testid="cd-quiz-erro"]').textContent().catch(() => "(sem bloco de erro)");
    const introAinda = await pageC.locator('[data-testid="cd-quiz-inicio"]').isVisible().catch(() => false);
    throw new Error(`Quiz não arrancou · erro UI: ${erroQuiz?.slice(0, 200)} · intro ainda visível: ${introAinda}`);
  }
  for (let r = 0; r < 6; r++) {
    // lição v31: sob o loop 60fps do motor, cliques/esperas do Playwright
    // podem starvar — usamos dispatchEvent + waitForFunction no DOM
    await pageC.waitForFunction(() => !!document.querySelector('[data-testid="cd-quiz-pergunta"]'), null, { timeout: 20000 });
    await pageC.evaluate(() => {
      const btns = [...document.querySelectorAll('[data-testid^="cd-quiz-opcao-"]')];
      const alvo = btns.find((b) => (b.textContent || "").includes("Correta")) ?? btns[0];
      alvo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await pageC.waitForFunction(() => !!document.querySelector('[data-testid="cd-quiz-feedback"]'), null, { timeout: 8000 });
    await pageC.evaluate(() => {
      document.querySelector('[data-testid="cd-quiz-seguinte"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await pageC.waitForFunction(() => !document.querySelector('[data-testid="cd-quiz-feedback"]'), null, { timeout: 8000 });
  }
  await pageC.waitForFunction(() => !!document.querySelector('[data-testid="cd-quiz-resultado"]'), null, { timeout: 8000 });
  ok("Resultado 6/6", (await pageC.locator('[data-testid="cd-quiz-nota"]').innerText()).includes("6/6"));
  ok("+12 créditos exibidos", (await pageC.locator('[data-testid="cd-quiz-creditos"]').innerText()).includes("+12"));
  const creditosDepois = await pageC.evaluate(() => window.__cidade.creditos());
  ok(`Créditos somados de verdade (${creditosAntes} → ${creditosDepois})`, creditosDepois === creditosAntes + 12);
  await pageC.locator('[data-testid="cd-quiosque-fechar"]').click();

  // 4d. AQI real no painel de troféus
  await pageC.getByTestId("cd-trofeus-btn").click();
  await pageC.waitForSelector('[data-testid="cd-aqi-valor"]', { timeout: 15000 });
  const aqi = await pageC.locator('[data-testid="cd-aqi-valor"]').innerText();
  ok(`AQI real exibido (${aqi.trim()})`, aqi.includes("22") && aqi.includes("EAQI"));
  ok("Atribuição Air Quality visível", (await pageC.locator('[data-testid="cd-modal-trofeus"]').innerText()).includes("Open-Meteo"));
  await pageC.close();

  // ════════════ 5. Mobile 390×844 (community, leve) ════════════
  console.log("— Mobile 390×844 —");
  const mpage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mpage.route(/pt\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (route) => route.fulfill({ json: WIKI_FIX }));
  await mpage.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await mpage.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForSelector('[data-testid="sabias-card"]', { timeout: 30000 });
  ok("Sabias que? visível no móvel", await mpage.locator('[data-testid="sabias-titulo"]').isVisible().catch(() => false));
  const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok("Sem overflow horizontal", !overflow);
  await mpage.close();

  // erros de consola (filtra ruído conhecido)
  const erros = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros fatais de consola", erros.length === 0);
  if (erros.length) console.log("   ↳ erros:", erros.slice(0, 5));

  // ════════════ 6. Smokes REAIS (sem mocks) ════════════
  console.log("\n— Smoke real (fontes ao vivo) —");
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  const realFetch = async (url, tries = 2) => {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await p2.evaluate(async (u) => { const res = await fetch(u); return { s: res.status, j: await res.json() }; }, url);
        if (r.s === 200) return r.j;
      } catch { /* retry */ }
      await sleep(1500);
    }
    return null;
  };
  const radiosReal = await realFetch("https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/MZ?limit=5&hidebroken=true&order=votes&reverse=true");
  ok("Radio Browser real: estações MZ", Array.isArray(radiosReal) && radiosReal.length >= 1);
  const wikiReal = await realFetch("https://pt.wikipedia.org/api/rest_v1/page/summary/Mo%C3%A7ambique");
  ok("Wikipédia real: resumo de Moçambique", typeof wikiReal?.extract === "string" && wikiReal.extract.length > 50);
  const frankReal = await realFetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD");
  if (frankReal?.rates?.USD > 0) {
    ok("Frankfurter real: taxa EUR→USD", true);
  } else {
    // 2026-11-04: o edge Cloudflare (HKG) deixou de enviar Access-Control-Allow-Origin
    // → fetch de BROWSER bloqueado por CORS (a app mostra erro honesto — mock cobre a UI).
    // A fonte em si continua viva: verificamos via node (sem CORS).
    const viaNode = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD")
      .then((r) => (r.ok ? r.json() : null)).then((j) => typeof j?.rates?.USD === "number" && j.rates.USD > 0).catch(() => false);
    ok("Frankfurter real: fonte viva (node 200+USD); CORS de browser em falta na fonte — nota honesta", viaNode === true);
  }
  const aqiReal = await realFetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-25.9686&longitude=32.5832&current=european_aqi,pm2_5&timezone=auto");
  ok("Air Quality real: EAQI Maputo", typeof aqiReal?.current?.european_aqi === "number");
  await ctx2.close();

  await browser.close();
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
