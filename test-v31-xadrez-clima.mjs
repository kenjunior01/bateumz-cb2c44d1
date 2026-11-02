// ============================================================
// E2E — v31 XADREZ REAL + CLIMA REAL NO CRAFT
// · Puzzle de Xadrez do Dia (lichess.org/api/puzzle/daily)
//   — formato confirmado empiricamente com chess.js
//   (fen = posição DEPOIS da jogada do adversário; solution = linha UCI)
// · Clima Real no BateuCraft (Open-Meteo: geocoding + forecast)
// Mocks determinísticos por cenário + smokes REAIS:
//   lichess 200 ✅ e geocoding 200 ✅ validados com curl em 2026-11-02;
//   forecast com 429 do IP partilhado → SKIP honesto (documentado).
// Uso: PW_CHROME=<chromium> node test-v31-xadrez-clima.mjs (vite 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0, skipped = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const skip = (name) => { skipped++; console.log(`  ⏭️  ${name} (SKIP honesto)`); };
const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "WebGL", "THREE", "gl context", "shader",
  "Download the React DevTools", "third-party cookie",
];

// ── Puzzles mockados (linhas verificadas com chess.js — mates reais) ─────
const PUZZLES = {
  // 1. Mate em 1: Re8# (torre e1, rei preto g8 atrás dos peões)
  re8: {
    game: {
      id: "qkteste1", perf: { key: "rapid", name: "Rapid" }, rated: true,
      players: [{ name: "JogadorBrancas", rating: 2010, color: "white" }, { name: "JogadorNegras", rating: 1985, color: "black" }],
      pgn: "1. e4 e5 2. Nf3", clock: "10+5",
    },
    puzzle: {
      id: "pzRe8", rating: 1240, plays: 4321, solution: ["e1e8"],
      themes: ["endgame", "fork"], fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      lastMove: "f7f6", initialPly: 41,
    },
  },
  // 2. Mate em 2 (escada): 1.Ra7! (quieto) Kg8 2.Rb8# — resposta do adversário automática
  //    (FEN verificado com chess.js: posição inicial legal, inCheck=false, Rb8# = mate)
  escada: {
    game: {
      id: "qkteste2", perf: { key: "bullet", name: "Bullet" }, rated: false,
      players: [{ name: "AnaTorre", rating: 1750, color: "white" }, { name: "BetoRei", rating: 1720, color: "black" }],
      pgn: "1. e4", clock: "2+1",
    },
    puzzle: {
      id: "pzEscada", rating: 990, plays: 12034, solution: ["a1a7", "h8g8", "b2b8"],
      themes: ["endgame", "rookEndgame"], fen: "7k/8/8/8/8/8/1R6/R5K1 w - - 0 1",
      lastMove: "h7h6", initialPly: 30,
    },
  },
  // 3. Mate em 1 das NEGRAS (tabuleiro virado): Re1#
  negras: {
    game: {
      id: "qkteste3", perf: { key: "blitz", name: "Blitz" }, rated: true,
      players: [{ name: "CarlaBranca", rating: 1600, color: "white" }, { name: "DiogoNegro", rating: 1615, color: "black" }],
      pgn: "1. d4 d5", clock: "5+0",
    },
    puzzle: {
      id: "pzNegras", rating: 1105, plays: 8712, solution: ["e8e1"],
      themes: ["endgame"], fen: "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1",
      lastMove: "g1h1", initialPly: 22,
    },
  },
};
let cenarioPuzzle = "re8";

// ── Cidades/clima mockados (Open-Meteo) ──────────────────────────────────
const CIDADES = [
  { name: "Luanda", country: "Angola", admin1: "Província de Luanda", latitude: -8.84, longitude: 13.23, temp: 27.4, code: 95, vento: 18.2 },  // trovoada
  { name: "Benguela", country: "Angola", admin1: "Benguela", latitude: -12.58, longitude: 13.41, temp: 19.8, code: 61, vento: 9.1 },            // chuva
  { name: "Namibe", country: "Angola", admin1: "Namibe", latitude: -15.19, longitude: 12.15, temp: 22.0, code: 0, vento: 12.0 },                // limpo
  { name: "Menongue", country: "Angola", admin1: "Cuando Cubango", latitude: -14.66, longitude: 17.69, temp: 16.5, code: 73, vento: 4.0 },     // neve (não simulada)
];

async function realSmoke() {
  console.log("\n— Smoke REAL (rede validada com curl em 2026-11-02) —");
  const probe = async (name, url, shape) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return skip(`${name} — HTTP ${res.status}`);
      const data = await res.json();
      ok(`${name} — resposta real válida`, shape(data));
    } catch {
      skip(`${name} — rede indisponível neste momento`);
    }
  };
  await probe("Lichess puzzle diário real", "https://lichess.org/api/puzzle/daily",
    (d) => !!d.puzzle?.id && !!d.puzzle?.fen && Array.isArray(d.puzzle.solution) && d.puzzle.solution.length >= 1);
  await probe("Open-Meteo geocoding real (Luanda)", "https://geocoding-api.open-meteo.com/v1/search?name=Luanda&count=3&language=pt&format=json",
    (d) => Array.isArray(d.results) && d.results.length >= 1 && d.results[0].country === "Angola");
  await probe("Open-Meteo forecast real (Luanda)", "https://api.open-meteo.com/v1/forecast?latitude=-8.84&longitude=13.23&current=temperature_2m,weather_code",
    (d) => d.current && typeof d.current.temperature_2m === "number" && typeof d.current.weather_code === "number");
}

async function main() {
  console.log(`\n♞ v31 XADREZ + CLIMA REAL E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => { consoleErrors.push(String(e)); if (!NOISE.some((n) => String(e).includes(n))) console.log("  [pageerror]", String(e).slice(0, 160)); });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ── Rotas mockadas ──
  const rotaLichess = (route) => {
    console.log("  [rota lichess] serve:", PUZZLES[cenarioPuzzle].puzzle.id);
    route.fulfill({ json: PUZZLES[cenarioPuzzle] });
  };
  await page.route(/lichess\.org\/api\/puzzle\/daily/, rotaLichess);
  await page.route(/geocoding-api\.open-meteo\.com\/v1\/search/, (route) =>
    route.fulfill({ json: { results: CIDADES.map(({ name, country, admin1, latitude, longitude }) => ({ name, country, admin1, latitude, longitude })) } }));
  const forecastHandler = (route) => {
    const u = new URL(route.request().url());
    const lat = parseFloat(u.searchParams.get("latitude") ?? "0");
    const lon = parseFloat(u.searchParams.get("longitude") ?? "0");
    const c = CIDADES.find((x) => Math.abs(x.latitude - lat) < 0.5 && Math.abs(x.longitude - lon) < 0.5) ?? CIDADES[0];
    route.fulfill({ json: { current: { temperature_2m: c.temp, weather_code: c.code, wind_speed_10m: c.vento } } });
  };
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, forecastHandler);
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));

  /** Espera por [data-testid] via waitForFunction (polling JS — estável sob o
      loop a 60fps do jogo, onde o waitForSelector do Playwright falha
      intermitentemente por starvation do rAF). A ação de repetição (opcional)
      corre uma vez antes da segunda espera. Nunca passa em falso: o predicado
      valida o DOM real. */
  const esperarSel = (sel, timeout = 15000, acao = null) =>
    page.waitForFunction(
      (s) => !!document.querySelector(`[data-testid="${s}"]`),
      sel, { timeout },
    ).catch(async () => {
      if (acao) await acao();
      return page.waitForFunction(
        (s) => !!document.querySelector(`[data-testid="${s}"]`),
        sel, { timeout },
      );
    });
  const limparCaches = () => page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  const recarregar = async (url) => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  };

  // ══════════════ 1. PUZZLE DE XADREZ — mate em 1 ══════════════
  console.log("\n— 1. Puzzle de Xadrez do Dia (mock Lichess, mate em 1) —");
  cenarioPuzzle = "re8";
  await limparCaches();
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 45000);
  ok("Tabuleiro 8×8 renderiza (64 casas)", (await page.locator('[data-testid="chesspuzzle-board"] button').count()) === 64);
  ok("Torre branca real na casa e1 (glifo ♜)", (await page.locator('[data-testid="chesspuzzle-sq-e1"]').innerText()).includes("♜"));
  ok("Rating REAL do puzzle visível (1240)", (await page.locator('[data-testid="chesspuzzle-rating"]').innerText()).includes("1240"));
  ok("Nº de jogadas no mundo real (4 321)", /4\s?321/.test(await page.locator('[data-testid="chesspuzzle-contexto"]').innerText()));
  ok("Status: jogam as brancas", (await page.locator('[data-testid="chesspuzzle-status"]').innerText()).includes("BRANCAS"));

  // seleção + alvos legais
  await page.locator('[data-testid="chesspuzzle-sq-e1"]').click();
  await esperarSel("chesspuzzle-alvo-e8", 15000);
  ok("Alvos legais aparecem (dot em e8)", true);
  // jogada legal mas ERRADA (Re7) — contador honesto, nada revelado
  await esperarSel("chesspuzzle-alvo-e7", 15000);
  await page.locator('[data-testid="chesspuzzle-sq-e7"]').click();
  await page.waitForTimeout(250);
  ok("Jogada legal errada conta tentativa (1)", (await page.locator('[data-testid="chesspuzzle-status"]').innerText()).includes("1 tentativa"));
  ok("Torre volta para e1 (nada aplicado)", (await page.locator('[data-testid="chesspuzzle-sq-e1"]').innerText()).includes("♜"));
  // jogada CERTA: Re8#
  await page.locator('[data-testid="chesspuzzle-sq-e1"]').click();
  await esperarSel("chesspuzzle-alvo-e8", 15000);
  await page.locator('[data-testid="chesspuzzle-sq-e8"]').click();
  await esperarSel("chesspuzzle-solved", 15000);
  ok("Puzzle resolvido com Re8#", (await page.locator('[data-testid="chesspuzzle-solved"]').innerText()).includes("Resolvido"));
  ok("Linha oficial em SAN real (Re8#)", (await page.locator('[data-testid="chesspuzzle-solved"]').innerText()).includes("Re8#"));
  ok("Jogadores REAIS do jogo de origem", /JogadorBrancas \(2010\).*JogadorNegras \(1985\)/.test(await page.locator('[data-testid="chesspuzzle-jogadores"]').innerText()));
  ok("Atribuição Lichess CC BY-SA visível", (await page.getByText("© Lichess").count()) === 1);

  // ══════════════ 2. CACHE diário (1 pedido/dia) + stale honesto ══════════════
  console.log("\n— 2. Cache diário + erro honesto —");
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 30000);
  ok("Recarregar serve o puzzle do cache (mesmo dia)", (await page.locator('[data-testid="chesspuzzle-rating"]').innerText()).includes("1240"));
  await page.route(/lichess\.org\/api\/puzzle\/daily/, (route) => route.abort());
  // semeia o puzzle de ONTEM (na forma TRANSFORMADA que a lib grava) e
  // remove o de hoje → caminho stale-on-error honesto
  await page.evaluate((fonte) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const pz = fonte.puzzle;
    localStorage.removeItem("bateumz.lichess.diario." + hoje);
    localStorage.setItem("bateumz.lichess.diario." + ontem, JSON.stringify({
      id: pz.id, fen: pz.fen, lastMove: pz.lastMove, solution: pz.solution,
      rating: pz.rating, plays: pz.plays, themes: pz.themes,
      perfName: fonte.game.perf.name, gameId: fonte.game.id,
      jogadores: fonte.game.players.map((j) => ({ name: j.name, rating: j.rating, color: j.color })),
    }));
  }, PUZZLES.re8);
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 30000);
  ok("Rede em baixo → cache de ontem serve com aviso honesto", (await page.locator('[data-testid="chesspuzzle-decache"]').count()) === 1);
  await limparCaches();
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-error", 30000);
  ok("Sem rede e sem cache → erro HONESTO da Lichess", (await page.locator('[data-testid="chesspuzzle-error"]').innerText()).includes("indisponível"));
  await page.unroute(/lichess\.org\/api\/puzzle\/daily/);
  await page.route(/lichess\.org\/api\/puzzle\/daily/, rotaLichess);
  // clique nativo: o botão desmonta quando o mock responde (corrida com a actionability do Playwright)
  await page.evaluate(() => (document.querySelector('[data-testid="chesspuzzle-retry"]'))?.click());
  await esperarSel("chesspuzzle-board", 30000);
  ok("Retry após erro carrega o puzzle", true);

  // ══════════════ 3. MATE EM 2 — resposta do adversário automática ══════════════
  console.log("\n— 3. Mate em 2 (linha com resposta real) —");
  cenarioPuzzle = "escada";
  await limparCaches();
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 30000);
  await page.locator('[data-testid="chesspuzzle-sq-a1"]').click();
  await esperarSel("chesspuzzle-alvo-a7", 15000);
  await page.locator('[data-testid="chesspuzzle-sq-a7"]').click();
  await page.waitForTimeout(900); // resposta automática do adversário (480 ms)
  ok("Resposta real do adversário: rei foge para g8", (await page.locator('[data-testid="chesspuzzle-sq-g8"]').innerText()).includes("♚"));
  ok("h8 fica vazio depois da fuga", (await page.locator('[data-testid="chesspuzzle-sq-h8"]').innerText()).trim() === "");
  await page.locator('[data-testid="chesspuzzle-sq-b2"]').click();
  await esperarSel("chesspuzzle-alvo-b8", 15000);
  await page.locator('[data-testid="chesspuzzle-sq-b8"]').click();
  await esperarSel("chesspuzzle-solved", 15000);
  const sol2 = await page.locator('[data-testid="chesspuzzle-solved"]').innerText();
  ok("Linha completa em SAN (Ra7 · Kg8 · Rb8#)", sol2.includes("Ra7") && sol2.includes("Rb8#"));
  ok("2 erros = 0 → 10 pontos (sem penalização)", sol2.includes("10 pontos"));

  // ══════════════ 4. NEGRAS A MOVER — tabuleiro virado 180° ══════════════
  console.log("\n— 4. Orientação das negras —");
  cenarioPuzzle = "negras";
  await limparCaches();
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 30000);
  const yE1 = await page.locator('[data-testid="chesspuzzle-sq-e1"]').boundingBox();
  const yE8 = await page.locator('[data-testid="chesspuzzle-sq-e8"]').boundingBox();
  ok("Rank 1 no topo (vista das negras)", yE1.y < yE8.y);
  ok("Status: jogam as negras", (await page.locator('[data-testid="chesspuzzle-status"]').innerText()).includes("NEGRAS"));
  await page.locator('[data-testid="chesspuzzle-sq-e8"]').click();
  await esperarSel("chesspuzzle-alvo-e1", 15000);
  await page.locator('[data-testid="chesspuzzle-sq-e1"]').click();
  await esperarSel("chesspuzzle-solved", 15000);
  ok("Mate das negras resolvido (Re1#)", (await page.locator('[data-testid="chesspuzzle-solved"]').innerText()).includes("Re1#"));

  // ══════════════ 5. MOBILE 375px — sem overflow ══════════════
  console.log("\n— 5. Mobile 375px —");
  cenarioPuzzle = "re8";
  await limparCaches();
  await page.setViewportSize({ width: 375, height: 700 });
  await recarregar(`${BASE}/lives?game=chesspuzzle`);
  await esperarSel("chesspuzzle-board", 30000);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("Sem scroll horizontal a 375px", overflowX <= 2);
  await page.setViewportSize({ width: 1280, height: 800 });

  // ══════════════ 6. CLIMA REAL NO BATEUCRAFT ══════════════
  console.log("\n— 6. Clima Real no BateuCraft (Open-Meteo mock) —");
  await limparCaches();
  await recarregar(`${BASE}/lives?game=mmorpg`);
  await esperarSel("bc-jogar", 60000);
  await page.locator('[data-testid="bc-jogar"]').click();
  await page.waitForTimeout(1500);
  const meteo = () => page.evaluate(() => (window).__blocos?.meteo?.());
  const climaEstado = () => page.evaluate(() => (window).__blocos?.climaEstado?.());

  /** Abre a pausa de forma determinística (com diagnóstico se o modal fugir). */
  const abrirPausaSegura = async () => {
    await page.evaluate(() => { (window).__blocos?.abrirPausa?.(); });
    try {
      await esperarSel("bc-modal-pausa", 15000);
    } catch {
      const diag = await page.evaluate(() => ({
        pausado: (window).__blocos?.motor?.pausado,
        fase: (window).__blocos?.captura?.()?.fase,
        modal: (window).__blocos?.modalAtual?.(),
        modaisNoDom: document.querySelectorAll('[data-testid="bc-modal-pausa"]').length,
        portalsCraft: document.querySelectorAll("body > div.fixed.inset-0").length,
        temCanvas: !!document.querySelector('[data-testid="bc-canvas"]'),
        url: location.href, vw: innerWidth,
      }));
      console.log("  [diagnóstico] modal não ficou aberto:", JSON.stringify(diag));
      // amostragem: flicker ou desapareceu para sempre?
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(250);
        const s = await page.evaluate(() => ({
          dom: document.querySelectorAll('[data-testid="bc-modal-pausa"]').length,
          modal: (window).__blocos?.modalAtual?.(),
          p: (window).__blocos?.motor?.pausado,
        }));
        console.log(`  [amostra ${i}] dom:${s.dom} modal:${s.modal} pausado:${s.p}`);
      }
      await page.evaluate(() => { (window).__blocos?.abrirPausa?.(); });
      await esperarSel("bc-modal-pausa", 15000);
    }
  };

  /** Clique nativo determinístico (o modal da pausa pode re-renderizar sob o Playwright). */
  const clicar = (sel) => page.evaluate((s) => document.querySelector(`[data-testid="${s}"]`)?.click(), sel);
  await abrirPausaSegura();
  await clicar("bc-clima-btn");
  await esperarSel("bc-modal-clima", 15000, () => clicar("bc-clima-btn"));
  ok("Modal Clima Real abre da pausa", true);

  await page.fill('[data-testid="bc-clima-input"]', "Luanda");
  await clicar("bc-clima-buscar");
  await esperarSel("bc-clima-result-0", 15000, () => clicar("bc-clima-buscar"));
  ok("Geocoding devolve 4 cidades reais mockadas", (await page.locator('[data-testid="bc-clima-resultados"] button').count()) === 4);
  await clicar("bc-clima-result-0"); // Luanda, código 95
  await esperarSel("bc-clima-temp", 15000, () => clicar("bc-clima-result-0"));
  const estadoTxt = await page.locator('[data-testid="bc-clima-estado"]').innerText();
  ok("Temperatura REAL (27,4°C) com locale pt-PT", /27[.,]4/.test(estadoTxt));
  ok("Código WMO 95 → trovoada → jogo TEMPESTADE", estadoTxt.includes("TEMPESTADE"));
  ok("Motor recebeu meteo tempestade", (await meteo()) === "tempestade");
  ok("HUD mostra chip real (27°C)", (await page.locator('[data-testid="bc-clima-hud"]').innerText()).includes("27"));
  ok("Atribuição Open-Meteo CC BY 4.0 no painel", estadoTxt.includes("Open-Meteo"));

  // outra cidade → refetch imediato (chuva, código 61)
  await page.fill('[data-testid="bc-clima-input"]', "Benguela");
  await clicar("bc-clima-buscar");
  await esperarSel("bc-clima-result-1", 15000, () => clicar("bc-clima-buscar"));
  await clicar("bc-clima-result-1");
  await page.waitForFunction(() => (window).__blocos?.meteo?.() === "chuva", undefined, { timeout: 15000 });
  ok("Código WMO 61 → chuva no motor", true);
  await page.waitForFunction(() => (document.querySelector('[data-testid="bc-clima-hud"]')?.textContent ?? "").includes("20"), undefined, { timeout: 10000 });
  ok("HUD atualiza para 20°C", true);

  // neve: honestidade — o jogo não simula neve
  await page.fill('[data-testid="bc-clima-input"]', "Menongue");
  await clicar("bc-clima-buscar");
  await esperarSel("bc-clima-result-3", 15000, () => clicar("bc-clima-buscar"));
  await clicar("bc-clima-result-3");
  await page.waitForFunction(() => (document.querySelector('[data-testid="bc-clima-estado"]')?.textContent ?? "").includes("Neve"), undefined, { timeout: 15000 });
  const estadoNeve = await page.locator('[data-testid="bc-clima-estado"]').innerText();
  ok("Neve WMO 73: descrição real + nota honesta", estadoNeve.includes("Neve") && estadoNeve.includes("não simulada"));
  await page.waitForFunction(() => (window).__blocos?.meteo?.() === "limpo", undefined, { timeout: 10000 });
  ok("Neve NUNCA finge chuva (jogo: LIMPO)", estadoNeve.includes("LIMPO"));

  // persistência: recarregar mantém a cidade ativa e volta a pedir o clima
  await recarregar(`${BASE}/lives?game=mmorpg`);
  await esperarSel("bc-jogar", 60000);
  await page.locator('[data-testid="bc-jogar"]').click();
  await page.waitForTimeout(1000);
  const persistida = await climaEstado();
  ok("Clima real persiste após recarregar (cidade)", persistida?.ativa === true && persistida?.cidade === "Menongue");
  await abrirPausaSegura();
  ok("Botão da pausa mostra CLIMA REAL: ON", (await page.locator('[data-testid="bc-clima-btn"]').innerText()).includes("ON"));
  await clicar("bc-clima-btn");
  await esperarSel("bc-clima-estado", 15000, () => clicar("bc-clima-btn"));

  // erro honesto: forecast em baixo → mensagem real, motor segue ciclo simulado
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, (route) => route.abort());
  await page.fill('[data-testid="bc-clima-input"]', "Namibe");
  await clicar("bc-clima-buscar");
  await esperarSel("bc-clima-result-2", 15000, () => clicar("bc-clima-buscar"));
  await clicar("bc-clima-result-2");
  await esperarSel("bc-clima-erro", 15000, () => clicar("bc-clima-result-2"));
  const erroTxt = await page.locator('[data-testid="bc-clima-erro"]').innerText();
  ok("Forecast em baixo → erro HONESTO (sem fingir)", erroTxt.includes("Open-Meteo"));
  ok("Motor segue ciclo simulado em erro", ["limpo", "chuva", "tempestade"].includes(await meteo()));
  await page.unroute(/api\.open-meteo\.com\/v1\/forecast/);
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, forecastHandler);

  // desativar: volta ao clima simulado do motor
  await clicar("bc-clima-desativar");
  await page.waitForTimeout(400);
  const desativado = await climaEstado();
  ok("Desativar: ativa=false e sem cidade", desativado?.ativa === false && desativado?.cidade === null);
  ok("HUD perde o chip real", (await page.locator('[data-testid="bc-clima-hud"]').count()) === 0);
  ok("Persistência gravada como OFF", await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("bateumz.climaReal") || "{}").ativa === false; } catch { return false; }
  }));

  // ══════════════ consola ══════════════
  const errosReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("Sem erros de consola relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   ", errosReais.slice(0, 5));

  await realSmoke();
  await browser.close();

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ ${passed}  ❌ ${failed}  ⏭️ ${skipped}`);
  if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log("  •", f)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
