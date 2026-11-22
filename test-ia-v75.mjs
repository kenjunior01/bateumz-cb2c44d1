// ============================================================
// v75 — IA DE ELITE (2.ª vaga): XADREZ com motor de VERDADE +
// BATALHA NAVAL com modo-alvo/afundados + LUDO «vs IA»
// ────────────────────────────────────────────────────────────
// A) NÚCLEO XADREZ (src/game/chess/ia.ts): PST + material,
//    negamax alfa-beta + quiscência, ordenação MVV-LVA, teto de
//    nós, mate em 1, isco defendido RECUSADO, promoção→dama,
//    afogamento = 0, «facil» erra de propósito, semente honesta.
// B) NÚCLEO NAVAL (src/game/batalhanaval/ia.ts): linha de hits
//    vivos continuada, afundado não atrai tiro, densidade >
//    canto, paridade no médio, dadosDaFrota consome tamanho,
//    semente determinística.
// C) NÚCLEO LUDO (src/game/ludo/ia.ts): terminar > capturar >
//    fugir > seguro > base > progresso; sem lance = -1.
// D) E2E: xadrez 2 rondas completas com o bot · batalha naval
//    com o computador a disparar · ludo IA lança/joga/devolve a
//    vez — tudo com ZERO pageerror.
// Uso: PW_CHROME=… node test-ia-v75.mjs
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
  "same key", "validateDOMNesting", "autoplay", "unlockAudio", "400",
];

async function main() {
  limparZumbis();
  console.log(`\n🧠 IA DE ELITE v75 — ${BASE}\n`);

  // ── A) NÚCLEO XADREZ ─────────────────────────────────────────
  console.log("— A) Motor de xadrez (src/game/chess/ia.ts) —");
  const X = await import(`${RAIZ}/src/game/chess/ia.ts`);
  const peca = (t, c, mv = true) => ({ type: t, color: c, moved: mv });

  const inicio = X.createInitialBoard();
  ok("Geração legal: 20 lances na posição inicial (brancas)",
    X.getAllLegalMoves(inicio, "w", null).length === 20);
  const aposE4 = X.applyMoveToBoard(inicio, { fromR: 6, fromC: 4, toR: 4, toC: 4, piece: "P" });
  ok("Geração legal: 20 respostas pretas depois de 1.e4 (prof.2 = 400 nós)",
    X.getAllLegalMoves(aposE4, "b", null).length === 20);

  // Mate em 1 — posição do «mate do pastor» antes de Qxf7#
  const pastor = Array.from({ length: 8 }, () => Array(8).fill(null));
  pastor[7][4] = peca("K", "w"); pastor[3][7] = peca("Q", "w"); pastor[4][2] = peca("B", "w"); pastor[4][4] = peca("P", "w");
  pastor[0][4] = peca("K", "b"); pastor[0][3] = peca("Q", "b"); pastor[2][2] = peca("N", "b"); pastor[2][5] = peca("N", "b");
  pastor[3][4] = peca("P", "b"); pastor[1][5] = peca("P", "b"); pastor[1][0] = peca("P", "b"); pastor[1][6] = peca("P", "b"); pastor[1][7] = peca("P", "b");
  const mate = X.escolherLance(pastor, "w", "dificil", null, 7);
  ok("MATE EM 1: dificil acha Qxf7# (h5xf7) com pontuação de mate",
    mate.lance && mate.lance.fromR === 3 && mate.lance.fromC === 7
    && mate.lance.toR === 1 && mate.lance.toC === 5 && mate.pontuacao > X.MATE / 2);
  ok("XEQUE detetado depois do mate (isInCheck pretas)",
    X.isInCheck(X.applyMoveToBoard(pastor, mate.lance), "b"));

  // Isco defendido: Qxd5?? Nxd5 perde a dama — o motor de VERDADE recusa
  const isco = Array.from({ length: 8 }, () => Array(8).fill(null));
  isco[7][4] = peca("K", "w"); isco[7][3] = peca("Q", "w"); isco[4][4] = peca("P", "w");
  isco[0][4] = peca("K", "b"); isco[2][5] = peca("N", "b"); isco[3][3] = peca("P", "b");
  const lanceIsco = X.getBestMove(isco, "w", "dificil", null, 11);
  const comeuIsco = lanceIsco && lanceIsco.fromR === 7 && lanceIsco.fromC === 3 && lanceIsco.toR === 3 && lanceIsco.toC === 3;
  ok("QUISCÊNCIA: dificil NÃO come o peão defendido (Qxd5?? Nxd5) — fim do efeito horizonte",
    lanceIsco !== null && !comeuIsco && X.getAllLegalMoves(isco, "w", null).some((m) =>
      m.fromR === lanceIsco.fromR && m.fromC === lanceIsco.fromC && m.toR === lanceIsco.toR && m.toC === lanceIsco.toC));

  // Abertura: PST manda para o centro/desenvolvimento
  const abertura = X.getBestMove(inicio, "w", "dificil", null, 1234);
  const boas = [[6, 4, 4, 4], [6, 3, 4, 3], [7, 6, 5, 5], [7, 1, 5, 2]];
  ok("PST: a abertura do motor é uma das clássicas (e4/d4/Cf3/Cc3)",
    abertura !== null && boas.some(([fr, fc, tr, tc]) => abertura.fromR === fr && abertura.fromC === fc && abertura.toR === tr && abertura.toC === tc));

  // Promoção → dama QUE GANHA MATERIAL: bxc8=Q apanha a torre
  const promo = Array.from({ length: 8 }, () => Array(8).fill(null));
  promo[1][1] = peca("P", "w"); promo[7][4] = peca("K", "w"); promo[0][2] = peca("R", "b"); promo[0][7] = peca("K", "b");
  const lancePromo = X.getBestMove(promo, "w", "dificil", null, 5);
  ok("PROMOÇÃO: bxc8=DAMA — promove E ganha a torre de uma vez",
    lancePromo !== null && lancePromo.fromR === 1 && lancePromo.fromC === 1
    && lancePromo.toR === 0 && lancePromo.toC === 2 && lancePromo.promotion === "Q");

  // Afogamento = empate (0)
  const afogo = Array.from({ length: 8 }, () => Array(8).fill(null));
  afogo[5][7] = peca("K", "w"); afogo[0][6] = peca("R", "w"); afogo[7][7] = peca("K", "b");
  ok("AFOGAMENTO: sem lances legais e SEM xeque → lance null (empate honesto)",
    X.getAllLegalMoves(afogo, "b", null).length === 0
    && !X.isInCheck(afogo, "b")
    && X.getBestMove(afogo, "b", "dificil", null, 3) === null);

  // «facil» erra de propósito e continua LEGAL
  const lancesFacil = new Set();
  let todosLegais = true;
  const legaisInicio = X.getAllLegalMoves(inicio, "w", null);
  for (let s = 1; s <= 30; s++) {
    const m = X.getBestMove(inicio, "w", "facil", null, s);
    if (!m) { todosLegais = false; break; }
    const chave = `${m.fromR},${m.fromC}->${m.toR},${m.toC}`;
    lancesFacil.add(chave);
    if (!legaisInicio.some((l) => `${l.fromR},${l.fromC}->${l.toR},${l.toC}` === chave)) todosLegais = false;
  }
  ok(`«FACIL» honesto: 30 sementes → ${lancesFacil.size} lances DIFERENTES, todos legais`,
    todosLegais && lancesFacil.size >= 5);

  // Determinismo + orçamento
  const d1 = X.escolherLance(inicio, "w", "dificil", null, 4242);
  const d2 = X.escolherLance(inicio, "w", "dificil", null, 4242);
  ok("DETERMINISMO: mesma semente → mesmo lance",
    d1.lance && d2.lance && d1.lance.fromR === d2.lance.fromR && d1.lance.fromC === d2.lance.fromC
    && d1.lance.toR === d2.lance.toR && d1.lance.toC === d2.lance.toC);
  ok("ORÇAMENTO de nós: profundidade 3 na abertura usa < 300.000 nós",
    d1.nós > 0 && d1.nós <= 300_000 && d1.profundidade === 3);

  const t0 = Date.now();
  let b = inicio, lento = false, jogos = 0;
  for (let i = 0; i < 4; i++) {
    const t = Date.now();
    const cor = i % 2 === 0 ? "w" : "b";
    const e = X.escolherLance(b, cor, "dificil", null, 1000 + i);
    if (Date.now() - t > 1500) lento = true;
    if (!e.lance) break;
    b = X.applyMoveToBoard(b, e.lance);
    jogos++;
  }
  ok(`PERFORMANCE: 4 lances dificil seguidos (${jogos} jogados) em ${Date.now() - t0}ms — nenhum > 1500ms`,
    jogos === 4 && !lento && Date.now() - t0 < 6000);

  // ── B) NÚCLEO BATALHA NAVAL ──────────────────────────────────
  console.log("\n— B) IA naval (src/game/batalhanaval/ia.ts) —");
  const B = await import(`${RAIZ}/src/game/batalhanaval/ia.ts`);
  const grade = (s) => s.trim().split("\n").map((l) => l.trim().split("").map((ch) => (ch === "X" ? "hit" : ch === "M" ? "miss" : "empty")));
  const falso8 = () => Array.from({ length: 8 }, () => Array(8).fill(false));

  const atLinha = grade("MX......\n.X......\n........\n........\n........\n........\n........\n........");
  const tiroLinha = B.escolherTiro({ ataque: atLinha, afundados: falso8(), restantes: [5, 4, 3, 3, 2], rng: B.mulberry32(1) }, "dificil");
  ok("MODO-ALVO: dois hits em linha vertical → continua a LINHA (2,1), não passeia",
    tiroLinha[0] === 2 && tiroLinha[1] === 1);

  // Afundado não atrai: mapa soComHits sem hits vivos = tudo zero
  const atAfundado = grade("XX......\n........\n........\n........\n........\n........\n........\n........");
  const afAfundado = falso8();
  afAfundado[0][0] = true; afAfundado[0][1] = true;
  const mapaAfundado = B.mapaProbabilidade(atAfundado, afAfundado, [5, 4, 3, 3, 2], true);
  ok("AFUNDADO é público: modo-alvo com SÓ afundados → mapa zero (nada atrai tiro)",
    mapaAfundado.every((row) => row.every((v) => v === 0)));

  // hit vivo GUIDA o mapa e afundado fica fora dos vivos
  const atMisto = grade("XX......\n.X......\n........\n........\n........\n........\n........\n........");
  const afMisto = falso8();
  afMisto[0][0] = true; afMisto[0][1] = true; // navio de 2 afundado
  const mapaMisto = B.mapaProbabilidade(atMisto, afMisto, [5, 4, 3, 3, 2], true);
  const algumaViva = mapaMisto.some((row) => row.some((v) => v > 0));
  ok("HIT VIVO guia o mapa (afundado excluído dos «vivos»)",
    algumaViva && mapaMisto[1][1] === 0 && mapaMisto[0][1] === 0);

  // densidade > canto no tabuleiro vazio
  const vazio = grade("........\n........\n........\n........\n........\n........\n........\n........");
  const dens = B.mapaProbabilidade(vazio, falso8(), [5, 4, 3, 3, 2], false);
  ok("DENSIDADE: centro (2,2) vale mais que canto (0,0) — cada colocação conta",
    dens[2][2] > dens[0][0]);

  // paridade no médio (tabuleiro vazio)
  const tPar = B.escolherTiro({ ataque: vazio, afundados: falso8(), restantes: [5, 4, 3, 3, 2], rng: B.mulberry32(3) }, "medio");
  ok("PARIDADE no «médio»: a caça começa em (r+c) par",
    tPar[0] >= 0 && tPar[1] >= 0 && (tPar[0] + tPar[1]) % 2 === 0);

  // facil: dentro do tabuleiro e em célula vazia
  const tFacil = B.escolherTiro({ ataque: grade("MM......\n........\n........\n........\n........\n........\n........\n........"), afundados: falso8(), restantes: [5, 4, 3, 3, 2], rng: B.mulberry32(9) }, "facil");
  ok("«FACIL» naval: tiro aleatório dentro do tabuleiro e NUNCA em célula já atacada",
    tFacil[0] >= 0 && tFacil[0] < 8 && tFacil[1] >= 0 && tFacil[1] < 8 && !(tFacil[0] === 0 && tFacil[1] < 2));

  // dadosDaFrota: componente todo-hit consome o tamanho (grade: hit|empty)
  const navios = grade("XX......\n..X.....\n........\n........\n........\n........\n........\n........");
  const frota = B.dadosDaFrota(navios, [5, 4, 3, 3, 2]);
  ok("DADOS DA FROTA: navio de 2 afundado sai da lista (restantes [5,4,3,3])",
    JSON.stringify(frota.restantes) === JSON.stringify([5, 4, 3, 3]) && frota.afundados[0][0] === true);

  const nA = B.escolherTiro({ ataque: vazio, afundados: falso8(), restantes: [5, 4, 3, 3, 2], rng: B.mulberry32(77) }, "dificil");
  const nB = B.escolherTiro({ ataque: vazio, afundados: falso8(), restantes: [5, 4, 3, 3, 2], rng: B.mulberry32(77) }, "dificil");
  ok("DETERMINISMO naval: mesma semente → mesmo tiro",
    nA[0] === nB[0] && nA[1] === nB[1]);

  // ── C) NÚCLEO LUDO ───────────────────────────────────────────
  console.log("\n— C) IA do Ludo (src/game/ludo/ia.ts) —");
  const L = await import(`${RAIZ}/src/game/ludo/ia.ts`);
  const tab = (j, fichas) => {
    const t = [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]];
    t[j] = fichas; return t;
  };

  const eFim = tab(2, [52, 10, -1, -1]);
  ok("TERMINAR primeiro: ficha em 52 com dado 6 chega ao fim (58)",
    L.escolherPecaIA(eFim, 2, 6, L.mulberry32(1)) === 0);

  const eCapt = tab(2, [3, -1, -1, -1]);
  eCapt[0] = [-1, -1, -1, -1]; eCapt[0][0] = 35; // inimigo na casa global 35
  const fichaCapt = L.escolherPecaIA(eCapt, 2, 6, L.mulberry32(2));
  ok("CAPTURAR: aterrar na casa do inimigo (3→9, global 35) vence progresso simples",
    fichaCapt === 0 && L.capturaEm(L.destinoValido(eCapt[2][0], 2, 6), 2, eCapt));

  const eFuga = tab(2, [5, 12, -1, -1]);
  eFuga[0] = [-1, -1, -1, -1]; eFuga[0][0] = 30; // inimigo 1 casa atrás na global
  ok("FUGIR DO PERIGO: ficha ameaçada (5) move-se antes da calma (12)",
    L.ameacado(5, 2, eFuga) && !L.ameacado(12, 2, eFuga)
    && L.escolherPecaIA(eFuga, 2, 6, L.mulberry32(3)) === 0);

  const eSeg = tab(2, [5, 17, -1, -1]);
  ok("CASA SEGURA: dado 4 → 17→21 cai na estrela (global 47) e é preferida",
    L.escolherPecaIA(eSeg, 2, 4, L.mulberry32(4)) === 1);

  const eBase = tab(2, [-1, -1, -1, -1]);
  ok("SEM LANCE: tudo na base e dado 3 → -1 (nunca inventa ficha)",
    L.escolherPecaIA(eBase, 2, 3, L.mulberry32(5)) === -1);

  const lA = L.escolherPecaIA(eSeg, 2, 4, L.mulberry32(9));
  const lB = L.escolherPecaIA(eSeg, 2, 4, L.mulberry32(9));
  ok("DETERMINISMO ludo: mesma semente → mesma ficha", lA === lB);

  // ── D) E2E ───────────────────────────────────────────────────
  console.log("\n— D) E2E (vite + browser: xadrez, batalha naval, ludo vs IA) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=chess`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ── D1) XADREZ: duas rondas completas com o bot ──
  const ctxX = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgX = await ctxX.newPage();
  const errosX = [];
  pgX.on("pageerror", (e) => errosX.push(String(e)));
  pgX.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosX.push(m.text()); });
  await pgX.goto(`${BASE}/lives?game=chess`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("hub carrega o XADREZ por ?game=chess",
    await pgX.waitForSelector('[data-testid="chess-jogar"]', { timeout: 60_000 }).then(() => true).catch(() => false));
  await pgX.locator('[data-testid="chess-dif-dificil"]').click();
  await pgX.locator('[data-testid="chess-jogar"]').click();
  await pgX.waitForSelector('[data-testid="chess-casa-6-4"]', { timeout: 10_000 });

  const vezDe = () => pgX.evaluate(() => document.body.innerText.match(/Vez: (Brancas|Pretas)/)?.[1] || "");
  ok("jogo aberto: começa pelas BRANCAS", (await vezDe()) === "Brancas");

  // ronda 1: 1.e4 — bot responde
  await pgX.locator('[data-testid="chess-casa-6-4"]').click();
  await pgX.locator('[data-testid="chess-casa-4-4"]').click();
  let respondeu1 = false;
  for (let i = 0; i < 40 && !respondeu1; i++) { await dormir(200); respondeu1 = (await vezDe()) === "Brancas"; }
  ok(`RONDA 1: brancas jogam 1.e4 e o bot «dificil» RESPONDE (volta a ser a vez das brancas — ${await vezDe()})`, respondeu1);

  // ronda 2: 2.d4 — bot responde outra vez (loop sustentado, não resposta única)
  await pgX.locator('[data-testid="chess-casa-6-3"]').click();
  await pgX.locator('[data-testid="chess-casa-4-3"]').click();
  let respondeu2 = false;
  for (let i = 0; i < 40 && !respondeu2; i++) { await dormir(200); respondeu2 = (await vezDe()) === "Brancas"; }
  ok("RONDA 2: 2.d4 e o bot responde OUTRA VEZ (loop de jogo vivo)", respondeu2);
  await pgX.screenshot({ path: "shots-v75/xadrez-bot.png" });
  ok("ZERO pageerror no xadrez", errosX.length === 0 || (fails.push(`pageerrors xadrez: ${errosX.slice(0, 2).join(" | ")}`), false));
  await ctxX.close();

  // ── D2) BATALHA NAVAL: computador dispara com a IA nova ──
  const ctxN = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgN = await ctxN.newPage();
  const errosN = [];
  pgN.on("pageerror", (e) => errosN.push(String(e)));
  pgN.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosN.push(m.text()); });
  await pgN.goto(`${BASE}/lives?game=battleship`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("hub carrega a BATALHA NAVAL por ?game=battleship",
    await pgN.waitForSelector('[data-testid="naval-vs-bot"]', { timeout: 60_000 }).then(() => true).catch(() => false));
  await pgN.locator('[data-testid="naval-vs-bot"]').click();
  await pgN.locator('[data-testid="naval-dif-dificil"]').click();
  await pgN.locator('[data-testid="naval-iniciar"]').click();
  await pgN.waitForSelector('[data-testid="naval-ataque-3-3"]', { timeout: 10_000 });

  await pgN.locator('[data-testid="naval-ataque-3-3"]').click();
  let botDisparou = false;
  for (let i = 0; i < 30 && !botDisparou; i++) { await dormir(200); botDisparou = (await pgN.evaluate(() => document.body.innerText.includes("Turno 3"))); }
  ok("COMPUTADOR dispara: depois do tiro do jogador o turno avança a «Turno 3» (IA densidade + modo-alvo)", botDisparou);
  ok("DIFICIL visível no HUD", (await pgN.evaluate(() => document.body.innerText.includes("Difícil"))));
  await pgN.screenshot({ path: "shots-v75/naval-ia.png" });
  ok("ZERO pageerror na batalha naval", errosN.length === 0 || (fails.push(`pageerrors naval: ${errosN.slice(0, 2).join(" | ")}`), false));
  await ctxN.close();

  // ── D3) LUDO vs IA: a máquina lança, joga e DEVOLVE a vez ──
  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgL = await ctxL.newPage();
  const errosL = [];
  pgL.on("pageerror", (e) => errosL.push(String(e)));
  pgL.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosL.push(m.text()); });
  // dado COSTURADO só nesta página: Math.random → 0.9999 constante ⇒ TODOS
  // os lançamentos dão 6 (0.9999×6=5.9994→5+1). O jogo nunca depende de
  // sorte: o humano sai da base à 1.ª rolada e a IA também — determinismo
  // de teste, zero sorte (o dado do ecrã continua a ser o mesmo do sempre).
  await pgL.addInitScript(() => { Math.random = () => 0.9999; });
  await pgL.goto(`${BASE}/lives?game=ludo`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("hub carrega o LUDO por ?game=ludo",
    await pgL.waitForSelector('[data-testid="ludo-modo-ia"]', { timeout: 60_000 }).then(() => true).catch(() => false));
  await pgL.locator('[data-testid="ludo-modo-ia"]').click();
  await pgL.waitForSelector('[data-testid="ludo-dado-rolar"]', { timeout: 10_000 });

  // humano (Vermelho) rola e move; com tudo a dar 6 há SEMPRE ficha clicável
  let moveuHumano = false;
  for (let tent = 0; tent < 8 && !moveuHumano; tent++) {
    const dado = pgL.locator('[data-testid="ludo-dado-rolar"]');
    if (!(await dado.isVisible().catch(() => false))) { await dormir(300); continue; }
    await dado.click();
    const ficha = await pgL.waitForSelector('[data-testid^="ludo-ficha-"]', { timeout: 3_500 }).catch(() => null);
    if (ficha) { await ficha.click(); moveuHumano = true; }
  }
  ok("humano rola e move (ficha clicável por testid — dado costurado a 6)", moveuHumano);

  // a IA (Azul) tem de lançar, jogar e devolver a vez — o botão do dado VOLTA
  let vezVoltou = false;
  for (let i = 0; i < 75 && !vezVoltou; i++) {
    await dormir(200);
    vezVoltou = await pgL.locator('[data-testid="ludo-dado-rolar"]').isVisible().catch(() => false);
  }
  ok("IA AGIU: botão do dado volta (IA lançou + jogou + passou a vez) em < 15 s", vezVoltou);
  await pgL.screenshot({ path: "shots-v75/ludo-ia.png" });
  ok("ZERO pageerror no ludo", errosL.length === 0 || (fails.push(`pageerrors ludo: ${errosL.slice(0, 2).join(" | ")}`), false));
  await ctxL.close();

  await browser.close();
  matarTodos();
  limparZumbis();

  console.log(`\n════════════════════════════════════════`);
  console.log(`IA v75: ${passed} verdes, ${failed} vermelhas`);
  if (fails.length) { console.log("FALHAS:"); for (const f of fails) console.log(`  • ${f}`); }
  console.log(`════════════════════════════════════════`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); matarTodos(); process.exit(1); });
