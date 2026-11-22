// ============================================================
// v76 — BATEU KART: IA DE ELITE DO CIRCUITO (núcleo puro, Node)
// ────────────────────────────────────────────────────────────
// A) LARGADA: reação humana por bot (iaLargada 0,08…0,37 s), o
//    jogador mantém 0 — nadie arranca na fase contagem.
// B) ESQUIVA DE PROJÉTEIS: casca reta / casca-alvo / míssil
//    teleguiado → iaDesvio cresce PARA LONGE do perigo, com
//    destreza (iaSkill) a escalar a força; integração: casca
//    disparada de trás NÃO acerta o bot que esquivou.
// C) ÓLEO: mancha na linha → contorno sem golpe.
// D) ESCUDO INTELIGENTE: guardado com míssil longe, levantado
//    perto (< 28 u) — e o míssil chega e MORRE no escudo.
// E) ITENS COM CABEÇA: turbo só na reta; arma não gasta em alvo
//    com escudo; óleo só com alguém colado atrás.
// F) TRÂNSITO: kart colado à frente → desvio lateral (sem choque).
// G) DINÂMICA: o desvio RELAXA a 0 quando a pista fica livre.
// H) RUBBER-BANDING intacto (1,07 / 0,93) — v65 não quebrou.
// I) DETERMINISMO: mesma semente → mesma corrida (hash de posições).
// J) CORRIDA COMPLETA nas 3 pistas com a IA nova (12 posições
//    únicas, payout honesto, resultados com nomes).
// Uso: node test-kart-ia-v76.mjs  (puro — sem vite, sem browser)
// ============================================================
import { spawnSync } from "node:child_process";

const RAIZ = process.cwd();
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};
const passo = 1 / 30;
const DS = 3; // casas para hash determinístico

/** Força o fim da contagem (honesto: é o MESMO estado que o jogador vê no «JÁ»). */
function largar(e) { e.fase = "corrida"; e.tempoContagem = 0; }

/** Matriz de teste: 12 bots SEM humanos, caixas mortas (nada rouba o item
 *  que o teste põe à mão), todos os corredores espalhados LONGE uns dos
 *  outros, AQUECIMENTO que passa todas as reações à largada (≤ 0,4 s) —
 *  cada cenário monta o seu encontro à mão sobre a pista já «quente». */
function criaTudoIA(core, semente) {
  const pista = core.construirPista(core.PISTAS[0]); // praia
  const e = core.novaCorridaOnline({ pista, voltas: 3, semente, jogadores: [] });
  largar(e);
  for (const cx of e.caixas) { cx.viva = false; cx.respawn = 9999; }
  const m = pista.amostras.length;
  e.corredores.forEach((c, k) => {
    const a = pista.amostras[(300 + k * 60) % m];
    c.x = a.x; c.z = a.z; c.ang = Math.atan2(a.tx, a.tz); c.dirAng = c.ang;
    c.iAmostra = (300 + k * 60) % m; c.sTotal = 300 * core.PASSO_AMOSTRA; c.vel = 30;
    c.item = null; c.escudo = 0; c.stun = 0; c.boost = 0;
    c.iaOffset = 0; c.iaDesvio = 0;
  });
  for (let k = 0; k < 16; k++) core.passoCorridaMulti(e, {}, passo); // aquecimento → e.tempo ≈ 0,53 > iaLargada
  e.eventos.length = 0;
  return { e, pista, m };
}

/** Põe um corredor NUMA amostra exata (centro da pista) com a física coerente. */
function porNaAmostra(pista, c, i, vel, lateral = 0) {
  const a = pista.amostras[i];
  c.x = a.x + a.nx * lateral; c.z = a.z + a.nz * lateral;
  c.ang = Math.atan2(a.tx, a.tz); c.dirAng = c.ang;
  c.iAmostra = i; c.lateralPerto = lateral; c.sTotal = i * core.PASSO_AMOSTRA;
  c.vel = vel; c.stun = 0; c.boost = 0; c.escudo = 0;
}

/** Procura um troço RETO (curvatura média das próximas n amostras < teto). */
function achaReta(core, pista, n, teto) {
  const m = pista.amostras.length;
  for (let i = 0; i < m; i++) {
    let soma = 0;
    for (let k = 1; k <= n; k++) soma += pista.amostras[(i + k) % m].curva;
    if (soma / n < teto) return i;
  }
  return -1;
}

const hashPos = (e) => e.corredores.map((c) => `${c.id}:${c.x.toFixed(DS)},${c.z.toFixed(DS)},${c.sTotal.toFixed(DS)}`).join("|");

// ═══════════════════════════════════════════════════════════════
let core;
async function main() {
  console.log("\n🏎 BATEU KART v76 — IA DE ELITE DO CIRCUITO (núcleo puro)\n");
  console.log("— A) Largada com reação humana —");
  {
    // corrida FRESCA (sem presets de vel) — a largada tem de partir do zero
    const pistaA = core.construirPista(core.PISTAS[0]);
    const e = core.novaCorridaOnline({ pista: pistaA, voltas: 3, semente: 11, jogadores: [] });
    largar(e);
    ok("12 bots e NENHUM humano", e.corredores.length === 12 && e.corredores.every((c) => !c.eJogador));
    ok("iaLargada de todos no intervalo humano (0,04…0,4 s)", e.corredores.every((c) => c.iaLargada > 0.04 && c.iaLargada < 0.4));
    ok("todos PARADOS no instante zero (vel 0)", e.corredores.every((c) => c.vel === 0));
    const solo = core.novaCorrida({ pista: pistaA, voltas: 3, kartJogador: "viralata", semente: 12 });
    ok("SOLO: o jogador tem reação 0 (nada o atrasa)", solo.corredores[6].iaLargada === 0 && solo.corredores.filter((c) => !c.eJogador).every((c) => c.iaLargada > 0));
    // dois reflexos controlados: rápido 0,05 s · lento 0,30 s
    const rapido = e.corredores[0], lento = e.corredores[1];
    rapido.iaLargada = 0.05; lento.iaLargada = 0.30;
    for (let k = 0; k < 3; k++) core.passoCorridaMulti(e, {}, passo); // e.tempo ≈ 0,10
    ok("bot rápido JÁ acelerou aos 0,10 s", rapido.vel > 0);
    ok("bot lento AINDA não mexeu (reflexo longo honesto)", lento.vel === 0);
    for (let k = 0; k < 12; k++) core.passoCorridaMulti(e, {}, passo); // e.tempo ≈ 0,50
    ok("aos 0,50 s TODOS os bots arrancaram", e.corredores.every((c) => c.vel > 0));
  }

  console.log("\n— B) Esquiva de projéteis (casca reta · teleguiados · destreza) —");
  {
    // mecanismo: míssil teleguiado colocado 40 u atrás com lateral +2 → fuga para o lado NEGATIVO
    const { e, pista } = criaTudoIA(core, 21);
    const b = e.corredores[0];
    porNaAmostra(pista, b, 400, 30);
    b.iaSkill = 0.9;
    e.projeteis.push({ id: e.seqId++, tipo: "missil", x: pista.amostras[384].x + pista.amostras[384].nx * 2, z: pista.amostras[384].z + pista.amostras[384].nz * 2, ang: Math.atan2(pista.amostras[384].tx, pista.amostras[384].tz), vel: 55, dono: e.corredores[11].id, alvo: b.id, vida: 5, iAmostra: 384 });
    for (let k = 0; k < 8; k++) core.passoCorridaMulti(e, {}, passo);
    ok("teleguiado a 40 u → iaDesvio acordou (|desvio| > 1)", Math.abs(b.iaDesvio) > 1);
    ok("fugiu para o lado CONTRÁRIO ao do míssil (lateral do perigo > minha → desvio < 0)", b.iaDesvio < 0);
    ok("teto do desvio respeitado (≤ 5,8 u)", Math.abs(b.iaDesvio) <= 5.8 + 1e-9);

    // destreza: mesmo cenário com skills 0,95 vs 0,82 → o de elite desvia MAIS
    const { e: e2, pista: p2, m: m2 } = criaTudoIA(core, 22);
    const elite = e2.corredores[0], fraco = e2.corredores[6];
    const iF = (400 + Math.floor(m2 / 2)) % m2; // segundo palco LONGE do primeiro
    porNaAmostra(p2, elite, 400, 30); elite.iaSkill = 0.95;
    porNaAmostra(p2, fraco, iF, 30); fraco.iaSkill = 0.82;
    for (const [c, i] of [[elite, 400], [fraco, iF]]) {
      const j = (i - 16 + m2) % m2;
      e2.projeteis.push({ id: e2.seqId++, tipo: "missil", x: p2.amostras[j].x + p2.amostras[j].nx * 2, z: p2.amostras[j].z + p2.amostras[j].nz * 2, ang: Math.atan2(p2.amostras[j].tx, p2.amostras[j].tz), vel: 55, dono: e2.corredores[11].id, alvo: c.id, vida: 5, iAmostra: j });
    }
    for (let k = 0; k < 8; k++) core.passoCorridaMulti(e2, {}, passo);
    ok("destreza escala a esquiva (elite 0,95 desvia mais que fraco 0,82)", Math.abs(elite.iaDesvio) > Math.abs(fraco.iaDesvio) + 0.3);

    // integração: casca RETA disparada de trás NÃO acerta o bot que esquivou
    const { e: e3, pista: p3 } = criaTudoIA(core, 23);
    const v = e3.corredores[0];
    const reta = achaReta(core, p3, 40, 0.0025);
    ok("existe troço reto de 100 u na praia (cenário limpo)", reta >= 0);
    porNaAmostra(p3, v, reta, 30);
    const jR = (reta - 8 + p3.amostras.length) % p3.amostras.length; // casca 20 u atrás
    e3.projeteis.push({ id: e3.seqId++, tipo: "casca", x: p3.amostras[jR].x, z: p3.amostras[jR].z, ang: Math.atan2(p3.amostras[jR].tx, p3.amostras[jR].tz), vel: 46, dono: e3.corredores[11].id, alvo: -1, vida: 3.5, iAmostra: jR });
    let maxDesvio = 0;
    for (let k = 0; k < 105; k++) { core.passoCorridaMulti(e3, {}, passo); maxDesvio = Math.max(maxDesvio, Math.abs(v.iaDesvio)); }
    ok("casca de trás: bot ESQUIVOU (desvio máx > 1)", maxDesvio > 1);
    ok("casca de trás: NENHUM golpe no bot (a esquiva valeu)", !e3.eventos.some((ev) => ev.t === "golpe" && ev.alvo === v.id));
    ok("casca expirou sem vítima (vida 3,5 s cumprida)", e3.projeteis.length === 0);
  }

  console.log("\n— C) Óleo contornado sem golpe —");
  {
    const { e, pista, m } = criaTudoIA(core, 31);
    const b = e.corredores[0];
    b.iaSkill = 0.9; // piloto competente — a SUÍTE prova o mecanismo (bots fracos esquivam pior: é a personalidade da frota)
    const reta = achaReta(core, pista, 40, 0.0025);
    porNaAmostra(pista, b, reta, 30);
    const jO = (reta + 12) % pista.amostras.length; // mancha 30 u À FRENTE, na linha dele
    e.perigos.push({ id: e.seqId++, tipo: "oleo", x: pista.amostras[jO].x, z: pista.amostras[jO].z, dono: e.corredores[11].id, vida: 20, idade: 5 });
    for (let k = 0; k < 45; k++) core.passoCorridaMulti(e, {}, passo);
    const cruzou = ((b.iAmostra - jO + m) % m) < 40; // já passou da amostra da mancha
    ok("o bot REALMENTE cruzou o troço da mancha", cruzou);
    ok("óleo na linha → desvio acordou", Math.abs(b.iaDesvio) > 0.5);
    ok("bot PASSOU pela mancha SEM cair (nenhum golpe de óleo)", !e.eventos.some((ev) => ev.t === "golpe" && ev.alvo === b.id && ev.tipo === "oleo"));
    ok("mancha AINDA viva (ninguém a comeu)", e.perigos.length === 1);
  }

  console.log("\n— D) Escudo inteligente (guarda longe, levanta perto, ABSORVE) —");
  {
    const { e, pista } = criaTudoIA(core, 41);
    const b = e.corredores[0];
    b.iaSkill = 0.82; // piloto fraco: a esquiva dele NÃO vence o míssil (o teste é do ESCUDO, não da esquiva)
    const reta = achaReta(core, pista, 40, 0.0025);
    porNaAmostra(pista, b, reta, 30);
    b.item = "escudo"; b.iaItemTimer = 0.01;
    const missil = { id: e.seqId++, tipo: "missil", x: 0, z: 0, ang: 0, vel: 55, dono: e.corredores[11].id, alvo: b.id, vida: 9, iAmostra: reta };
    const porMissil = (i) => {
      const a = pista.amostras[i];
      missil.x = a.x; missil.z = a.z; missil.ang = Math.atan2(a.tx, a.tz); missil.iAmostra = i;
    };
    porMissil((reta - 16 + pista.amostras.length) % pista.amostras.length); // 40 u atrás
    e.projeteis.push(missil);
    for (let k = 0; k < 3; k++) core.passoCorridaMulti(e, {}, passo);
    ok("míssil longe (d > 28): escudo CONTINUA no bolso", b.item === "escudo" && b.escudo === 0);
    ok("nenhum «uso» do escudo à toa", !e.eventos.some((ev) => ev.t === "uso" && ev.id === b.id));
    porMissil((reta - 4 + pista.amostras.length) % pista.amostras.length); // 10 u ATRÁS — o míssil persegue e morre no escudo
    b.iaItemTimer = 0.01;
    for (let k = 0; k < 3; k++) core.passoCorridaMulti(e, {}, passo);
    ok("míssil perto (d < 28): escudo LEVANTADO na hora certa", b.item === null && b.escudo > 0 && e.eventos.some((ev) => ev.t === "uso" && ev.id === b.id));
    for (let k = 0; k < 150 && b.escudo > 0; k++) core.passoCorridaMulti(e, {}, passo);
    ok("o míssil chegou e MORREU no escudo (evento «escudo», sem stun)", e.eventos.some((ev) => ev.t === "escudo" && ev.alvo === b.id) && b.stun === 0);
  }

  console.log("\n— E) Itens com cabeça (turbo na reta · armas vs escudo · óleo útil) —");
  {
    const { e, pista } = criaTudoIA(core, 51);
    const b = e.corredores[0];
    const reta = achaReta(core, pista, 16, 0.0028); // reta PELO OLHO DA IA (mesma régua do bot)
    porNaAmostra(pista, b, reta, 30);
    b.item = "cogumelo"; b.iaItemTimer = 0.01;
    core.passoCorridaMulti(e, {}, passo);
    ok("turbo na RETA: gastou (boost > 0)", b.boost > 0 && b.item === null);
    // curva: acha o troço com MAIS curvatura média à frente
    let iCurva = 0, melhor = -1;
    for (let i = 0; i < pista.amostras.length; i++) {
      let soma = 0;
      for (let k = 1; k <= 16; k++) soma += pista.amostras[(i + k) % pista.amostras.length].curva;
      if (soma / 16 > melhor) { melhor = soma / 16; iCurva = i; }
    }
    porNaAmostra(pista, b, iCurva, 20);
    b.item = "cogumelo"; b.iaItemTimer = 0.01; b.boost = 0;
    core.passoCorridaMulti(e, {}, passo);
    ok("turbo na CURVA: guardado para a reta (item fica no bolso)", b.item === "cogumelo" && b.boost === 0);

    // arma vs alvo com escudo: desperdício → guarda; sem escudo → dispara
    const alvo = e.corredores[1];
    porNaAmostra(pista, b, reta, 30);
    const jA = (reta + 8) % pista.amostras.length;
    porNaAmostra(pista, alvo, jA, 30);
    alvo.sTotal = b.sTotal + 20; // à frente NA ORDEM (proximoPara)
    b.item = "cascaAlvo"; b.iaItemTimer = 0.01;
    alvo.escudo = 5;
    const nProj0 = e.projeteis.length;
    core.passoCorridaMulti(e, {}, passo);
    ok("alvo COM escudo: casca-alvo guardada (tiro desperdiçado é tiro perdido)", b.item === "cascaAlvo" && e.projeteis.length === nProj0);
    alvo.escudo = 0;
    b.iaItemTimer = 0.01;
    core.passoCorridaMulti(e, {}, passo);
    ok("alvo SEM escudo e a 20 u: casca-alvo DISPARADA", b.item === null && e.projeteis.length === nProj0 + 1);

    // óleo sem ninguém colado atrás → guarda (fica no meio de ninguém)
    porNaAmostra(pista, b, reta, 30);
    porNaAmostra(pista, alvo, jA, 30);
    alvo.sTotal = b.sTotal + 20;
    b.item = "oleo"; b.iaItemTimer = 0.01;
    core.passoCorridaMulti(e, {}, passo);
    ok("óleo SEM ninguém atrás: guardado (não suja a pista à toa)", b.item === "oleo");
    // com alguém colado atrás → dispara (determinístico com esta semente: primeiro
    // disparo em ≤6 tentativas — o rolo rng tem 75% de aprovação por tentativa)
    const atras = e.corredores[2];
    porNaAmostra(pista, atras, (reta - 8 + pista.amostras.length) % pista.amostras.length, 30);
    atras.sTotal = b.sTotal - 20;
    let disparou = false;
    for (let k = 0; k < 6 && !disparou; k++) { b.iaItemTimer = 0.01; core.passoCorridaMulti(e, {}, passo); disparou = b.item === null; }
    ok("óleo COM rival colado atrás: largou a mancha (≤6 tentativas de rolo 75%)", disparou);
  }

  console.log("\n— F) Trânsito: desvio para ultrapassar sem choque —");
  {
    const { e, pista } = criaTudoIA(core, 61);
    const tras = e.corredores[0], frente = e.corredores[1];
    const reta = achaReta(core, pista, 40, 0.0025);
    porNaAmostra(pista, frente, (reta + 3) % pista.amostras.length, 30); // 7,5 u à frente
    porNaAmostra(pista, tras, reta, 30);
    tras.sTotal = frente.sTotal - 7.5;
    for (let k = 0; k < 6; k++) core.passoCorridaMulti(e, {}, passo);
    ok("kart colado à frente na MESMA linha → desvio lateral acordou", Math.abs(tras.iaDesvio) > 0.3);
    ok("nenhum evento golpe (o choque foi evitado por linha)", !e.eventos.some((ev) => ev.t === "golpe"));
  }

  console.log("\n— G) O desvio RELAXA quando a pista fica livre —");
  {
    const { e, pista } = criaTudoIA(core, 71);
    const b = e.corredores[0];
    porNaAmostra(pista, b, 400, 30);
    e.projeteis.push({ id: e.seqId++, tipo: "missil", x: pista.amostras[384].x, z: pista.amostras[384].z, ang: Math.atan2(pista.amostras[384].tx, pista.amostras[384].tz), vel: 55, dono: e.corredores[11].id, alvo: b.id, vida: 5, iAmostra: 384 });
    for (let k = 0; k < 8; k++) core.passoCorridaMulti(e, {}, passo);
    const pico = Math.abs(b.iaDesvio);
    ok("ameaça ativa → desvio subiu", pico > 1);
    e.projeteis.length = 0; e.perigos.length = 0;
    for (let k = 0; k < 30; k++) core.passoCorridaMulti(e, {}, passo);
    ok("1 s sem ameaça → desvio relaxou a ≈0 (volta à linha pessoal)", Math.abs(b.iaDesvio) < 0.1);
  }

  console.log("\n— H) Rubber-banding v65 intacto —");
  {
    const pista = core.construirPista(core.PISTAS[1]);
    const e = core.novaCorrida({ pista, voltas: 3, kartJogador: "viralata", semente: 81 });
    largar(e);
    for (let k = 0; k < 15; k++) core.passoCorrida(e, core.entradaParada(), passo); // passa as reações à largada (≤ 0,4 s)
    const bot = e.corredores[0];
    bot.sTotal = e.corredores[6].sTotal - 200; // MUITO atrás
    core.passoCorrida(e, core.entradaParada(), passo);
    ok("bot 200 u atrás → fôlego 1,07", bot.iaRubber === 1.07);
    bot.sTotal = e.corredores[6].sTotal + 200; // MUITO à frente
    core.passoCorrida(e, core.entradaParada(), passo);
    ok("bot 200 u à frente → trava 0,93", bot.iaRubber === 0.93);
  }

  console.log("\n— I) Determinismo (mesma semente → mesma corrida) —");
  {
    const r1 = criaTudoIA(core, 91);
    const r2 = criaTudoIA(core, 91);
    for (let k = 0; k < 150; k++) { core.passoCorridaMulti(r1.e, {}, passo); core.passoCorridaMulti(r2.e, {}, passo); }
    ok("5 s de corrida all-IA: hash de posições IDÊNTICO", hashPos(r1.e) === hashPos(r2.e));
    ok("a corrida andou de fato (sTotal progrediu)", r1.e.corredores.every((c) => c.sTotal > 300 * core.PASSO_AMOSTRA));
  }

  console.log("\n— J) Corrida completa nas 3 pistas com a IA nova —");
  for (const pi of core.PISTAS) {
    const r = core.simularCorrida({ pista: core.construirPista(pi), voltas: 3, kartJogador: "viralata", semente: 2026, maxSegundos: 1200, recordeAnterior: Infinity });
    const j = r.estado.corredores[6];
    ok(`${pi.id}: corrida termina (fase fim, ${r.passos} passos)`, r.estado.fase === "fim" && j.terminou && j.tempoFim > 0);
    ok(`${pi.id}: 12 posições únicas com nomes`, r.estado.resultados.length === 12 && new Set(r.estado.resultados.map((x) => x.posicao)).size === 12 && r.estado.resultados.every((x) => x.nome.length > 0));
    ok(`${pi.id}: payout honesto pela posição`, !!r.estado.payout && r.estado.payout.moedas === core.recompensaCorrida(j.posicao, j.moedas, 3).moedas);
    ok(`${pi.id}: SEM NaN em nenhuma física`, r.estado.corredores.every((c) => Number.isFinite(c.x) && Number.isFinite(c.z) && Number.isFinite(c.vel) && Number.isFinite(c.iaDesvio)));
  }

  // ── Resumo ──────────────────────────────────────────────────
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`PASS: ${passed}  FAIL: ${failed}`);
  if (fails.length) { console.log("FALHAS:"); for (const f of fails) console.log(`  - ${f}`); }
  console.log("");
  process.exit(failed ? 1 : 0);
}

// TSC rápido antes de importar (o core é TS — o Node stripa, mas o erro de tipo interessa à suíte)
const tsc = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"], { cwd: RAIZ, encoding: "utf8" });
if (tsc.status !== 0) { console.error("❌ tsc falhou antes da suíte:\n" + tsc.stdout); process.exit(1); }

try {
  core = await import(`${RAIZ}/src/game/kart/core.ts`);
} catch (err) {
  console.error("❌ import do core falhou:", err);
  process.exit(1);
}
await main();
