// ============================================================
// v87 — TROFÉUS QUE SE MOSTRAM (vitrine no perfil + caminho da eliminatória)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, sem browser): trofeusDoAparelho deriva a vitrine
//    SÓ de campeões reais (vencedorId/campeaoId === "eu" E 1.º na
//    ordem — as duas fontes têm de bater certo), pódios 2.º/3.º
//    (eliminatória eliminada NÃO é pódio), competições com «eu»
//    inscrito; PUREZA provada (a store byte-a-byte igual antes/
//    depois); anti-podre (entradas corruptas ignoradas); ordenação
//    por fecho desc; corteDeRonda (final exige sempre 1.º);
//    estadosBracket (passou/emCurso/eliminado/campeao/pendente)
//    para todos os estados da eliminatória.
// B) E2E (vite + browser, sessão fake padrão v84): vitrine VAZIA
//    honesta com CTA → seed REAL pelo núcleo (campeões com partidas
//    de campo F1 verdadeiras, janelas fechadas por TEMPO manipulado
//    — resultados nunca) → /profile mostra 3 troféus · 1 pódio ·
//    6 competições; bracket ATIVO (r1 emCurso), ELIMINADO (r1
//    eliminado) e CAMPEÃO (r1 passou → final campeao); campeonato
//    SEM bracket; 1280 px sem overflow ×2 + 390 px ×1; i18n EN sem
//    chaves cruas; ZERO pageerror.
// Uso: PW_CHROME=… node test-trofeus-v87.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}${extra ? ` — ${extra}` : ""}`); }
};

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 200)));
  filhos.push(p);
  return p;
}
const matarTodos = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
process.on("exit", () => matarTodos());
process.on("SIGINT", () => { matarTodos(); process.exit(1); });
function limparZumbis() { try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {} }
async function esperarAte(url, testar, ms = 90_000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (testar(r)) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "autoplay", "sourcemap", "Sourcemap",
];

// ── shim de localStorage (núcleo Node-safe mas a store é a mesma) ──
const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};

const entParada = () => ({ acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false });
const AGORA = Date.now();

let es, tr;
let vite = null, browser = null;

async function main() {
  limparZumbis();
  console.log(`\n🏆 TROFÉUS QUE SE MOSTRAM v87 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (trofeus.ts + esport.ts) —");
  // núcleos com imports de irmãos vão a Node pelo BUNDLE esbuild
  // (padrão da casa v60/v80 — trofeus.ts importa ./esport)
  const { execFileSync } = await import("node:child_process");
  const bundleEsport = `${RAIZ}/.v87-esport-bundle.mjs`;
  const bundleTrofeus = `${RAIZ}/.v87-trofeus-bundle.mjs`;
  execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/esport.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundleEsport}`], { stdio: "pipe" });
  execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/trofeus.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundleTrofeus}`], { stdio: "pipe" });
  es = await import(bundleEsport);
  tr = await import(bundleTrofeus);

  const loja = () => localStorage.getItem("bateu_esport_v1") ?? "";

  // 1) store vazia → vitrine vazia honesta
  let r = tr.trofeusDoAparelho();
  ok("store VAZIA → 0 troféus · 0 pódios · 0 competições",
    r.trofeus.length === 0 && r.podios === 0 && r.competicoes === 0);

  // 2) PUREZA: derivar NÃO muta a store (byte-a-byte)
  const antes = loja();
  tr.trofeusDoAparelho();
  ok("PUREZA: trofeusDoAparelho não grava nem expira (store byte-a-byte igual)", loja() === antes);

  // 3) campeão de CAMPEONATO (campo REAL F1, janela fecha por tempo manipulado)
  const baseT = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
  const campoRace = (minhaPos) => {
    const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== minhaPos);
    return ["eu", ...es.RIVAIS_IA].map((id, i) => ({
      id,
      nome: id === "eu" ? "Eu" : es.RIVAIS_IA[i - 1],
      posicao: id === "eu" ? minhaPos : resto[i - 1],
    }));
  };
  const r1 = es.criarTorneio({ ...baseT, nome: "Copa das Lendas de Sexta" }, AGORA);
  es.inscreverTorneio(r1.t.id, "Eu", AGORA + 1);
  es.iniciarTorneio(r1.t.id, AGORA + 2);
  // DUAS vitórias reais (25+25=50) — o Kudisso soma 18+18=36 e fica atrás:
  // o campeão da vitrine é o MESMO que o núcleo coroou (nada de troféu roubado)
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 3);
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 4);
  es.expirarPendentes(AGORA + 8 * 86_400_000); // tempo manipulado — os PONTOS vieram de partidas reais
  r = tr.trofeusDoAparelho();
  const tf1 = r.trofeus[0];
  ok("CAMPEÃO de campeonato → 1 troféu com campos certos (tipo/jogoLabel/formato/prémio/marca)",
    r.trofeus.length === 1 && tf1.tipo === "torneio" && tf1.id.startsWith("torneio-local-kart-")
    && tf1.jogoLabel === "BATEU KART: Circuito das Lendas" && tf1.formato === "campeonato"
    && tf1.premioPontos === 500 && tf1.organizador.tipo === "jogador" && tf1.nome === "Copa das Lendas de Sexta");
  ok("fechadoEm = evento «Janela fechada» do histórico (data real do fecho)",
    tf1.fechadoEm >= r1.t.terminaEm && tf1.fechadoEm === AGORA + 8 * 86_400_000);

  // 4) campeã de LIGA
  const l1 = es.criarLiga({ nome: "Liga de Xadrez do Bairro", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA + 10);
  es.inscreverLiga(l1.l.id, "Eu", AGORA + 11);
  es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 12);
  es.expirarPendentes(AGORA + 15 * 86_400_000);
  r = tr.trofeusDoAparelho();
  ok("CAMPEÃ de liga → 2.º troféu (tipo liga, ordenação por fecho desc)",
    r.trofeus.length === 2 && r.trofeus[0].tipo === "liga" && r.trofeus[0].id.startsWith("liga-local-liga-chess-")
    && r.trofeus[0].fechadoEm >= r.trofeus[1].fechadoEm);

  // 5) BOT campeão + eu 3.º → pódio, NUNCA troféu
  const r2 = es.criarTorneio({ ...baseT, nome: "Copa do Pódio de Domingo" }, AGORA + 20);
  es.inscreverTorneio(r2.t.id, "Eu", AGORA + 21);
  es.iniciarTorneio(r2.t.id, AGORA + 22);
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(3), vitoria: false, posicao: 3, total: 12, campo: campoRace(3) }, AGORA + 23);
  es.expirarPendentes(AGORA + 9 * 86_400_000);
  r = tr.trofeusDoAparelho();
  ok("eu 3.º com BOT campeão (Kudisso 25>15) → 0 troféu NOVO · 1 pódio · honesto",
    r.trofeus.length === 2 && r.podios === 1 && r.competicoes === 3);

  // 6) ELIMINATÓRIA: eu eliminado na r1 (5.º > corte top 4) — nada de pódio
  const e1 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa Eliminatória de Sexta" }, AGORA + 30);
  es.inscreverTorneio(e1.t.id, "Eu", AGORA + 31);
  es.iniciarTorneio(e1.t.id, AGORA + 32);
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(5), vitoria: false, posicao: 5, total: 12, campo: campoRace(5) }, AGORA + 33);
  ok("eliminado na r1 → estado terminado com rondaEliminado=1 e SEM vencedor",
    es.torneioPorId(e1.t.id).estado === "terminado"
    && es.torneioPorId(e1.t.id).participantes.find((p) => p.id === "eu").rondaEliminado === 1);
  r = tr.trofeusDoAparelho();
  ok("ELIMINADO → 0 troféu · 0 pódio (não há jogo de 3.º lugar) · competição conta",
    r.trofeus.length === 2 && r.podios === 1 && r.competicoes === 4);

  // 7) ELIMINATÓRIA: eu CAMPEÃO (r1 2.º passa corte 4 → final 1.º)
  const e2 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa Eliminatória Campeã" }, AGORA + 40);
  es.inscreverTorneio(e2.t.id, "Eu", AGORA + 41);
  es.iniciarTorneio(e2.t.id, AGORA + 42);
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(2), vitoria: false, posicao: 2, total: 12, campo: campoRace(2) }, AGORA + 43);
  es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 44);
  ok("eliminatória ganha → vencedorId «eu» e ronda=rondasTotal",
    es.torneioPorId(e2.t.id).vencedorId === "eu" && es.torneioPorId(e2.t.id).ronda === 2);
  r = tr.trofeusDoAparelho();
  ok("CAMPEÃO de ELIMINATÓRIA → 3.º troféu com formato «eliminatoria»",
    r.trofeus.length === 3 && r.trofeus.some((x) => x.formato === "eliminatoria" && x.tipo === "torneio"));
  ok("competições = 5 (2 campeonatos + liga + 2 eliminatórias com «eu»)",
    r.competicoes === 5);

  // 8) ANTI-PODRE: entradas corruptas ignoradas (nunca quebram nem entram)
  const estadoReal = loja(); // estado REAL antes da corrupção (para restaurar)
  const podre = JSON.parse(estadoReal);
  podre.torneios.push(null, { id: 42, nome: "X", participantes: "não sou array" }, { id: "local-x-1", nome: "Sem organizador", estado: "terminado", vencedorId: "eu", participantes: [{ id: "eu", pontos: 99 }], organizador: null, jogo: "kart", premioPontos: 500, terminaEm: 1, criadoEm: 1, historico: [] });
  podre.ligas.push("string podre", null);
  localStorage.setItem("bateu_esport_v1", JSON.stringify(podre));
  r = tr.trofeusDoAparelho();
  ok("ANTI-PODRE: entradas corruptas ignoradas — vitrine mantém 3 troféus e não quebra",
    r.trofeus.length === 3 && r.podios === 1 && r.competicoes === 5);
  localStorage.setItem("bateu_esport_v1", estadoReal); // restauro do estado real de antes

  // 9) corteDeRonda: final exige SEMPRE 1.º · rondas cortam top tamanho/2^r
  ok("corteDeRonda: 8→r1 top 4 · final top 1 · 4→r1 top 2 · final top 1 (e corteRonda delega)",
    es.corteDeRonda(8, 1, 2) === 4 && es.corteDeRonda(8, 2, 2) === 1
    && es.corteDeRonda(4, 1, 2) === 2 && es.corteDeRonda(4, 2, 2) === 1
    && es.corteRonda(es.torneioPorId(e2.t.id)) === 1
    && es.corteRonda(es.torneioPorId(r1.t.id)) === 0);

  // 10) estadosBracket — todos os estados reais da eliminatória
  ok("bracket: campeonato devolve [] (não é eliminatória)",
    JSON.stringify(es.estadosBracket(es.torneioPorId(r1.t.id))) === "[]");
  ok("bracket ELIMINATÓRIA CAMPEÃ → [passou, campeao]",
    JSON.stringify(es.estadosBracket(es.torneioPorId(e2.t.id))) === '["passou","campeao"]');
  ok("bracket ELIMINADO r1 → [eliminado, pendente] (resto honesto)",
    JSON.stringify(es.estadosBracket(es.torneioPorId(e1.t.id))) === '["eliminado","pendente"]');
  const e3 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa Eliminatória em Curso" }, AGORA + 50);
  es.inscreverTorneio(e3.t.id, "Eu", AGORA + 51);
  ok("bracket em INSCRIÇÃO → [pendente, pendente]",
    JSON.stringify(es.estadosBracket(es.torneioPorId(e3.t.id))) === '["pendente","pendente"]');
  es.iniciarTorneio(e3.t.id, AGORA + 52);
  ok("bracket ATIVO ronda 1 → [emCurso, pendente]",
    JSON.stringify(es.estadosBracket(es.torneioPorId(e3.t.id))) === '["emCurso","pendente"]');

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: vitrine no perfil + bracket) —");
  vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/tournaments`, (x) => x.status < 500, 90_000));

  const { chromium } = await import("playwright");
  browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // sessão fake (padrão v84) — /profile é rota protegida
  const SB = (() => {
    const l = readFileSync(`${RAIZ}/.env`, "utf-8").split("\n").find((x) => x.startsWith("VITE_SUPABASE_URL=")) || "";
    return (l.split("=")[1] || "https://ngxrdpplyghlugoowjqj.supabase.co").replace(/["']/g, "").trim();
  })();
  const REF = new URL(SB).hostname.split(".")[0];
  const UID = "87e2e000-0000-4000-8000-00000000e287";
  const sessaoFake = () => ({
    access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
    user: { id: UID, aud: "authenticated", role: "authenticated", email: "ester87@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });

  async function novoCenario(seedEstado, lang) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "pt-PT" });
    const erros = [];
    await ctx.route(`**${new URL(SB).host}/**`, (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessaoFake()) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await ctx.addInitScript(([ref, estado, idioma, uid]) => {
      if (estado) localStorage.setItem("bateu_esport_v1", estado);
      if (idioma) { localStorage.setItem("bateu_lang", idioma); localStorage.setItem("bateu_lang_explicit", "1"); }
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
        access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
        user: { id: uid, aud: "authenticated", role: "authenticated", email: "ester87@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }));
    }, [REF, seedEstado, lang ?? null, UID]);
    const pg = await ctx.newPage();
    pg.on("pageerror", (e) => erros.push(String(e)));
    pg.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
    return { ctx, pg, erros };
  }

  // B1 · vitrine VAZIA honesta (aparelho sem e-sport)
  console.log("■ B1. Vitrine vazia honesta");
  {
    const { ctx, pg, erros } = await novoCenario(null);
    await pg.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await pg.waitForSelector('[data-testid="perfil-trofeus"]', { timeout: 45_000 });
    await dormir(600);
    ok("vitrine à vista no perfil", await pg.locator('[data-testid="perfil-trofeus"]').count() === 1);
    ok("VAZIO honesto: «Ainda sem troféus» + CTA real para /tournaments",
      await pg.locator('[data-testid="perfil-trofeus-vazio"]').count() === 1
      && await pg.locator('[data-testid="perfil-trofeus-cta"]').getAttribute("href") === "/tournaments"
      && await pg.locator('[data-testid="perfil-trofeus-lista"]').count() === 0);
    ok("chips a ZERO (nada inventado)",
      (await pg.locator('[data-testid="perfil-trofeus-chip-trofeus"]').innerText()).trim().startsWith("0")
      && (await pg.locator('[data-testid="perfil-trofeus-chip-podios"]').innerText()).trim().startsWith("0")
      && (await pg.locator('[data-testid="perfil-trofeus-chip-competicoes"]').innerText()).trim().startsWith("0"));
    ok("B1 zero erros reais de consola", erros.filter((e) => !NOISE.some((n) => e.includes(n))).length === 0);
    await ctx.close();
  }

  // B2 · seed REAL pelo núcleo (APARELHO NOVO — a store de A é limpa: cada
  // metade da suíte simula um dispositivo próprio; senão as partidas da seed
  // alimentavam os torneios ATIVOS deixados por A — o bus alimenta TODOS os
  // ativos do mesmo jogo, por design) → vitrine cheia
  console.log("■ B2. Vitrine com campeões reais (seed pelo núcleo esport)");
  const seed = (() => {
    MEMORIA.clear(); // aparelho novo para a seed E2E (limpo e honesto)
    const b = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
    const campo = (mp) => {
      const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== mp);
      return ["eu", ...es.RIVAIS_IA].map((id, i) => ({ id, nome: id === "eu" ? "Eu" : es.RIVAIS_IA[i - 1], posicao: id === "eu" ? mp : resto[i - 1] }));
    };
    const A = Date.now();
    const tA = es.criarTorneio({ ...b, nome: "Copa E2E das Lendas" }, A);
    es.inscreverTorneio(tA.t.id, "Eu", A + 1); es.iniciarTorneio(tA.t.id, A + 2);
    // duas vitórias reais → eu CAMPEÃO (50 > Kudisso 36)
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 3);
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 4);
    es.expirarPendentes(A + 8 * 86_400_000);
    const tB = es.criarTorneio({ ...b, nome: "Copa E2E do Pódio" }, A + 10);
    es.inscreverTorneio(tB.t.id, "Eu", A + 11); es.iniciarTorneio(tB.t.id, A + 12);
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(3), vitoria: false, posicao: 3, total: 12, campo: campo(3) }, A + 13);
    es.expirarPendentes(A + 9 * 86_400_000);
    const lA = es.criarLiga({ nome: "Liga E2E de Xadrez", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, A + 20);
    es.inscreverLiga(lA.l.id, "Eu", A + 21);
    es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, A + 22);
    es.expirarPendentes(A + 15 * 86_400_000);
    // ORDEM IMPORTA (uma partida alimenta TODOS os ativos do jogo):
    // primeiro a eliminada (com a partida), depois a campeã (com as suas 2),
    // e a ATIVA por ÚLTIMO — nenhuma partida depois dela a toca.
    const eE = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa E2E Eliminada" }, A + 40);
    es.inscreverTorneio(eE.t.id, "Eu", A + 41); es.iniciarTorneio(eE.t.id, A + 42);
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(5), vitoria: false, posicao: 5, total: 12, campo: campo(5) }, A + 43);
    const eC = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa E2E Eliminatória Campeã" }, A + 50);
    es.inscreverTorneio(eC.t.id, "Eu", A + 51); es.iniciarTorneio(eC.t.id, A + 52);
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(2), vitoria: false, posicao: 2, total: 12, campo: campo(2) }, A + 53);
    es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 54);
    const eA = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa E2E Eliminatória Ativa" }, A + 60);
    es.inscreverTorneio(eA.t.id, "Eu", A + 61); es.iniciarTorneio(eA.t.id, A + 62);
    const resumo = tr.trofeusDoAparelho();
    return {
      estado: localStorage.getItem("bateu_esport_v1"),
      ids: { campeonato: tA.t.id, ativo: eA.t.id, eliminado: eE.t.id, campeao: eC.t.id },
      esperado: { trofeus: resumo.trofeus.length, podios: resumo.podios, competicoes: resumo.competicoes },
    };
  })();
  console.log(`   seed: trofeus=${seed.esperado.trofeus} podios=${seed.esperado.podios} competicoes=${seed.esperado.competicoes}`);

  {
    const { ctx, pg, erros } = await novoCenario(seed.estado);
    await pg.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await pg.waitForSelector('[data-testid="perfil-trofeus-lista"]', { timeout: 45_000 });
    await dormir(700);
    ok("vitrine VAZIA sai — lista com os 3 cartões de troféu reais",
      await pg.locator('[data-testid="perfil-trofeus-vazio"]').count() === 0
      && (await pg.locator('[data-testid="perfil-trofeus-lista"] > div').count()) === seed.esperado.trofeus);
    const chips = {
      trofeus: (await pg.locator('[data-testid="perfil-trofeus-chip-trofeus"]').innerText()).trim(),
      podios: (await pg.locator('[data-testid="perfil-trofeus-chip-podios"]').innerText()).trim(),
      competicoes: (await pg.locator('[data-testid="perfil-trofeus-chip-competicoes"]').innerText()).trim(),
    };
    ok(`chips = números do NÚCLEO (${seed.esperado.trofeus}/${seed.esperado.podios}/${seed.esperado.competicoes})`,
      chips.trofeus.startsWith(String(seed.esperado.trofeus))
      && chips.podios.startsWith(String(seed.esperado.podios))
      && chips.competicoes.startsWith(String(seed.esperado.competicoes)), JSON.stringify(chips));
    ok("selo CAMPEÃO + prémio em Pontos Bateu nos cartões",
      (await pg.locator('[data-testid="perfil-trofeus-selo-campeao"]').count()) === seed.esperado.trofeus
      && (await pg.locator('[data-testid="perfil-trofeus-premio"]').count()) === seed.esperado.trofeus);
    ok("troféu da EMPRESA com marca (qualquer troféu organizado por empresa mantém iniciais)",
      (await pg.locator('[data-trofeu-tipo]').count()) === seed.esperado.trofeus);
    ok("B2 zero erros reais de consola", erros.filter((e) => !NOISE.some((n) => e.includes(n))).length === 0, erros.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // B3 · bracket visual nos 3 estados + campeonato SEM bracket
  console.log("■ B3. Bracket honesto (caminho do jogador)");
  {
    const { ctx, pg, erros } = await novoCenario(seed.estado);
    await pg.goto(`${BASE}/tournaments/${seed.ids.campeao}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await pg.waitForSelector('[data-testid="torneio-local-bracket"]', { timeout: 45_000 });
    ok("CAMPEÃO da eliminatória → r1 «passou» + FINAL «campeao»",
      (await pg.locator('[data-testid="torneio-local-bracket-r1"]').getAttribute("data-estado")) === "passou"
      && (await pg.locator('[data-testid="torneio-local-bracket-r2"]').getAttribute("data-estado")) === "campeao");
    ok("nota honesta do bracket presente (o corte é a TUA posição real)",
      (await pg.locator('[data-testid="torneio-local-bracket-nota"]').count()) === 1);

    await pg.goto(`${BASE}/tournaments/${seed.ids.ativo}`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector('[data-testid="torneio-local-bracket"]', { timeout: 45_000 });
    ok("ATIVO ronda 1 → r1 «emCurso» + final «pendente»",
      (await pg.locator('[data-testid="torneio-local-bracket-r1"]').getAttribute("data-estado")) === "emCurso"
      && (await pg.locator('[data-testid="torneio-local-bracket-r2"]').getAttribute("data-estado")) === "pendente");

    await pg.goto(`${BASE}/tournaments/${seed.ids.eliminado}`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector('[data-testid="torneio-local-bracket"]', { timeout: 45_000 });
    ok("ELIMINADO r1 → r1 «eliminado» + final «pendente» (nada escondido)",
      (await pg.locator('[data-testid="torneio-local-bracket-r1"]').getAttribute("data-estado")) === "eliminado"
      && (await pg.locator('[data-testid="torneio-local-bracket-r2"]').getAttribute("data-estado")) === "pendente");

    await pg.goto(`${BASE}/tournaments/${seed.ids.campeonato}`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector('[data-testid="torneio-local-nome"]', { timeout: 45_000 });
    ok("CAMPEONATO não mostra bracket (estadosBracket [] → null)",
      (await pg.locator('[data-testid="torneio-local-bracket"]').count()) === 0);
    ok("B3 zero erros reais de consola", erros.filter((e) => !NOISE.some((n) => e.includes(n))).length === 0);
    await ctx.close();
  }

  // B4 · sem overflow (desktop 1280 ×2 rotas + mobile 390 ×1)
  console.log("■ B4. Sem overflow (padrão nav-v79 §6)");
  {
    const { ctx, pg } = await novoCenario(seed.estado);
    for (const rota of ["/profile", `/tournaments/${seed.ids.campeao}`]) {
      await pg.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
      await pg.waitForSelector('[data-testid="perfil-trofeus"], [data-testid="torneio-local-nome"]', { timeout: 45_000 });
      await dormir(700);
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`1280 px sem overflow em ${rota}`, over <= 0, `over=${over}`);
    }
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-PT" });
    await m.route(`**${new URL(SB).host}/**`, (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessaoFake()) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await m.addInitScript(([ref, estado, uid]) => {
      if (estado) localStorage.setItem("bateu_esport_v1", estado);
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
        access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
        user: { id: uid, aud: "authenticated", role: "authenticated", email: "ester87@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }));
    }, [REF, seed.estado, UID]);
    const pgm = await m.newPage();
    await pgm.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
    await pgm.waitForSelector('[data-testid="perfil-trofeus-lista"]', { timeout: 45_000 });
    await dormir(700);
    const overM = await pgm.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("390 px (móvel) sem overflow no perfil com troféus", overM <= 0, `over=${overM}`);
    await m.close();
    await ctx.close();
  }

  // B5 · i18n EN: sem chaves cruas nas superfícies novas
  console.log("■ B5. i18n EN sem chaves cruas");
  {
    const { ctx, pg } = await novoCenario(seed.estado, "en");
    await pg.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector('[data-testid="perfil-trofeus-lista"]', { timeout: 45_000 });
    await dormir(800); // settle — arranque frio do vite hidrata a i18n depois do 1.º paint (lição v86.1)
    const html = await pg.content();
    const cruas = html.match(/perfil\.trofeus\.[a-zA-Z.]+|esport\.bracket\.[a-zA-Z.]+/g);
    const titulo = await pg.locator('[data-testid="perfil-trofeus-titulo"]').innerText();
    ok("i18n EN: «Trophy cabinet» renderiza e NENHUMA chave crua aparece",
      !cruas && /trophy cabinet/i.test(titulo), cruas ? Array.from(new Set(cruas)).join(",") : "");
    await pg.goto(`${BASE}/tournaments/${seed.ids.campeao}`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector('[data-testid="torneio-local-bracket"]', { timeout: 45_000 });
    await dormir(600);
    const html2 = await pg.content();
    const cruas2 = html2.match(/perfil\.trofeus\.[a-zA-Z.]+|esport\.bracket\.[a-zA-Z.]+/g);
    ok("i18n EN no bracket: nenhum chave crua (Knockout path)",
      !cruas2 && /knockout path/i.test(await pg.locator('[data-testid="torneio-local-bracket"]').innerText()));
    await ctx.close();
  }

  // ── fim ──────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`TROFÉUS QUE SE MOSTRAM v87: ${passed} verdes, ${failed} vermelhos`);
  if (fails.length) { console.log("FALHAS:"); for (const f of fails) console.log(`  ✗ ${f}`); }
  console.log("══════════════════════════════════════════════════════════");
  process.exit(failed === 0 ? 0 : 1);
}

main().finally(async () => {
  matarTodos();
  if (browser) { try { await browser.close(); } catch {} }
});
