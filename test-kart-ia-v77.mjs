// ============================================================
// v77 — UNIÃO DA IA: CÉREBRO DE CORRIDA (linha/frenagem/moedas/
//       bloqueio/leque de skill) + ELITE v76 (esquivas/largada/
//       escudo inteligente) — as provas DO QUE A v77 ACRESCENTA
// ──────────────────────────────────────────────────────────────
// A defesa (esquiva/óleo/trânsito/escudo/largada) já é provada pela
// test-kart-ia-v76.mjs (49 verdes) — esta suíte prova O QUE A v77
// JUNTA por cima: linha de corrida (interior/centro), leque de
// iaSkill a valer (0,70-0,97), moedas, cone de tiro da casca,
// alcance dos teleguiados, raio atrás no pelotão, turbo por
// perseguição, BLOQUEIO do líder (com controlo) e o FURO DO HOMING
// POR ID no estado ONLINE (id ≠ slot — SLOTS_REDE).
// B) E2E: corrida real — bots correm, apanham caixas, classificação
//    viva, ZERO pageerror.
// Uso: PW_CHROME=… node test-kart-ia-v77.mjs
// NOTA: no estado ONLINE os corredores são indexados por SLOT —
// TODAS as provas resolvem por ID.
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

// ── Harness ────────────────────────────────────────────────────
let core, pistas, praia;
const ID = (e, id) => e.corredores.find((c) => c.id === id);
function estadoNovo(semente, pistaIdx = 0) {
  return core.novaCorridaOnline({ pista: pistas[pistaIdx], voltas: 3, semente, jogadores: [{ nome: "T", kart: "viralata", melhorias: {} }] });
}
function passo(e, n = 1, dt = 1 / 30) {
  for (let k = 0; k < n; k++) core.passoCorridaMulti(e, {}, dt);
}
function arrancar(e) {
  passo(e, 130);
  if (e.fase !== "corrida") throw new Error("a contagem não terminou — harness quebrado");
}
function colocar(e, id, iAmostra, lateral, vel, extras = {}) {
  const m = e.pista.amostras.length;
  const a = e.pista.amostras[((iAmostra % m) + m) % m];
  const c = ID(e, id);
  c.x = a.x + a.nx * lateral; c.z = a.z + a.nz * lateral;
  c.ang = Math.atan2(a.tx, a.tz); c.dirAng = c.ang;
  c.vel = vel; c.iAmostra = Math.round(a.s / core.PASSO_AMOSTRA) % m;
  c.lateralPerto = lateral; c.dsAnt = a.s; c.iaOffset = 0;
  c.stun = 0; c.derrapando = false; c.derivaCarga = 0;
  if (extras.sTotalNaAmostra) { c.sTotal = a.s; delete extras.sTotalNaAmostra; }
  Object.assign(c, extras);
  return c;
}
function isolar(e, ids = []) {
  for (const c of e.corredores) if (!ids.includes(c.id)) c.sTotal = -5000;
}
function latDe(e, c) {
  const a = e.pista.amostras[c.iAmostra];
  return (c.x - a.x) * a.nx + (c.z - a.z) * a.nz;
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  limparZumbis();
  console.log(`\n🧠 UNIÃO DA IA v77 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (o que a v77 junta) —");
  core = await import(`${RAIZ}/src/game/kart/core.ts`);
  pistas = core.PISTAS.map((d) => core.construirPista(d));
  praia = pistas[0];
  const m = praia.amostras.length;

  // 1) linha de corrida: interior nas curvas, centro nas retas
  {
    const iCurva = [...praia.amostras.keys()].sort((a, b) => praia.amostras[b].curva - praia.amostras[a].curva)[0];
    const sinal = core.assinaturaCurva(praia, iCurva, iCurva + 20);
    const linha = core.linhaCorrida(praia, iCurva, 34);
    ok("linha de CORRIDA aperta para o INTERIOR da curva mais fechada (sinal oposto ao da viragem, ≥1,5 u)",
      Math.sign(linha) === -Math.sign(sinal) && Math.abs(linha) >= 1.5);
    let iReta = -1;
    for (let i = 0; i < m && iReta < 0; i++) {
      let limpa = true;
      for (let k = 0; k < 30; k++) if (praia.amostras[(i + k) % m].curva > 0.003) { limpa = false; break; }
      if (limpa) iReta = i;
    }
    ok("linha de CORRIDA é o CENTRO na reta (0 u)", iReta >= 0 && core.linhaCorrida(praia, iReta, 34) === 0);
  }

  // 2) leque de iaSkill a valer (0,70-0,97) com largada honesta
  {
    const e = estadoNovo(1001);
    const skills = e.corredores.filter((c) => !c.eJogador).map((c) => c.iaSkill);
    ok("leque de iaSkill: min < 0,78 · max > 0,90 · tudo em [0,70; 0,97]",
      Math.min(...skills) < 0.78 && Math.max(...skills) > 0.9 && skills.every((s) => s >= 0.7 && s <= 0.97));
    ok("largada com o leque largo continua honesta (0,04-0,4 s para todos)",
      e.corredores.every((c) => c.eJogador ? c.iaLargada === 0 : (c.iaLargada > 0.04 && c.iaLargada < 0.4)));
  }

  // 3) corrida completa: bots usam itens, acertam e apanham MOEDAS
  {
    const r = core.simularCorrida({ pista: pistas[1], voltas: 3, kartJogador: "viralata", semente: 2026, maxSegundos: 1200, recordeAnterior: Infinity });
    const e = r.estado;
    const j = e.corredores[6]; // SOLO: o jogador é o índice 6
    const usosBot = e.eventos.filter((x) => x.t === "uso" && x.id !== 6).length;
    const golpesBot = e.eventos.filter((x) => x.t === "golpe" && x.por !== 6).length;
    const moedasBot = e.corredores.filter((c) => !c.eJogador).reduce((a, c) => a + c.moedas, 0);
    const nan = e.corredores.some((c) => !Number.isFinite(c.x + c.z + c.vel + c.iaDesvio));
    ok("corrida COMPLETA termina com a união (sem NaN, payout honesto)",
      e.fase === "fim" && !nan && !!e.payout && e.payout.moedas === core.recompensaCorrida(j.posicao, j.moedas, 3).moedas);
    ok("bots USAM itens (≥5 usos — cone/alcance apertaram, ainda há combate)", usosBot >= 5);
    ok("bots ACERTAM golpes (≥1)", golpesBot >= 1);
    ok("bots apanham MOEDAS a valer (≥6 no total — a linha procura-as)", moedasBot >= 6);
  }

  // 4) CASCA: dispara só com alvo NO CONE; sem alvo à frente, GUARDA (sem respingo)
  {
    const e = estadoNovo(4245);
    arrancar(e);
    isolar(e, [2, 3]);
    const A = colocar(e, 2, 400, 1, 28, { item: "casca", iaItemTimer: 0.05, sTotalNaAmostra: true });
    const B = ID(e, 3);
    B.x = A.x + Math.sin(A.ang) * 45 + Math.cos(A.ang) * 0.5;
    B.z = A.z + Math.cos(A.ang) * 45 - Math.sin(A.ang) * 0.5;
    B.ang = A.ang; B.dirAng = A.ang; B.vel = 28; B.iAmostra = 418;
    B.lateralPerto = 1; B.dsAnt = praia.amostras[418].s; B.sTotal = A.sTotal + 45;
    B.stun = 0; B.derrapando = false; B.iaOffset = 0;
    const n0 = e.eventos.length;
    passo(e, 90);
    ok("CASCA com alvo NO CONE dispara em ≤3 s",
      e.eventos.slice(n0).some((x) => x.t === "uso" && x.id === 2 && x.item === "casca"));

    const e2 = estadoNovo(4246);
    arrancar(e2);
    isolar(e2, [2]);
    colocar(e2, 2, 400, 1, 28, { item: "casca", iaItemTimer: 0.05, sTotalNaAmostra: true }); // posição 1
    const n20 = e2.eventos.length;
    passo(e2, 180); // 6 s — SEM respingo: sem alvo, nunca dispara
    ok("CASCA SEM alvo à frente fica GUARDA (posição 1 não dispara à toa, 6 s)",
      !e2.eventos.slice(n20).some((x) => x.t === "uso" && x.id === 2 && x.item === "casca")
      && ID(e2, 2).item === "casca");
  }

  // 5) MÍSSIL: fora do alcance GUARDA; ao alcance dispara (teleporte relativo ao A atual)
  {
    const e = estadoNovo(4247);
    arrancar(e);
    isolar(e, [2, 3]);
    const A0 = colocar(e, 2, 400, 1, 28, { item: "missil", iaItemTimer: 0.05, sTotalNaAmostra: true });
    const B = ID(e, 3);
    B.x = A0.x + Math.sin(A0.ang) * 375; B.z = A0.z + Math.cos(A0.ang) * 375; // LONGE (dispara < 200)
    B.ang = A0.ang; B.dirAng = A0.ang; B.vel = 28; B.iAmostra = 550; B.lateralPerto = 1;
    B.dsAnt = praia.amostras[550].s; B.sTotal = A0.sTotal + 375; B.stun = 0; B.derrapando = false; B.iaOffset = 0;
    const n0 = e.eventos.length;
    passo(e, 90);
    const guardou = !e.eventos.slice(n0).some((x) => x.t === "uso" && x.id === 2 && x.item === "missil");
    const base = ID(e, 2).iAmostra;
    colocar(e, 2, base, 1, 28, { item: "missil", sTotalNaAmostra: true });
    const B2 = ID(e, 3);
    const A1 = ID(e, 2);
    B2.x = A1.x + Math.sin(A1.ang) * 40; B2.z = A1.z + Math.cos(A1.ang) * 40;
    B2.ang = A1.ang; B2.dirAng = A1.ang; B2.vel = 28; B2.iAmostra = (base + 16) % m;
    B2.lateralPerto = 1; B2.dsAnt = praia.amostras[(base + 16) % m].s; B2.sTotal = A1.sTotal + 40;
    B2.stun = 0; B2.derrapando = false; B2.iaOffset = 0;
    const n1 = e.eventos.length;
    passo(e, 90);
    ok("MÍSSIL: a 375 u GUARDA · a ~40 u DISPARA",
      guardou && e.eventos.slice(n1).some((x) => x.t === "uso" && x.id === 2 && x.item === "missil"));
  }

  // 6) RAIO: atrás no pelotão dispara cedo (posicao ≥ 5)
  {
    const e = estadoNovo(4248);
    arrancar(e);
    isolar(e, [0, 1, 2, 3, 4, 5]);
    colocar(e, 2, 400, 1, 28, { item: "raio", iaItemTimer: 0.05, sTotalNaAmostra: true });
    let k = 0;
    for (const id of [0, 1, 3, 4, 5]) { // 5 bots À FRENTE do id 2
      colocar(e, id, 500 + k * 20, (k % 2 === 0 ? -1 : 1) * 1.5, 28, { sTotalNaAmostra: true });
      ID(e, id).sTotal = praia.amostras[(500 + k * 20) % m].s + praia.comprimento;
      k++;
    }
    const n0 = e.eventos.length;
    passo(e, 90);
    ok("RAIO atrás no pelotão dispara em ≤3 s (posicao ≥ 5)",
      e.eventos.slice(n0).some((x) => x.t === "uso" && x.id === 2 && x.item === "raio"));
  }

  // 7) COGUMELO: perseguidor colado → gasta MESMO em curva (v77); sem ninguém → guarda
  {
    const iCurva = [...praia.amostras.keys()].sort((a, b) => praia.amostras[b].curva - praia.amostras[a].curva)[0];
    const e = estadoNovo(4251);
    arrancar(e);
    isolar(e, [2, 3]);
    const A = colocar(e, 2, iCurva, 1, 30, { item: "cogumelo", iaItemTimer: 0.05, sTotalNaAmostra: true });
    const P = ID(e, 3); // perseguidor colado 10 u ATRÁS
    const iP = ((iCurva - 4) % m + m) % m;
    const aP = praia.amostras[iP];
    P.x = A.x - Math.sin(A.ang) * 10; P.z = A.z - Math.cos(A.ang) * 10;
    P.ang = A.ang; P.dirAng = A.ang; P.vel = 28; P.iAmostra = Math.round(aP.s / core.PASSO_AMOSTRA) % m;
    P.lateralPerto = 1; P.dsAnt = aP.s; P.sTotal = A.sTotal - 10; P.stun = 0; P.derrapando = false; P.iaOffset = 0;
    const n0 = e.eventos.length;
    passo(e, 90);
    ok("COGUMELO com perseguidor colado gasta MESMO na curva (fuga a valer)",
      e.eventos.slice(n0).some((x) => x.t === "uso" && x.id === 2 && (x.item === "cogumelo" || x.item === "cogumelo3")));

    const e2 = estadoNovo(4252);
    arrancar(e2);
    isolar(e2, [2]);
    colocar(e2, 2, iCurva, 1, 30, { item: "cogumelo", iaItemTimer: 0.05, sTotalNaAmostra: true });
    const n20 = e2.eventos.length;
    passo(e2, 180);
    ok("COGUMELO no cotovelo SEM perseguidor fica GUARDA (6 s — turbo é para a reta)",
      !e2.eventos.slice(n20).some((x) => x.t === "uso" && x.id === 2 && (x.item === "cogumelo" || x.item === "cogumelo3")));
  }

  // 8) rubber-banding NO ONLINE refere o HUMANO (furo do slot/id)
  {
    const e = estadoNovo(4253);
    arrancar(e);
    const bot = ID(e, 0); // slot 3 — o corredores[6] (slot 6) é o bot de id 1!
    isolar(e, [0]);
    ID(e, 6).sTotal = bot.sTotal + 200; // o HUMANO (id 6) fica 200 à frente
    passo(e, 1);
    ok("rubber ONLINE refere o HUMANO por eJogador (bot 200 u atrás do humano → 1,07)",
      bot.iaRubber === 1.07);
    ID(e, 6).sTotal = bot.sTotal - 200;
    passo(e, 1);
    ok("rubber ONLINE: bot 200 u à frente do humano → 0,93", bot.iaRubber === 0.93);
  }

  // 9) BLOQUEIO do líder (skill > 0,88) — comparado com um CONTROLO sem perseguidor
  {
    let iReta = -1;
    for (let i = 0; i < m && iReta < 0; i++) {
      let limpa = true;
      for (let k = 0; k < 60; k++) if (praia.amostras[(i + k) % m].curva > 0.003) { limpa = false; break; }
      if (limpa) iReta = i;
    }
    const eA = estadoNovo(4253); // COM perseguidor
    const eB = estadoNovo(4253); // CONTROLO (mesma seed, sem perseguidor)
    arrancar(eA); arrancar(eB);
    isolar(eA, [4, 5]); isolar(eB, [4]);
    const cfg = { iaSkill: 0.96, iaOffset: 0, sTotalNaAmostra: true };
    const A = colocar(eA, 4, iReta, 0, 30, { ...cfg }); A.sTotal = praia.amostras[iReta].s + praia.comprimento;
    const B = colocar(eB, 4, iReta, 0, 30, { ...cfg }); B.sTotal = praia.amostras[iReta].s + praia.comprimento;
    const P = colocar(eA, 5, ((iReta - 6) % m + m) % m, 2, 30, { sTotalNaAmostra: true }); // ~15 u atrás, lateral +2
    P.sTotal = A.sTotal - 15;
    passo(eA, 1); passo(eB, 1);
    const lat0A = latDe(eA, A), lat0B = latDe(eB, B);
    passo(eA, 45); passo(eB, 45);
    const dA = latDe(eA, A) - lat0A, dB = latDe(eB, B) - lat0B;
    ok("LÍDER bloqueia o 2.º: abre lateral NA DIREÇÃO do perseguidor (δA − δB ≥ +0,3 u)",
      dA - dB >= 0.3);
  }

  // 10) FURO DO HOMING POR ID (online): o míssil persegue o alvo CERTO
  {
    const e = estadoNovo(4242);
    arrancar(e);
    isolar(e, [0]);
    // bot id 0 fica no slot 3 — o corredores[0] é o HUMANO (slot 0)!
    const v = colocar(e, 0, 400, 1, 24, { item: null, iaItemTimer: 9, sTotalNaAmostra: true });
    const aF = praia.amostras[380];
    const angF = Math.atan2(aF.tx, aF.tz);
    e.projeteis.push({ id: e.seqId++, tipo: "missil", x: aF.x + aF.nx - Math.sin(angF) * 3, z: aF.z + aF.nz - Math.cos(angF) * 3, ang: angF, vel: 55, dono: 9, alvo: 0, vida: 7, iAmostra: 380 });
    const n0 = e.eventos.length;
    passo(e, 150); // 5 s
    const evs = e.eventos.slice(n0);
    const dFim = Math.hypot(e.projeteis[0] ? e.projeteis[0].x - v.x : 0, e.projeteis[0] ? e.projeteis[0].z - v.z : 9999);
    ok("HOMING por ID no ONLINE: míssil com alvo=0 ACERTA o bot de id 0 (não o kart do slot 0)",
      evs.some((x) => x.t === "golpe" && x.alvo === 0) && !evs.some((x) => x.t === "golpe" && x.alvo === 6) && dFim > 9000);
  }

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: corrida real com a união) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
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
  pg.on("console", (m) => { if (m.type() === "error") erros.push(`${m.text()} @ ${m.location()?.url ?? "?"}`); });

  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("menu do kart renderiza no hub (?game=kart)", true);

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

  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  await dormir(4000);
  const bots0 = await pg.evaluate(() => [0, 1, 2].map((id) => window.__kart.posCorredor(id)));
  await dormir(4000);
  const bots1 = await pg.evaluate(() => [0, 1, 2].map((id) => window.__kart.posCorredor(id)));
  const dists = bots1.map((b, i) => Math.hypot(b.x - bots0[i].x, b.z - bots0[i].z));
  ok("bots CORREM de verdade (≥2 dos 3 andaram > 25 u em 4 s)", dists.filter((d) => d > 25).length >= 2);

  let itemVisto = false;
  for (let i = 0; i < 16 && !itemVisto; i++) {
    await dormir(1000);
    itemVisto = await pg.evaluate(() => [0, 1, 2, 3, 4, 5].some((id) => window.__kart.posCorredor(id)?.item));
  }
  ok("bots APANHAM itens das caixas em corrida", itemVisto);

  const cls = await pg.evaluate(() => window.__kart.classificacao());
  ok("classificação viva: 12 corredores com nomes de bots",
    cls.length === 12 && cls.filter((c) => !c.eJogador).length === 11
    && cls.some((c) => ["Kudisso", "Zapata", "Makuti"].includes(c.nome)));

  await pg.screenshot({ path: "shots-v77/ia-uniao.png" }).catch(() => {});
  const errosReais = erros.filter((e) => !/favicon|Slow network|SwiftShader|GPU|Autoplay|playwright|supabase\.co|Failed to load resource/i.test(e));
  if (errosReais.length) console.log("    erros:", errosReais.slice(0, 4).join(" || ").slice(0, 600));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);

  await browser.close();
  matarTodos();

  console.log(`\n══ UNIÃO DA IA v77: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("Falhados:"); for (const f of fails) console.log(`  - ${f}`); }
  process.exit(failed ? 1 : 0);
}

try { await main(); } catch (e) {
  console.error(e);
  matarTodos();
  process.exit(1);
}
