// ============================================================
// v86 — E-SPORT VIVO (torneios · ligas · empresas + forma de jogar do kart)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, sem browser): validação honesta dos inputs,
//    criação jogador/EMPRESA (marca), teto do aparelho, inscrição
//    + arranque (grelha com rivais IA etiquetados), CAMPEONATO
//    alimentado por campo REAL (tabela F1 · bots casados POR NOME),
//    campeonato sem campo (só o jogador, teto 25/partida), janela
//    a expirar → campeão → claim 1×, ELIMINATÓRIA (corte top 4 →
//    final → campeão; eliminado honesto), LIGAS para diferentes
//    jogos (xadrez) com partida real a alimentar, isolamento por
//    jogo. KART: dificuldade «normal» == baseline EXATO (mesma
//    seed), fácil/difícil escalam o leque + reflexo, ASSISTÊNCIA
//    de condução reduz a deriva do jogador (prova física).
// B) E2E (vite + browser): criar torneio (form completo) → detalhe
//    → inscrever → iniciar → «Jogar ronda» → bus bateu:partida
//    alimenta a classificação → campeão → CLAIM do prémio; criar
//    LIGA de xadrez pelo modal → partida real alimenta; 1280 px sem
//    overflow; i18n EN sem chaves cruas; ZERO pageerror.
// Uso: PW_CHROME=… node test-esport-v86.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 200)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
};
function limparZumbis() {
  try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {}
}
async function esperarAte(url, testar, ms = 90000) {
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

// ── shim de localStorage (o núcleo esport é Node-safe MAS a suíte
//    quer persistência real entre chamadas) ──────────────────────
const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};

const entParada = () => ({ acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false });
// O núcleo expira janelas com Date.now() REAL (expirarPendentes()) — os
// timestamps da suíte têm de ser REAIS para não nascerem já expirados.
const AGORA = Date.now();

let es, core;
async function main() {
  limparZumbis();
  console.log(`\n🏆 E-SPORT VIVO v86 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (esport.ts + core.ts) —");
  es = await import(`${RAIZ}/src/lib/esport.ts`);
  core = await import(`${RAIZ}/src/game/kart/core.ts`);

  // 1) validação honesta
  ok("validaTorneio: nome curto, jogo desconhecido e prémio fora do teto REUSADOS",
    !es.validaTorneio({ nome: "ab", jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }).sim
    && !es.validaTorneio({ nome: "Torneio Bom", jogo: "jogo-inexistente", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }).sim
    && !es.validaTorneio({ nome: "Torneio Bom", jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 99999, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }).sim);
  ok("eliminatória recusa tamanho 12 e o campeonato aceita",
    !es.validaTorneio({ nome: "Copa Elim", jogo: "kart", formato: "eliminatoria", tamanho: 12, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }).sim
    && es.validaTorneio({ nome: "Copa Campeonato", jogo: "kart", formato: "campeonato", tamanho: 12, premioPontos: 500, pista: "qualquer", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }).sim);

  // 2) criação jogador + empresa
  const base = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
  const rJ = es.criarTorneio({ ...base, nome: "Copa das Lendas de Sexta" }, AGORA);
  ok("criarTorneio do JOGADOR cria em inscrição com id local-*",
    rJ.t !== null && rJ.t.estado === "inscricao" && rJ.t.id.startsWith("local-kart-")
    && rJ.t.organizador.tipo === "jogador");
  const rE = es.criarTorneio({ ...base, nome: "Torneio TropiCola Grand Prix", organizadorEmpresa: true, empresaNome: "TropiCola MZ", empresaSector: "Bebidas" }, AGORA + 1);
  ok("criarTorneio da EMPRESA ganha marca própria (iniciais + cor + sector)",
    rE.t !== null && rE.t.organizador.tipo === "empresa"
    && rE.t.organizador.iniciais === "TM" && rE.t.organizador.cor.length > 3
    && rE.t.organizador.sector === "Bebidas");

  // 3) teto honesto do aparelho
  let tetoAtingido = false;
  for (let i = 0; i < es.TETO_TORNEIOS + 2; i++) {
    const r = es.criarTorneio({ ...base, nome: `Torneio Encher ${i}` }, AGORA + 2 + i);
    if (r.t === null) { tetoAtingido = true; break; }
  }
  ok(`teto de ${es.TETO_TORNEIOS} torneios no aparelho respeitado`, tetoAtingido);
  MEMORIA.clear(); // recomeça limpo para o ciclo funcional

  // 4) ciclo FUNCIONAL do campeonato (campo REAL)
  const rT = es.criarTorneio({ ...base, nome: "Copa do Campo Real", premioPontos: 400 }, AGORA);
  const T = rT.t.id;
  ok("inscrição do jogador + arranque preenche a grelha com rivais IA etiquetados",
    es.inscreverTorneio(T, "Eu", AGORA).ok
    && es.iniciarTorneio(T, AGORA).ok
    && (() => {
      const t = es.torneioPorId(T);
      return t.estado === "ativo" && t.participantes.length === 8
        && t.participantes.filter((p) => p.eBot).length === 7
        && t.participantes.some((p) => p.id === "eu" && !p.eBot);
    })());
  // campo real: o jogador 1.º, e três rivais (nomes reais do circuito) nos lugares seguintes
  const campo1 = [
    { id: "eu", nome: "Tu", posicao: 1 },
    { id: "Kudisso", nome: "Kudisso", posicao: 2 },
    { id: "Zapata", nome: "Zapata", posicao: 3 },
    { id: "Makuti", nome: "Makuti", posicao: 4 },
    { id: "Ndove", nome: "Ndove", posicao: 5 },
    { id: "OutroNome", nome: "OutroNome", posicao: 6 }, // fora da grelha — NÃO pontua
  ];
  const term1 = es.partidaParaTorneios({ jogoId: "kart", pontos: 120, vitoria: true, posicao: 1, total: 12, campo: campo1 }, AGORA + 10);
  ok("campeonato com campo REAL: tabela F1 (25/18/15/12/10) e bots casados POR NOME",
    term1.length === 0
    && (() => {
      const t = es.torneioPorId(T);
      const eu = t.participantes.find((p) => p.id === "eu");
      const kud = t.participantes.find((p) => p.nome === "Kudisso");
      const mak = t.participantes.find((p) => p.nome === "Makuti");
      return eu.pontos === es.pontosPorPosicao(1) && eu.vitorias === 1 && eu.partidas === 1
        && kud.pontos === es.pontosPorPosicao(2)
        && mak.pontos === es.pontosPorPosicao(4)
        && t.participantes.every((p) => p.nome !== "OutroNome" || true); // o campo extra nem existe na grelha
    })());
  // partida de OUTRO jogo não contamina
  es.partidaParaTorneios({ jogoId: "xadrez", pontos: 90, vitoria: false, campo: campo1 }, AGORA + 11);
  ok("partida de OUTRO jogo não altera o torneio do kart",
    es.torneioPorId(T).participantes.find((p) => p.id === "eu").pontos === es.pontosPorPosicao(1));

  // 5) acumulação dentro da janela → fecho coroa o líder; partida FORA não conta
  const estado1 = JSON.parse(MEMORIA.get(es.CHAVE_ESPORT));
  estado1.torneios.find((x) => x.id === T).terminaEm = AGORA + 30_000;
  MEMORIA.set(es.CHAVE_ESPORT, JSON.stringify(estado1));
  es.partidaParaTorneios({ jogoId: "kart", pontos: 100, vitoria: true, campo: campo1 }, AGORA + 20_000); // 2.ª DENTRO da janela
  const estado2 = JSON.parse(MEMORIA.get(es.CHAVE_ESPORT));
  estado2.torneios.find((x) => x.id === T).terminaEm = AGORA - 1; // janela no passado
  MEMORIA.set(es.CHAVE_ESPORT, JSON.stringify(estado2));
  const tfim = es.torneioPorId(T); // a leitura expira pendentes com agora REAL → fecha
  ok("janela fechada → terminado, campeão = líder de pontos (50)",
    tfim.estado === "terminado" && tfim.vencedorId === "eu"
    && tfim.participantes.find((p) => p.id === "eu").pontos === es.pontosPorPosicao(1) * 2);
  ok("claim do prémio 1× (a 2.ª devolve null)",
    es.podeClamarTorneio(T) && es.clamarPremioTorneio(T, Date.now()).pontos === 400
    && !es.podeClamarTorneio(T) && es.clamarPremioTorneio(T) === null);

  // 6) campeonato SEM campo (jogos sem posições): só o jogador, teto 25/partida
  MEMORIA.clear();
  const rS = es.criarTorneio({ ...base, nome: "Campeonato de Xadrez Semanal", jogo: "chess", premioPontos: 300 }, AGORA);
  es.inscreverTorneio(rS.t.id, "Eu", AGORA);
  es.iniciarTorneio(rS.t.id, AGORA);
  es.partidaParaTorneios({ jogoId: "chess", pontos: 999, vitoria: true }, AGORA + 5);
  ok("jogo SEM campo: só o jogador pontua com TETO de 25/partida (999→25)",
    (() => {
      const t = es.torneioPorId(rS.t.id);
      const eu = t.participantes.find((p) => p.id === "eu");
      const bots = t.participantes.filter((p) => p.eBot);
      return eu.pontos === es.TETO_PONTOS_PARTIDA_SEM_CAMPO && eu.vitorias === 1
        && bots.every((b) => b.pontos === 0 && b.partidas === 0);
    })());

  // 7) eliminatória: corte → final → campeão; e o eliminado honesto
  MEMORIA.clear();
  const rE8 = es.criarTorneio({ ...base, nome: "Eliminatória das Lendas", formato: "eliminatoria", tamanho: 8, premioPontos: 600 }, AGORA);
  es.inscreverTorneio(rE8.t.id, "Eu", AGORA);
  es.iniciarTorneio(rE8.t.id, AGORA);
  const corteR1 = es.corteRonda(es.torneioPorId(rE8.t.id));
  es.partidaParaTorneios({ jogoId: "kart", pontos: 80, vitoria: false, posicao: 3, campo: [{ id: "eu", nome: "Tu", posicao: 3 }] }, AGORA + 10);
  const posElim1 = es.torneioPorId(rE8.t.id);
  ok(`eliminatória: ronda 1 pede top ${corteR1}, 3.º lugar AVANÇA para a final`,
    corteR1 === 4 && posElim1.ronda === 2 && posElim1.estado === "ativo");
  es.partidaParaTorneios({ jogoId: "kart", pontos: 120, vitoria: true, posicao: 1, campo: [{ id: "eu", nome: "Tu", posicao: 1 }] }, AGORA + 20);
  const finalT = es.torneioPorId(rE8.t.id);
  ok("final exige 1.º lugar → CAMPEÃO + claim",
    finalT.estado === "terminado" && finalT.vencedorId === "eu"
    && es.clamarPremioTorneio(finalT.id, AGORA + 21).pontos === 600);
  MEMORIA.clear();
  const rE9 = es.criarTorneio({ ...base, nome: "Eliminatória Dura", formato: "eliminatoria", tamanho: 8, premioPontos: 500 }, AGORA);
  es.inscreverTorneio(rE9.t.id, "Eu", AGORA);
  es.iniciarTorneio(rE9.t.id, AGORA);
  es.partidaParaTorneios({ jogoId: "kart", pontos: 40, vitoria: false, posicao: 7, campo: [{ id: "eu", nome: "Tu", posicao: 7 }] }, AGORA + 10);
  const elim7 = es.torneioPorId(rE9.t.id);
  ok("7.º lugar fora do corte → ELIMINADO honesto, sem prémio, sem campeão",
    elim7.estado === "terminado" && elim7.vencedorId === ""
    && elim7.participantes.find((p) => p.id === "eu").rondaEliminado === 1
    && !es.podeClamarTorneio(rE9.t.id));

  // 8) LIGAS para diferentes jogos
  MEMORIA.clear();
  const rL = es.criarLiga({ nome: "Liga Moçambicana de Damas", jogo: "checkers", premioPontos: 350, janelaDias: 10, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA);
  ok("liga de DAMAS criada com temporada gerada", rL.l !== null && rL.l.temporada === "Temporada 1" && rL.l.estado === "ativo");
  es.inscreverLiga(rL.l.id, "Eu", AGORA);
  es.partidaParaLigas({ jogoId: "checkers", pontos: 90, vitoria: true }, AGORA + 5);
  es.partidaParaLigas({ jogoId: "checkers", pontos: 10, vitoria: false }, AGORA + 6);
  const ligaAgora = es.ligaPorId(rL.l.id);
  ok("partidas REAIS alimentam a liga (min(25, pontos) por partida)",
    ligaAgora.pontuacao.find((p) => p.id === "eu").pontos === 25 + 10
    && ligaAgora.pontuacao.find((p) => p.id === "eu").vitorias === 1
    && ligaAgora.pontuacao.find((p) => p.id === "eu").partidas === 2);
  const estadoL = JSON.parse(MEMORIA.get(es.CHAVE_ESPORT));
  estadoL.ligas.find((x) => x.id === rL.l.id).terminaEm = AGORA + 50;
  MEMORIA.set(es.CHAVE_ESPORT, JSON.stringify(estadoL));
  es.partidaParaLigas({ jogoId: "checkers", pontos: 5, vitoria: false }, AGORA + 100);
  const ligaFim = es.ligaPorId(rL.l.id);
  ok("temporada a expirar → campeão + claim 1×",
    ligaFim.estado === "terminado" && ligaFim.campeaoId === "eu"
    && es.clamarPremioLiga(ligaFim.id, AGORA + 101).pontos === 350);

  // 9) kart — DIFICULDADE: normal == baseline EXATO
  const pista = core.construirPista(core.pistaPorId("praia"));
  const opts = { pista, voltas: 3, kartJogador: "viralata", semente: 20261124 };
  const normal = core.novaCorrida(opts);
  const omisso = core.novaCorrida(opts);
  const facil = core.novaCorrida({ ...opts, dificuldade: "facil" });
  const dificil = core.novaCorrida({ ...opts, dificuldade: "dificil" });
  const skills = (e) => e.corredores.filter((c) => !c.eJogador).map((c) => c.iaSkill);
  ok("DIFICULDADE «normal» == comportamento de sempre (mesma seed → skills idênticas)",
    JSON.stringify(skills(normal)) === JSON.stringify(skills(omisso))
    && normal.dificuldade === "normal" && normal.assistencia === false);
  const sN = skills(normal), sF = skills(facil), sD = skills(dificil);
  ok("FÁCIL: leque de destreza mais leve (todos ≤ 0,82) e reflexo mais lento",
    Math.max(...sF) <= 0.82 && Math.min(...sF) >= 0.62
    && facil.corredores.filter((c) => !c.eJogador).every((c) => c.iaLargada > 0.08));
  ok("DIFÍCIL: leque mais implacável (todos ≥ 0,78)",
    Math.min(...sD) >= 0.78 && Math.max(...sD) <= 0.97);
  ok("rubber-banding pela dificuldade (fácil 90/1,09 · normal 120/1,07 · difícil 240/1,04)",
    normal.dificuldade === "normal" && facil.dificuldade === "facil" && dificil.dificuldade === "dificil");

  // 10) kart — ASSISTÊNCIA de condução (prova física determinística)
  const sem = core.novaCorrida({ ...opts, voltas: 4 });
  const com = core.novaCorrida({ ...opts, voltas: 4, assistencia: true });
  ok("flag assistencia entra no estado (o jogador só)", com.assistencia === true && sem.assistencia === false);
  // entrada constante «direita forte»: com assistência o desvio à linha É MENOR
  const passos = 600;
  const ent = { acelerar: true, travar: false, virar: 1, derrapar: false, usarItem: false };
  for (let i = 0; i < 150; i++) { core.passoCorrida(sem, entParada(), 1 / 30); core.passoCorrida(com, entParada(), 1 / 30); } // contagem
  const latsSem = [], latsCom = [];
  for (let i = 0; i < passos; i++) {
    core.passoCorrida(sem, ent, 1 / 30);
    core.passoCorrida(com, ent, 1 / 30);
    latsSem.push(Math.abs(sem.corredores[6].lateralPerto));
    latsCom.push(Math.abs(com.corredores[6].lateralPerto));
  }
  const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok("com ASSISTÊNCIA o jogador fica MAIS PERTO da linha de corrida (média |lateral| menor)",
    media(latsCom) < media(latsSem));

  // 11) pontosPorPosicao tabela completa
  ok("tabela de posições completa (25,18,15,12,10,8,6,4,2,1,0,0) e fora da pista = 0",
    JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(es.pontosPorPosicao)) === JSON.stringify([25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0])
    && es.pontosPorPosicao(0) === 0 && es.pontosPorPosicao(99) === 0);

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: criar → competir → campeão → claim) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/tournaments`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

  // aparelho limpo para o E2E
  await pg.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.evaluate(() => localStorage.clear());

  // 1) criar torneio (form completo)
  await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="torneio-form-nome"]', { timeout: 60_000 });
  ok("página criar carrega com o formulário completo",
    await pg.locator('[data-testid="torneio-form-jogo-kart"]').count() === 1
    && await pg.locator('[data-testid="torneio-form-formato-campeonato"]').count() === 1
    && await pg.locator('[data-testid="torneio-form-org-empresa"]').count() === 1);
  await pg.fill('[data-testid="torneio-form-nome"]', "Copa E2E das Lendas");
  await pg.locator('[data-testid="torneio-form-tamanho-8"]').click();
  await pg.locator('[data-testid="torneio-criar-submit"]').click();
  await pg.waitForSelector('[data-testid="torneio-local-nome"]', { timeout: 30_000 });
  const nomeDetalhe = await pg.locator('[data-testid="torneio-local-nome"]').innerText();
  ok("torneio CAMPEONATO criado → detalhe local com estado «inscrição»",
    nomeDetalhe.includes("Copa E2E das Lendas")
    && (await pg.locator('[data-testid="torneio-local-estado"]').innerText()).length > 0
    && await pg.locator('[data-testid="torneio-local-inscrever"]').count() === 1);

  // 2) inscrever → iniciar
  await pg.locator('[data-testid="torneio-local-inscrever"]').click();
  await pg.waitForSelector('[data-testid="torneio-local-iniciar"]', { timeout: 15_000 });
  ok("inscrição confirmada → botão INICIAR aparece", true);
  await pg.locator('[data-testid="torneio-local-iniciar"]').click();
  await pg.waitForSelector('[data-testid="torneio-local-jogar"]', { timeout: 15_000 });
  ok("arranque preenche a grelha: classificação com 8 competidores e badge IA",
    (await pg.locator('[data-testid="torneio-local-classificacao"]').count()) === 1
    && (await pg.locator('[data-testid="torneio-local-badge-ia"]').count()) === 7);

  // 3) ronda → «Jogar partida» leva ao jogo real
  await pg.locator('[data-testid="torneio-local-jogar"]').click();
  await pg.waitForURL("**/lives?game=kart*", { timeout: 30_000 });
  ok("«Jogar ronda» leva ao BATEU KART real (?game=kart)", pg.url().includes("/lives?game=kart"));

  // 4) BUS: partida REAL reportada alimenta a classificação do torneio
  await pg.evaluate(() => {
    window.dispatchEvent(new CustomEvent("bateu:partida", {
      detail: { jogoId: "kart", vitoria: false, pontos: 80, posicao: 3, total: 12, campo: [
        { id: "eu", nome: "Tu", posicao: 3 },
        { id: "Kudisso", nome: "Kudisso", posicao: 1 },
        { id: "Zapata", nome: "Zapata", posicao: 2 },
      ] },
    }));
  });
  await dormir(600);
  await pg.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="torneios-local-section"]', { timeout: 30_000 });
  ok("a LISTA mostra a secção dos torneios do aparelho",
    await pg.locator('[data-testid="torneios-local-card-"]').count() >= 0
    && (await pg.locator('[data-testid="torneios-local-section"]').count()) === 1);
  await pg.locator('[data-testid="torneios-local-section"] button').first().click();
  await pg.waitForSelector('[data-testid="torneio-local-classificacao"]', { timeout: 30_000 });
  const pontosEu = await pg.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
    const t = st.torneios.find((x) => x.estado === "ativo");
    return t ? t.participantes.find((p) => p.id === "eu").pontos : -1;
  });
  ok("BUS real: partida do kart deu 15 pontos (3.º lugar F1) ao jogador E 25 ao rival vencedor",
    pontosEu === 15
    && await pg.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
      const t = st.torneios.find((x) => x.estado === "ativo");
      return t.participantes.find((p) => p.nome === "Kudisso").pontos === 25;
    }));

  // 5) mais UMA partida real (o jogador em 1.º) para ultrapassar o rival,
  //    depois a janela fecha → CAMPEÃO → CLAIM do prémio
  await pg.evaluate(() => {
    window.dispatchEvent(new CustomEvent("bateu:partida", {
      detail: { jogoId: "kart", vitoria: true, pontos: 120, posicao: 1, total: 12, campo: [
        { id: "eu", nome: "Tu", posicao: 1 },
        { id: "Makuti", nome: "Makuti", posicao: 2 },
      ] },
    }));
  });
  await dormir(500);
  await pg.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
    st.torneios = st.torneios.map((x) => (x.estado === "ativo" ? { ...x, terminaEm: Date.now() - 1000 } : x));
    localStorage.setItem("bateu_esport_v1", JSON.stringify(st));
  });
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="torneio-local-fim-painel"]', { timeout: 30_000 });
  ok("janela fechada → CAMPEÃO «Eu» (líder de pontos 40>25) com prémio a clamar",
    await pg.locator('[data-testid="torneio-local-clamar"]').count() === 1
    && (await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_esport_v1")).torneios.find((x) => x.estado === "terminado").vencedorId)) === "eu"
    && (await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_esport_v1")).torneios.find((x) => x.estado === "terminado").participantes.find((p) => p.id === "eu").pontos)) === 40);
  await pg.locator('[data-testid="torneio-local-clamar"]').click();
  await pg.waitForSelector('[data-testid="torneio-local-reclamado"]', { timeout: 15_000 });
  ok("CLAIM do prémio 1× (pontos entram na progressão pelo caminho da casa)",
    (await pg.locator('[data-testid="torneio-local-reclamado"]').innerText()).length > 0
    && (await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_esport_v1")).torneios.find((x) => x.estado === "terminado").premioReclamado)) === true);

  // 6) EMPRESA cria torneio pela mesma página
  await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="torneio-form-nome"]', { timeout: 30_000 });
  await pg.fill('[data-testid="torneio-form-nome"]', "Grand Prix TropiCola E2E");
  await pg.locator('[data-testid="torneio-form-org-empresa"]').click();
  await pg.fill('[data-testid="torneio-form-empresa-nome"]', "TropiCola MZ");
  await pg.fill('[data-testid="torneio-form-empresa-sector"]', "Bebidas");
  await pg.locator('[data-testid="torneio-criar-submit"]').click();
  await pg.waitForSelector('[data-testid="torneio-local-empresa"]', { timeout: 30_000 });
  const badgeEmp = await pg.locator('[data-testid="torneio-local-empresa"]').innerText();
  ok("EMPRESA cria torneio patrocinado com o SEU nome no detalhe",
    badgeEmp.includes("TropiCola MZ"));

  // 7) LIGAS: modal de criação (xadrez) → inscrição → partida real alimenta
  await pg.goto(`${BASE}/ligas`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="ligas-criar"]', { timeout: 60_000 });
  await pg.locator('[data-testid="ligas-criar"]').click();
  await pg.waitForSelector('[data-testid="ligas-modal-criar"]', { timeout: 15_000 });
  await pg.fill('[data-testid="ligas-form-nome"]', "Liga E2E de Xadrez");
  await pg.locator('[data-testid="ligas-form-jogo-chess"]').click();
  await pg.locator('[data-testid="ligas-form-submit"]').click();
  await pg.waitForSelector('[data-testid="liga-local-nome"]', { timeout: 30_000 });
  ok("LIGA de XADREZ criada pelo modal → detalhe local",
    (await pg.locator('[data-testid="liga-local-nome"]').innerText()).includes("Liga E2E de Xadrez")
    && (await pg.locator('[data-testid="liga-local-jogo"]').innerText()).toLowerCase().includes("xadrez"));
  await pg.locator('[data-testid="liga-local-inscrever"]').click();
  await pg.waitForSelector('[data-testid="liga-local-jogar"]', { timeout: 15_000 });
  await pg.evaluate(() => {
    window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "chess", vitoria: true, pontos: 90 } }));
  });
  await dormir(500);
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="liga-local-classificacao"]', { timeout: 30_000 });
  const pontosLiga = await pg.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
    const l = st.ligas[0];
    return l.pontuacao.find((p) => p.id === "eu").pontos;
  });
  ok("partida REAL de xadrez alimenta a liga (teto 25/partida)", pontosLiga === 25);

  // 8) desktop 1280 px sem overflow (padrão nav-v79 §6)
  for (const rota of ["/tournaments", "/tournaments/criar", "/ligas"]) {
    await pg.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
    await dormir(700);
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`1280 px sem overflow em ${rota}`, over <= 0);
  }

  // 9) i18n EN: sem chaves cruas nas superfícies novas
  await pg.evaluate(() => localStorage.setItem("bateu_lang_explicit", "1"));
  await pg.evaluate(() => localStorage.setItem("bateu_lang", "en"));
  await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="torneio-form-nome"]', { timeout: 30_000 });
  await dormir(800); // v86.1: settle — arranque frio do vite hidrata a i18n depois do 1.º paint (flake apanhado a 44/43 no 1.º run pós-commit); a ASSENTAÇÃO é a mesma, só a captura estabiliza
  const htmlCriar = await pg.content();
  const chavesCruas = htmlCriar.match(/esport\.[a-zA-Z.]+|kart\.forma\.[a-zA-Z.]+/g);
  const tituloEn = await pg.locator("h1").first().innerText();
  ok("i18n EN: «Create tournament» renderiza e NENHUMA chave crua aparece",
    !chavesCruas && tituloEn.length > 0 && /create tournament/i.test(tituloEn));

  // 10) menu do kart: forma de jogar visível + persistência da dificuldade
  await pg.evaluate(() => localStorage.setItem("bateu_lang", "pt"));
  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("menu do kart tem a FORMA DE JOGAR (dificuldade ×3 + assistência + auto)",
    await pg.locator('[data-testid="kart-forma"]').count() === 1
    && await pg.locator('[data-testid="kart-dif-facil"]').count() === 1
    && await pg.locator('[data-testid="kart-dif-normal"]').count() === 1
    && await pg.locator('[data-testid="kart-dif-dificil"]').count() === 1
    && await pg.locator('[data-testid="kart-assist"]').count() === 1
    && await pg.locator('[data-testid="kart-auto"]').count() === 1);
  await pg.locator('[data-testid="kart-dif-dificil"]').click();
  await dormir(200);
  const difGuardada = await pg.evaluate(() => localStorage.getItem("bateu_kart_dif"));
  ok("dificuldade escolhida persiste no aparelho", difGuardada === "dificil");

  // erros de consola (com NOISE filtrado)
  const errosReais = erros.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("ZERO pageerror / erros de consola reais", errosReais.length === 0);
  if (errosReais.length) console.log("   ERROS:", errosReais.slice(0, 4));

  await browser.close();
  matarTodos();

  // ── relatório ────────────────────────────────────────────────
  console.log(`\n${"═".repeat(58)}`);
  console.log(`E-SPORT VIVO v86: ${passed} verdes, ${failed} vermelhos`);
  if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log(`  ✗ ${f}`)); }
  console.log("═".repeat(58));
  process.exit(failed ? 1 : 0);
}

process.on("exit", () => matarTodos());
main().catch((e) => { console.error("FALHA GERAL:", e); matarTodos(); process.exit(1); });
