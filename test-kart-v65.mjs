// ============================================================
// v65 — BATEU KART: corridas LONGAS + garagem (carros e armas)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node): pistas Catmull-Rom longas e determinísticas,
//    stats/melhorias/custos, progressão (XP inverso), save
//    validado, desbloqueio de karts, itens ponderados por posição,
//    contagem 3-2-1, física (aceleração/off-road), DERRAPAGEM com
//    mini-turbo, caixas/moedas, casca/míssil/óleo/raio/escudo,
//    voltas/posições, corrida COMPLETA com payout e recorde.
// B) E2E (vite + browser): menu honesto, garagem compra de facto,
//    largada, 12 corredores, condução assistida, caixa → item →
//    uso, pausa/retomar, volta por progresso, CHEGADA real com
//    resultados+payout, persistência no aparelho após reload,
//    ZERO pageerror.
// Uso: PW_CHROME=… node test-kart-v65.mjs
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

// ── Subprocessos (grupo DETACHED — lições v49/v53/v56/v61) ──
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

/** Corre o passo da corrida com condução de perseguição (igual aos bots) — prova determinística. */
function dirigir(e, dt, opts = {}) {
  const j = e.corredores[6];
  const m = e.pista.amostras.length;
  const alvo = e.pista.amostras[(j.iAmostra + 12) % m];
  const dif = Math.atan2(alvo.x - j.x, alvo.z - j.z) - j.ang;
  const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
  core.passoCorrida(e, {
    acelerar: true,
    travar: false,
    virar: Math.max(-1, Math.min(1, difN * 2.5)),
    derrapar: opts.derrapar ?? false,
    usarItem: opts.usarItem ?? false,
  }, dt);
}

// ═══════════════════════════════════════════════════════════════
let core;
async function main() {
  limparZumbis();
  console.log(`\n🏎 BATEU KART v65 — CORRIDAS LONGAS + GARAGEM — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (core.ts) —");
  core = await import(`${RAIZ}/src/game/kart/core.ts`);

  // 1) pistas
  ok("3 pistas (praia, deserto, vulcão)", core.PISTAS.length === 3
    && core.IDS_PISTAS.join(",") === "praia,deserto,vulcao");
  const pistas = core.PISTAS.map((d) => core.construirPista(d));
  ok("corridas LONGAS: todas as pistas ≥ 1500 u por volta", pistas.every((p) => p.comprimento >= 1500));
  ok("vulcão é a mais longa (5 voltas sugeridas)", pistas[2].comprimento > pistas[0].comprimento
    && core.PISTAS[2].voltasSugeridas === 5);
  const p1 = core.construirPista(core.PISTAS[0]);
  ok("pista DETERMINÍSTICA (mesma seed → mesmas amostras)", p1.amostras[100].x === pistas[0].amostras[100].x
    && p1.amostras[100].z === pistas[0].amostras[100].z);
  ok("objetos na pista: caixas+moedas+rampas em todas", pistas.every((p) => p.caixas.length >= 15 && p.moedas.length >= 25 && p.rampas.length === 3));

  // 2) amostraPerto monotónica ao longo do traçado
  {
    const pista = pistas[0];
    let monotonia = true, lateralOk = true;
    let iAnt = 0;
    for (const a of pista.amostras) {
      const ref = core.amostraPerto(pista, a.x + a.nx * 2, a.z + a.nz * 2, iAnt);
      if (ref.i < iAnt - 5) monotonia = false;
      if (Math.abs(ref.lateral - 2) > 0.5) lateralOk = false;
      iAnt = ref.i;
    }
    ok("amostraPerto segue o traçado (janela ±40 sem saltos)", monotonia);
    ok("lateral assinada fiel a ±0,5 u", lateralOk);
  }

  // 3) garagem: stats/custos/teto
  ok("motor melhora velMax (5 níveis = +6,5 u/s)", core.statsDe("viralata", { motor: 5 }).velMax === core.KARTS.viralata.velMax + 6.5
    && core.statsDe("viralata", { motor: 9 }).velMax === core.statsDe("viralata", { motor: 5 }).velMax);
  ok("armas sobem o poder (tanque + armas 5 > base)", core.statsDe("tanque", { armas: 5 }).poderArma > core.statsDe("tanque", {}).poderArma);
  const custos = [0, 1, 2, 3, 4].map((n) => core.custoMelhoria(n));
  ok("custos ESCALONADOS e teto honesto (140…1169 → 0)", JSON.stringify(custos) === "[140,238,405,688,1169]" && core.custoMelhoria(5) === 0);
  ok("blindagem reduz o stun (tanque base 10% + níveis)", Math.abs(core.statsDe("tanque", { blindagem: 5 }).stunReducao - 0.55) < 1e-9
    && core.statsDe("viralata", {}).stunReducao === 0);

  // 4) progressão
  ok("XP inverso exato (xpTotalAteNivel ∘ nivelDeXp)", core.nivelDeXp(core.xpTotalAteNivel(7)) === 7
    && core.nivelDeXp(core.xpTotalAteNivel(7) - 1) === 6);
  ok("recompensa: 1.º > 12.º e moedas da pista contam", core.recompensaCorrida(1, 10, 4).moedas > core.recompensaCorrida(12, 10, 4).moedas
    && core.recompensaCorrida(5, 20, 4).moedas === core.recompensaCorrida(5, 0, 4).moedas + 240);

  // 5) save validado
  ok("save podre → omissão honesta", core.validarSaveKart(null).moedas === core.saveOmissao().moedas
    && core.validarSaveKart("lixo").kart === "viralata"
    && core.validarSaveKart({ moedas: -50, xp: "x", kart: "inexistente" }).moedas === 0
    && core.validarSaveKart({ moedas: -50, xp: "x", kart: "inexistente" }).kart === "viralata");
  ok("save com lixo nas melhorias é SANITIZADO", (() => {
    const s = core.validarSaveKart({ melhorias: { "viralata.motor": 9, "viralata.xpto": 5, "podre.motor": 3 }, recordes: { praia: -3, deserto: 120 } });
    return s.melhorias["viralata.motor"] === 5 && !("viralata.xpto" in s.melhorias) && !("podre.motor" in s.melhorias)
      && !("praia" in s.recordes) && s.recordes.deserto === 120;
  })());

  // 6) desbloqueio de karts
  ok("desbloqueio honesto: nível, moedas, possuído", core.kartDesbloqueado("viralata", ["viralata"], 1, 0).sim
    && core.kartDesbloqueado("foguetinho", [], 1, 9999).motivo === "nivel"
    && core.kartDesbloqueado("foguetinho", [], 9, 100).motivo === "moedas"
    && core.kartDesbloqueado("foguetinho", [], 9, 1500).sim);

  // 7) itens ponderados por posição
  ok("1.º lugar NUNCA recebe raio/míssil (padrão Mario Kart)", core.pesosItem(1, 12).raio === 0 && core.pesosItem(1, 12).missil === 0);
  ok("últimos lugares recebem as armas melhores", core.pesosItem(11, 12).raio > 0 && core.pesosItem(11, 12).cogumelo3 > core.pesosItem(1, 12).cogumelo3);
  {
    const rng = core.rng32(777);
    let todosValidos = true;
    for (let i = 0; i < 2000; i++) if (!core.IDS_ITENS.includes(core.rolarItem(rng, 1 + (i % 12), 12))) todosValidos = false;
    ok("2000 rolos de item → sempre ids válidos", todosValidos);
  }

  // 8) nova corrida + contagem
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 4, kartJogador: "viralata", semente: 42, nomeJogador: "Tu", recordeAnterior: Infinity });
    ok("12 corredores, jogador id 6 no MEIO da grelha", e.corredores.length === 12 && e.corredores[6].eJogador && e.corredores[6].id === 6);
    ok("grelha ATRÁS da linha (sTotal negativo) e fase contagem", e.corredores.every((c) => c.sTotal < 0) && e.fase === "contagem");
    for (let i = 0; i < 30; i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("contagem bloqueia o movimento (vel 0 nos 12)", e.corredores.every((c) => c.vel === 0));
    ok("4 voltas e pista partilhada", e.voltas === 4 && e.pista === pistas[0]);
  }

  // 9) física: aceleração, teto, off-road
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 7, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    let maxVel = 0;
    for (let i = 0; i < 1200; i++) {
      dirigir(e, 1 / 30);
      if (j.vel > maxVel) maxVel = j.vel;
    }
    ok("acelera até perto do teto (~38 u/s em retas)", maxVel > 30 && maxVel <= core.KARTS.viralata.velMax + 0.1);
    // força off-road: teleporta para fora da estrada
    const a = e.pista.amostras[100];
    j.x = a.x + a.nx * (e.pista.def.largura + 4); j.z = a.z + a.nz * (e.pista.def.largura + 4);
    for (let i = 0; i < 90; i++) core.passoCorrida(e, { acelerar: true, travar: false, virar: 0, derrapar: false, usarItem: false }, 1 / 30);
    ok("fora da pista MORDE (vel ≤ 42% do teto + folga)", j.foraPista === true && j.vel <= core.KARTS.viralata.velMax * 0.42 + 4);
  }

  // 10) DERRAPAGEM → MINI-TURBO (setup determinístico numa curva, condução de perseguição)
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 9, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    const curva = e.pista.amostras.reduce((mel, a, i) => (a.curva > mel.curva ? { curva: a.curva, i } : mel), { curva: 0, i: 0 });
    const a = e.pista.amostras[curva.i];
    j.x = a.x; j.z = a.z; j.ang = Math.atan2(a.tx, a.tz); j.dirAng = j.ang;
    j.iAmostra = curva.i; j.dsAnt = a.s; j.sTotal = a.s; j.vel = 28;
    let cargaMax = 0;
    for (let i = 0; i < 400; i++) {
      dirigir(e, 1 / 30, { derrapar: true });
      if (j.derivaCarga > cargaMax) cargaMax = j.derivaCarga;
      if (j.derrapando && j.derivaCarga >= 1.5) break; // carga suficiente → soltar já
    }
    ok("deriva acumula carga nas curvas", cargaMax > 1.2 && j.derrapando === true);
    const nEv = e.eventos.length;
    for (let i = 0; i < 10; i++) core.passoCorrida(e, { acelerar: true, travar: false, virar: 0, derrapar: false, usarItem: false }, 1 / 30);
    ok("soltar a deriva dá MINI-TURBO (boost + evento)", j.boost > 0 && e.eventos.slice(nEv).some((ev) => ev.t === "deriva"));
  }

  // 11) caixa de item → rolo → uso
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 11, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    const caixa = e.caixas[0];
    j.x = caixa.x; j.z = caixa.z + 0.5; j.vel = 6;
    j.iAmostra = core.amostraPerto(e.pista, j.x, j.z, 0).i;
    const aCx = e.pista.amostras[j.iAmostra];
    j.ang = Math.atan2(aCx.tx, aCx.tz); j.dirAng = j.ang; j.dsAnt = aCx.s; // cabeça APONTADA à pista!
    for (let i = 0; i < 20 && !j.item; i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("recolhe caixa → item válido + caixa morre", core.IDS_ITENS.includes(j.item) && caixa.viva === false);
    j.item = "casca"; // determiniza o rolo para o teste do projétil
    const nProj = e.projeteis.length;
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    ok("casca usada → projétil a voar", e.projeteis.length === nProj + 1 && j.item === null);
    // alvo à frente na trajetória do projétil
    const proj = e.projeteis[e.projeteis.length - 1];
    const alvo = e.corredores[3];
    alvo.x = proj.x + Math.sin(proj.ang) * 30; alvo.z = proj.z + Math.cos(proj.ang) * 30; alvo.vel = 0;
    const stunAntes = alvo.stun;
    for (let i = 0; i < 90 && alvo.stun === stunAntes; i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("casca ACERTA o corredor à frente (stun + evento golpe)", alvo.stun > 0 && e.eventos.some((ev) => ev.t === "golpe" && ev.alvo === 3 && ev.tipo === "casca"));
  }

  // 12) casca-alvo persegue; míssil existe
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 13, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    j.sTotal = 500; j.iAmostra = Math.floor(500 / core.PASSO_AMOSTRA);
    // move o jogador e o alvo PARA OS RESPECTIVOS SÍTIOS DA PISTA (longe da grelha!)
    const aJ = e.pista.amostras[j.iAmostra];
    j.x = aJ.x; j.z = aJ.z; j.ang = Math.atan2(aJ.tx, aJ.tz); j.dirAng = j.ang; j.dsAnt = aJ.s;
    const daFrente = e.corredores[2];
    daFrente.sTotal = 600; daFrente.iAmostra = Math.floor(600 / core.PASSO_AMOSTRA);
    const aF = e.pista.amostras[daFrente.iAmostra];
    daFrente.x = aF.x; daFrente.z = aF.z; daFrente.ang = Math.atan2(aF.tx, aF.tz); daFrente.dirAng = daFrente.ang; daFrente.dsAnt = aF.s; daFrente.iAmostra = daFrente.iAmostra;
    j.item = "cascaAlvo";
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    const proj = e.projeteis.find((p) => p.tipo === "cascaAlvo");
    ok("casca-alvo NASCE apontada a quem está à frente", !!proj && proj.alvo === daFrente.id);
    // coloca o alvo ATRÁS e ao lado — o projétil tem de CURVAR para ele
    const proj2 = e.projeteis.find((p) => p.tipo === "cascaAlvo");
    daFrente.x = proj2.x - Math.sin(proj2.ang) * 40; daFrente.z = proj2.z - Math.cos(proj2.ang) * 40;
    const ang0 = proj2.ang;
    for (let i = 0; i < 40; i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("casca-alvo CURVA em direção ao alvo (homing)", Math.abs(((proj2.ang - ang0 + Math.PI) % (2 * Math.PI)) - Math.PI) > 0.4);
    j.item = "missil";
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    ok("míssil mais RÁPIDO que a casca (armas contam)", e.projeteis.some((p) => p.tipo === "missil" && p.vel > 46));
  }

  // 13) óleo, raio, escudo, cogumelo3
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 17, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    const outro = e.corredores[2];
    // óleo do outro: uso DIRETO (a IA decide por temporizador — determinístico via API do núcleo)
    outro.item = "oleo";
    core.usarItemKart(e, outro, outro.stats);
    const mancha = e.perigos[0];
    ok("óleo cai ATRÁS de quem o largou", !!mancha && e.perigos.length === 1);
    // mancha movida para um troço LIVRE da pista (a grelha tem bots a 4,5 u — golpeava o vizinho)
    const aL = e.pista.amostras[300];
    mancha.x = aL.x; mancha.z = aL.z;
    j.x = mancha.x; j.z = mancha.z; j.vel = 10;
    j.iAmostra = 300; j.dsAnt = aL.s; j.sTotal = aL.s; // teleport HONESTO: índice da amostra também!
    core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("óleo no chão derruba quem passa (stun)", j.stun > 0);
    // raio do jogador: todos os outros giram, NÃO ele
    for (const c of e.corredores) c.stun = 0;
    j.item = "raio";
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    ok("RAIO gira TODOS os outros e nunca o dono", j.stun === 0 && e.corredores.filter((c) => !c.eJogador && c.stun > 0).length >= 8);
    // escudo absorve um golpe (míssil MANUAL, determinístico)
    for (const c of e.corredores) c.stun = 0;
    j.escudo = 9;
    e.projeteis.push({ id: e.seqId++, tipo: "missil", x: j.x - Math.sin(j.ang) * 10, z: j.z - Math.cos(j.ang) * 10, ang: j.ang, vel: 55, dono: 4, alvo: 6, vida: 7, iAmostra: j.iAmostra });
    for (let i = 0; i < 90 && j.escudo > 0; i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("escudo ABSORVE o golpe (sumiu, sem stun)", j.escudo === 0 && j.stun === 0);
    // pacote de 3 cogumelos = 3 usos (o 4.º não faz nada)
    for (const c of e.corredores) c.stun = 0;
    j.item = "cogumelo3"; j.itens3 = 0; j.boost = 0;
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    const boostDepois = j.boost;
    core.passoCorrida(e, { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: true }, 1 / 30);
    ok("pacote de 3 cogumelos esgota NO 3.º uso", j.item === null && j.itens3 === 0 && boostDepois > 0);
  }

  // 14) voltas/posições/chegada — corrida COMPLETA determinística
  {
    const r = core.simularCorrida({ pista: pistas[1], voltas: 3, kartJogador: "viralata", semente: 2026, maxSegundos: 1200, recordeAnterior: Infinity });
    const e = r.estado;
    const j = e.corredores[6];
    ok("corrida COMPLETA termina (3 voltas no deserto)", e.fase === "fim" && j.terminou && j.tempoFim > 0);
    ok("payout HONESTO (moedas+xp pela posição)", !!e.payout && e.payout.moedas >= 80 && e.payout.xp >= 40
      && e.payout.moedas === core.recompensaCorrida(j.posicao, j.moedas, 3).moedas);
    ok("resultados com 12 e posições sem repetidos", e.resultados.length === 12
      && new Set(e.resultados.map((x) => x.posicao)).size === 12);
    ok("evento fim chega com recorde TRUE (recordeAnterior=∞)", e.eventos.some((ev) => ev.t === "fim" && ev.recorde === true && ev.posicao === j.posicao));
    const r2 = core.simularCorrida({ pista: pistas[1], voltas: 3, kartJogador: "viralata", semente: 2026, maxSegundos: 1200, recordeAnterior: j.tempoFim - 0.001 });
    ok("recordeANTERIOR melhor → payout.recorde FALSE", r2.estado.payout?.recorde === false);
  }

  // 15) moedas da pista sobem o teto
  {
    const e = core.novaCorrida({ pista: pistas[0], voltas: 3, kartJogador: "viralata", semente: 23, recordeAnterior: Infinity });
    e.fase = "corrida";
    const j = e.corredores[6];
    const moeda = e.moedas[0];
    j.x = moeda.x; j.z = moeda.z; j.vel = 4;
    j.iAmostra = core.amostraPerto(e.pista, j.x, j.z, 0).i;
    for (let i = 0; i < 20 && !e.eventos.some((ev) => ev.t === "moeda"); i++) core.passoCorrida(e, core.entradaParada(), 1 / 30);
    ok("moeda recolhida (+evento, conta para o payout)", j.moedas === 1 && e.eventos.some((ev) => ev.t === "moeda" && ev.id === 6));
  }

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: menu → garagem → corrida → chegada) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  // aquecimento (lição v62: a 1.ª carga otimiza deps e RECAREGA a página)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const SAVE_TESTE = JSON.stringify({ moedas: 5000, xp: 0, kart: "viralata", possuidos: ["viralata"], melhorias: {}, recordes: {}, corridas: 0, vitorias: 0, ts: 0 });
  await ctx.addInitScript((s) => {
    try { if (!localStorage.getItem("bateu_kart_save")) localStorage.setItem("bateu_kart_save", s); } catch {}
  }, SAVE_TESTE);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("menu do kart renderiza no hub (?game=kart)", true);
  ok("nota HONESTA de solo (11 IA, online é passo seguinte)",
    (await pg.locator('[data-testid="kart-menu-nota"]').innerText()).length > 20);
  ok("save semeado aparece (5000 moedas)",
    (await pg.locator('[data-testid="kart-save-info"]').innerText()).includes("5000"));

  // garagem: comprar motor de facto
  await pg.locator('[data-testid="kart-garagem"]').click();
  await pg.waitForSelector('[data-testid="kart-garagem-modal"]', { timeout: 10_000 });
  const antesNv = await pg.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("bateu_kart_save") || "{}");
    return s.melhorias?.["viralata.motor"] ?? 0;
  });
  await pg.locator('[data-testid="kart-comprar-motor"]').click();
  await dormir(400);
  const depois = await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_kart_save") || "{}"));
  ok("garagem COMPRA de facto (motor nv+1, moedas −140)",
    depois.melhorias?.["viralata.motor"] === antesNv + 1 && depois.moedas === 5000 - 140);
  ok("foguetinho BLOQUEADO por nível (xp 0)",
    (await pg.locator('[data-testid="kart-kart-foguetinho"]').innerText()).toLowerCase().includes("lv 2")
    || (await pg.locator('[data-testid="kart-kart-foguetinho"]').innerText()).includes("Nv 2"));
  await pg.locator('[data-testid="kart-garagem-fechar"]').click();

  // largada
  await pg.locator('[data-testid="kart-pista-praia"]').click();
  await pg.locator('[data-testid="kart-volta-4"]').click();
  await pg.locator('[data-testid="kart-entrar"]').click();
  await pg.waitForSelector('[data-testid="kart-jogo"]', { timeout: 30_000 });
  ok("corrida montou o jogo (portal + canvas)", (await pg.locator('[data-testid="kart-canvas"]').count()) === 1);

  let fase = "";
  for (let i = 0; i < 40 && fase !== "corrida"; i++) {
    fase = (await pg.evaluate(() => window.__kart?.estado()?.fase).catch(() => "")) || "";
    if (fase !== "corrida") await dormir(500);
  }
  ok("contagem 3-2-1 terminou → fase corrida", fase === "corrida");
  ok("12 corredores na grelha", (await pg.evaluate(() => window.__kart.estado().corredores)) === 12);

  // condução assistida → anda (tolerante a SwiftShader lento: poll até vel > 20)
  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  let andaOk = false;
  for (let i = 0; i < 30 && !andaOk; i++) {
    await dormir(1000);
    andaOk = await pg.evaluate(() => window.__kart.estado().vel > 20).catch(() => false);
  }
  const pos0 = await pg.evaluate(() => ({ x: window.__kart.estado().x, z: window.__kart.estado().z }));
  await dormir(2000);
  const pos1 = await pg.evaluate(() => ({ x: window.__kart.estado().x, z: window.__kart.estado().z, vel: window.__kart.estado().vel }));
  ok("kart ANDA (vel > 20 e d > 15 u em 2 s)", andaOk && Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z) > 15);
  await pg.screenshot({ path: "shots-v65/kart-corrida.png" }).catch(() => {});

  // caixa → item → uso
  await pg.evaluate(() => window.__kart.tpCaixaMaisPerto());
  let item = null;
  for (let i = 0; i < 30 && !item; i++) {
    await dormir(500);
    item = await pg.evaluate(() => window.__kart.estado().item);
  }
  ok("recolhe ITEM de uma caixa real", !!item);
  await pg.evaluate(() => window.__kart.usarItem());
  let efeito = false;
  for (let i = 0; i < 10 && !efeito; i++) {
    await dormir(400);
    efeito = await pg.evaluate(() => {
      const s = window.__kart.estado();
      return s.projeteis > 0 || s.boost || s.escudo || s.perigos > 0 || s.itens3 > 0 || s.raioRecente;
    });
  }
  ok("item USADO produz efeito REAL (projétil/boost/escudo/óleo/raio)", efeito && !!item);

  // pausa/retomar
  await pg.locator('[data-testid="kart-pausa"]').click();
  ok("pausa abre o modal", (await pg.locator('[data-testid="kart-pausa-modal"]').count()) === 1
    && (await pg.evaluate(() => window.__kart.estaPausado())) === true);
  await pg.locator('[data-testid="kart-retomar"]').click();
  await dormir(300);
  ok("retomar fecha e o jogo volta a correr", (await pg.locator('[data-testid="kart-pausa-modal"]').count()) === 0
    && (await pg.evaluate(() => window.__kart.estaPausado())) === false);

  // volta por progresso (tp honesto para 1 volta + 5%)
  await pg.evaluate(() => window.__kart.tpProgresso(0.26));
  await dormir(1200);
  const volta = await pg.evaluate(() => window.__kart.estado().volta);
  ok("cruza a linha → volta 2 (progresso real do núcleo)", volta >= 2);

  // chegada REAL: tp para 98,5% da corrida e atravessa a linha
  await pg.evaluate(() => window.__kart.tpProgresso(0.985));
  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  let fim = false;
  for (let i = 0; i < 60 && !fim; i++) {
    await dormir(1000);
    fim = (await pg.evaluate(() => window.__kart.estado().fase === "fim").catch(() => false));
  }
  ok("CHEGADA real (fase fim pelo núcleo)", fim);
  await pg.waitForSelector('[data-testid="kart-resultados"]', { timeout: 15_000 });
  const payoutTxt = await pg.locator('[data-testid="kart-payout"]').innerText().catch(() => "");
  ok("resultados com payout de moedas", /\+\d+/.test(payoutTxt));
  ok("tabela de 12 posições", (await pg.locator('[data-testid="kart-resultados"] table tbody tr').count()) === 12);
  await pg.screenshot({ path: "shots-v65/kart-resultados.png" }).catch(() => {});

  // persistência no APARELHO + reload
  const saveFim = await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_kart_save") || "{}"));
  ok("save gravou corridas=1, xp>0, recorde da praia", saveFim.corridas === 1 && saveFim.xp > 0 && saveFim.recordes?.praia > 0);
  await pg.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  const saveInfo = await pg.locator('[data-testid="kart-save-info"]').innerText();
  ok("após RELOAD o progresso persiste (1 corrida + recorde)", saveInfo.includes("1") && saveInfo.includes(":"));

  const errosReais = erros.filter((e) => !/favicon|supabase|404|406|PGRST|JWT|Failed to load resource|websocket|ResizeObserver|net::/i.test(e));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   erros:", errosReais.slice(0, 4));

  await browser.close();
  matarTodos();

  console.log(`\n══ BATEU KART v65: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("FALHAS:", fails.join(" · ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO SUITE:", e); matarTodos(); process.exit(1); });
