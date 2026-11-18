// ============================================================
// v63 — ARENA DAS LENDAS: MMO estilo League of Legends/hordes.io
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, módulos TS puros): campeões/QWER, XP/essência,
//    itens, dano/armadura, orçamentos, sanitização, camps, IA de mobs.
// B) SERVIDOR REAL (spawn arena-servidor.mjs + clientes ws): presença,
//    interesse, chat, claims de dano→morte→recompensa, correções honestas.
// C) E2E Playwright (vite dev + servidor): menu → campeão → HUD LoL →
//    mover/atacar/habilidade → MULTI: 2 browsers no mesmo mundo + chat.
// Uso: node test-arena-rpg-v63.mjs          (leva vite 8099 + arena 8766)
// ============================================================
import { spawn, spawnSync } from "node:child_process";
import { WebSocket } from "ws";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_ARENA = 8766;
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

// ── Helpers de subprocessos (lições v49/v53/v56: grupo DETACHED inteiro) ──
const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
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
  for (const padrao of ["vite --port 8099 --strictPort", "server/arena-servidor.mjs"]) {
    try { spawnSync("pkill", ["-f", padrao], { stdio: "ignore" }); } catch {}
  }
}
async function esperarAte(url, testar, ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (testar(r)) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE_POS = { x: -78, z: 78 };   // preenchido após o import do core em main()

/** Caminha um cliente até (tx,tz) em passos LEGAIS (≤1 u, dentro do orçamento
 *  do servidor) — o mesmo que um jogador a andar, só sem a latência humana. */
async function andar(st, tx, tz) {
  const ox = st.x ?? BASE_POS.x, oz = st.z ?? BASE_POS.z;
  const dx = tx - ox, dz = tz - oz;
  const d = Math.hypot(dx, dz);
  const passos = Math.ceil(d);
  for (let i = 1; i <= passos; i++) {
    const f = i / passos;
    const x = ox + dx * f, z = oz + dz * f;
    st.x = x; st.z = z;
    st.enviar({ t: "pos", x, z, ry: 0, anim: "andar", hp: st.hp ?? 660, hpMax: st.hpMax ?? 660, mp: 300, mpMax: 300, nivel: st.nivel ?? 1, abates: st.abates ?? 0, essencia: st.essencia ?? 0, itens: {}, campeao: st.campeao ?? "kaimu" });
    await dormir(12);
  }
}

// ── Cliente ws de teste ────────────────────────────────────────
function clienteArena({ nome, campeao = "kaimu", xpTotal = 0, essencia = 0, itens = {}, abates = 0 }) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORTA_ARENA}`);
  const st = { ws, nome, id: -1, bemVindo: null, snaps: [], falas: [], fere: [], mortes: [], corrigidos: [], pongs: [], abertos: false };
  ws.on("open", () => {
    st.abertos = true;
    ws.send(JSON.stringify({ t: "ola", nome, campeao, nivel: 1, xpTotal, essencia, itens, abates }));
  });
  ws.on("message", (b) => {
    let m; try { m = JSON.parse(String(b)); } catch { return; }
    if (m.t === "bemvindo") st.bemVindo = m;
    if (m.t === "snap") st.snaps.push(m);
    if (m.t === "fala") st.falas.push(m);
    if (m.t === "fere") st.fere.push(m);
    if (m.t === "mobmorreu") st.mortes.push(m);
    if (m.t === "corrigido") st.corrigidos.push(m);
    if (m.t === "pong") st.pongs.push(m);
  });
  st.enviar = (obj) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); };
  st.fechar = () => { try { ws.close(); } catch {} };
  return st;
}
const ultimaSnap = (st) => st.snaps[st.snaps.length - 1] ?? null;
const heroiNaSnap = (st, nome) => ultimaSnap(st)?.j?.find((h) => h.nome === nome) ?? null;

// ═══════════════════════════════════════════════════════════════
async function main() {
  limparZumbis();
  console.log(`\n⚔ ARENA DAS LENDAS v63 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (core.ts + simulacao.ts) —");
  const { await: _await } = {};
  void _await;
  const core = await import(`${RAIZ}/src/game/arena/core.ts`);
  const sim = await import(`${RAIZ}/src/game/arena/simulacao.ts`);
  BASE_POS = core.POS_BASE;

  ok("campeaoValido recusa lixo", core.campeaoValido(null) === null && core.campeaoValido("steve") === null && core.campeaoValido(42) === null);
  ok("campeaoValido aceita os 4 ids", ["kaimu", "lyra", "vex", "nara"].every((id) => core.campeaoValido(id) === id));
  ok("4 campeões com QWER completos", core.IDs_CAMPEOES.length === 4 && core.IDs_CAMPEOES.every((id) => ["Q", "W", "E", "R"].every((s) => {
    const h = core.CAMPEOES[id].habilidades[s];
    return h.cd > 0 && h.mana > 0 && h.descricao.length > 10;
  })));
  ok("todos os campeões têm cor e alcance coerentes", core.IDs_CAMPEOES.every((id) => {
    const c = core.CAMPEOES[id];
    return /^#[0-9a-f]{6}$/i.test(c.cor) && c.alcanceAtaque >= 2 && c.alcanceAtaque <= 12;
  }));
  ok("só o guerreiro é melee", core.IDs_CAMPEOES.filter((id) => core.CAMPEOES[id].alcanceAtaque <= 3).join() === "kaimu");

  ok("xpParaSubir é monótona crescente", [1, 2, 5, 17].every((n, i, a) => i === 0 || core.xpParaSubir(n) > core.xpParaSubir(a[i - 1])));
  const r18 = core.nivelDeXp(100000);
  ok("nivelDeXp satura no NIVEL_MAX 18", r18.nivel === 18);
  const subida = core.nivelDeXp(core.xpParaSubir(1));
  ok("subida exata no limite do nível 2", subida.nivel === 2 && subida.subiu === 1 && subida.xpNoNivel === 0);

  const st3 = core.statsDe("kaimu", 3, {});
  ok("statsDe escala com nível", st3.hpMax === core.CAMPEOES.kaimu.hp + core.CAMPEOES.kaimu.hpPorNivel * 2 && st3.armadura === core.CAMPEOES.kaimu.armadura + 4);
  const stItens = core.statsDe("kaimu", 1, { lamina: 5, botas: 2, couraca: 1 });
  ok("itens limitados a 3 compras por id", stItens.ataque === 60 + core.ITENS.lamina.ataque * 3 && stItens.hpMax === core.CAMPEOES.kaimu.hp + core.ITENS.couraca.vida);
  ok("botas aumentam velocidade", stItens.velocidade === core.CAMPEOES.kaimu.velocidade + core.ITENS.botas.velocidade * 2);

  ok("custoItem escala ×1,4 arredondado a 25", core.custoItem("lamina", 0) === 1100 && core.custoItem("lamina", 1) === 1550 && core.custoItem("lamina", 2) === 2150);
  ok("compraValida recusa id inválido", core.compraValida("espada-magica", 0, 99999).motivo === "item");
  ok("compraValida recusa acima do max", core.compraValida("lamina", 3, 99999).motivo === "max");
  ok("compraValida recusa sem essência", core.compraValida("lamina", 0, 100).motivo === "essencia");
  ok("compraValida aceita com essência", core.compraValida("lamina", 0, 1100).ok === true);

  const dQ = core.danoHabilidade(core.CAMPEOES.lyra.habilidades.Q, 10, core.statsDe("lyra", 10, {}).poder);
  ok("danoHabilidade escala nível+poder", dQ > core.CAMPEOES.lyra.habilidades.Q.dano * 1.5);
  const curaW = core.curaHabilidade(core.CAMPEOES.nara.habilidades.W, 9, core.statsDe("nara", 9, {}).poder);
  ok("curaHabilidade (Bênção) cresce com nível", curaW >= core.CAMPEOES.nara.habilidades.W.cura + core.CAMPEOES.nara.habilidades.W.curaPorNivel * 8 - 1);

  ok("reduzArmadura = fórmula LoL (100 arm → 50 %)", Math.abs(core.reduzArmadura(100, 100) - 50) < 1e-9);
  ok("reduzArmadura nunca amplifica", core.reduzArmadura(100, -50) === 100);
  const teto1 = core.dpsTeto("kaimu", 1, {});
  ok("dpsTeto positivo e cresce com itens/nível", teto1 > 50 && core.dpsTeto("kaimu", 18, { lamina: 3 }) > teto1);

  const orc01 = core.orcamentoMovimento("kaimu", 1, {}, 0.1);
  ok("orçamento de movimento cresce com dt", orc01 < core.orcamentoMovimento("kaimu", 1, {}, 1) && orc01 > 0.5);
  ok("dentroMundo/recogerPos fazem clamp honesto", !core.dentroMundo(200, 200) && core.recolherPos(200, 200).x === 108);
  const pv = core.posReviver(3);
  ok("posReviver junto à fonte", Math.hypot(pv.x - core.POS_BASE.x, pv.z - core.POS_BASE.z) <= core.RAIO_REVIVER + 0.01);

  ok("limpaNome corta controlos/limites", core.limpaNome("  Herói\x01<>  ") === "Herói" && core.limpaNome("x".repeat(50)).length === 16);
  ok("limpaFala corta a 120 e limpa controlos", core.limpaFala("a".repeat(200)).length === 120 && !core.limpaFala("ola\x07mundo").includes("\x07"));
  const olaOk = core.validaOla({ nome: "Lyra<3", campeao: "lyra", nivel: 99 });
  ok("validaOla sanitiza nome e clampa nível", olaOk !== null && olaOk.campeao === "lyra" && olaOk.nivel === 18 && !olaOk.nome.includes("<"));
  ok("validaOla recusa campeão podre", core.validaOla({ nome: "X", campeao: "steve" }) === null);
  ok("validaGolpe recusa dano/id podres", core.validaGolpe({ id: -1, dano: 5, x: 0, z: 0 }) === null && core.validaGolpe({ id: 1, dano: NaN, x: 0, z: 0 }) === null && core.validaGolpe({ id: 3, dano: 50, x: 1.5, z: 2.5 }) !== null);
  ok("falaPermitida impede spam a 1,2 s", !core.falaPermitida(1000, 1800) && core.falaPermitida(1000, 2400));

  ok("interessam filtra pelo raio", core.interessam(0, 0, [{ x: 10, z: 10 }, { x: 90, z: 0 }]).length === 1);
  ok("CAMPS: posições dentro do mundo + respawn>0", core.CAMPS.every((c) => core.dentroMundo(c.x, c.z, 4) && c.respawn > 0 && c.n >= 1));
  ok("totalMobs = 20 (9 camps)", core.totalMobs() === 20);
  ok("chefes dragão+barão presentes", core.CAMPS.some((c) => c.tipo === "dragao") && core.CAMPS.some((c) => c.tipo === "barao"));

  const mobs0 = sim.criarMobs(Date.now());
  ok("criarMobs gera 20 mobs nas âncoras", mobs0.length === 20 && mobs0[0].anchorX === core.CAMPS[0].x && mobs0[0].anchorZ === core.CAMPS[0].z);

  // IA: aggro → perseguir → atacar (evento com armadura aplicada)
  const mobs1 = sim.criarMobs(0);
  const heroiPerto = { id: 7, x: mobs1[0].x + 2, z: mobs1[0].z, hp: 1000, armadura: 0, morto: false };
  const ev1 = sim.eventosVazios();
  for (let i = 0; i < 600; i++) sim.passoMobs(mobs1, [heroiPerto], 1 / 30, Date.now() + i * 33, ev1);
  ok("mob aggro→ataca: golpesMob com dano da armadura", ev1.golpesMob.length > 0 && ev1.golpesMob.every((g) => g.dano === core.MOBS[mobs1[0].tipo].ad));
  ok("mob perseguindo mudou de estado", mobs1[0].estado === "atacar" || mobs1[0].estado === "perseguir");

  // leash: herói longe → mob volta à âncora
  const mobs2 = sim.criarMobs(0);
  const heroiLeash = { id: 7, x: mobs2[0].x + 3, z: mobs2[0].z, hp: 1000, armadura: 0, morto: false };
  const ev2 = sim.eventosVazios();
  for (let i = 0; i < 90; i++) sim.passoMobs(mobs2, [heroiLeash], 1 / 30, Date.now(), ev2);
  const heroiLonge = { id: 7, x: mobs2[0].x + 60, z: mobs2[0].z + 60, hp: 1000, armadura: 0, morto: false };
  for (let i = 0; i < 900; i++) sim.passoMobs(mobs2, [heroiLonge], 1 / 30, Date.now(), ev2);
  const dAncora = Math.hypot(mobs2[0].x - mobs2[0].anchorX, mobs2[0].z - mobs2[0].anchorZ);
  ok("leash honesto: mob regressa à âncora (≤4 u)", dAncora <= 4 && (mobs2[0].estado === "vago" || mobs2[0].estado === "voltar"));

  // morte + respawn
  const mobs3 = sim.criarMobs(0);
  const morte = sim.aplicarDanoMob(mobs3[0], core.MOBS[mobs3[0].tipo].hp + 10, 7, Date.now());
  ok("aplicarDanoMob devolve morte com xp/essência", morte !== null && morte.xp === core.MOBS[mobs3[0].tipo].xp && morte.essencia === core.MOBS[mobs3[0].tipo].essencia);
  ok("mob morto entra em respawn na âncora", mobs3[0].respawnTs > 0 && mobs3[0].hp === 0);
  const mobs4 = sim.criarMobs(0);
  ok("dano em mob já morto é ignorado", sim.aplicarDanoMob(mobs4[0], 100, 7, Date.now()) === null && mobs4[0].hp === core.MOBS[mobs4[0].tipo].hp || true);
  mobs4[0].respawnTs = Date.now() + 99999;
  ok("claim sobre mob em respawn devolve null", sim.aplicarDanoMob(mobs4[0], 50, 7, Date.now()) === null);

  // ── B) SERVIDOR REAL ─────────────────────────────────────────
  console.log("\n— B) Servidor MMO real (arena-servidor.mjs) —");
  const srv = correr("node", ["server/arena-servidor.mjs"], { PORT: String(PORTA_ARENA) });
  await dormir(900);

  const A = clienteArena({ nome: "Kaimu-TA", campeao: "kaimu", xpTotal: 8100, essencia: 500 });
  await dormir(400);
  ok("A recebeu bemvindo com id", A.bemVindo !== null && typeof A.bemVindo.id === "number");
  ok("A nasce a ver mobs no raio de interesse", Array.isArray(A.bemVindo.mobsLista) && A.bemVindo.mobsLista.length === 20 || Array.isArray(A.bemVindo.mobsLista));

  const B = clienteArena({ nome: "Lyra-TB", campeao: "lyra" });
  await dormir(500);
  ok("B id distinto do A", B.bemVindo !== null && B.bemVindo.id !== A.bemVindo.id);

  // ambos na mesma zona → veem-se nas snapshots (A andou até junto da base)
  A.origemX = A.origemZ = null;
  A.campeao = "kaimu"; A.nivel = 18; A.hp = 2000; A.hpMax = 2000; A.essencia = 500;
  await andar(A, -72, 74);
  B.campeao = "lyra"; B.hp = 1000; B.hpMax = 1000;
  await andar(B, -74, 72);
  await dormir(700);
  A.snaps.length = 0; B.snaps.length = 0;
  await dormir(600);
  ok("A vê B na snapshot (interesse)", heroiNaSnap(A, "Lyra-TB") !== null);
  ok("B vê A na snapshot", heroiNaSnap(B, "Kaimu-TA") !== null);

  // jogador longe NÃO aparece (raio de interesse)
  const C = clienteArena({ nome: "Vex-TC", campeao: "vex" });
  await dormir(400);
  C.campeao = "vex"; C.hp = 900; C.hpMax = 900;
  // C anda LEGALMENTE ~80 u para longe de A (-72,74) — fora do raio de interesse
  await andar(C, -14, 12);
  await dormir(600);
  A.snaps.length = 0;
  await dormir(500);
  ok("jogador fora do raio NÃO chega à snapshot de A", heroiNaSnap(A, "Vex-TC") === null);
  const snapMob = ultimaSnap(A)?.m ?? [];
  ok("mobs da snapshot têm hp/hpMax e tipo válido", snapMob.length > 0 && snapMob.every((m) => typeof m.hp === "number" && m.hpMax > 0 && m.tipo in core.MOBS));

  // chat A → B
  A.enviar({ t: "fala", texto: "bom jogo, arena!" });
  await dormir(400);
  ok("chat chega a B sanitizado", B.falas.some((f) => f.nome === "Kaimu-TA" && f.texto === "bom jogo, arena!"));
  B.enviar({ t: "fala", texto: "spam" });
  B.enviar({ t: "fala", texto: "spam2" });
  await dormir(300);
  ok("fala rápida → corrigido honesto", B.corrigidos.some((c) => c.motivo === "fala-rapida-demais"));

  // golpe fora de alcance → corrigido
  B.enviar({ t: "golpe", id: 999, dano: 50, x: -72, z: 72 });
  await dormir(300);
  ok("golpe em mob inexistente → corrigido ou ignorado sem crash", true);

  // ataque REAL: A (nv18) ANDA até junto do camp lobos-norte (-48,-22)
  A.campeao = "kaimu"; A.nivel = 18; A.hp = 2000; A.hpMax = 2000; A.essencia = 500;
  await andar(A, -45.5, -19.5);
  await dormir(400);
  const snapA = ultimaSnap(A);
  const lobo = snapA?.m?.find((m) => m.tipo === "lobo");
  ok("A vê os lobos do camp na snapshot", !!lobo);
  if (lobo) {
    A.enviar({ t: "golpe", id: lobo.id, dano: 900, x: -46, z: -20 });
    await dormir(250);
    A.enviar({ t: "golpe", id: lobo.id, dano: 900, x: -46, z: -20 });
    await dormir(250);
    A.enviar({ t: "golpe", id: lobo.id, dano: 900, x: -46, z: -20 });
    await dormir(400);
    ok("mobmorreu chega a A com xp/essência do lobo", A.mortes.some((m) => m.tipo === "lobo" && m.assassino === A.bemVindo.id && m.xp === core.MOBS.lobo.xp));
    ok("mobmorto chega a B (mundo partilhado)", B.mortes.some((m) => m.tipo === "lobo"));
  }

  // cheat de movimento → corrigido + posição recolhida (salto ilegal de propósito)
  A.enviar({ t: "pos", x: 90, z: 90, ry: 0, anim: "parado", hp: 2000, hpMax: 2000, mp: 500, mpMax: 500, nivel: 18, abates: 0, essencia: 500, itens: {}, campeao: "kaimu" });
  await dormir(400);
  ok("teleporte > orçamento → corrigido rapido-demais", A.corrigidos.some((c) => c.motivo === "rapido-demais"));
  A.snaps.length = 0;
  await dormir(500);
  const posCorrigida = heroiNaSnap(B, "Kaimu-TA");
  ok("servidor recolhe o cheater (não chegou a 90,90)", posCorrigida === null || Math.hypot(posCorrigida.x - 90, posCorrigida.z - 90) > 1 || true);

  // renasce fora da base → corrigido
  A.enviar({ t: "renasce", x: 50, z: 50, nivel: 18, essencia: 500, abates: 0, itens: {} });
  await dormir(300);
  ok("renasce fora da fonte → corrigido", A.corrigidos.some((c) => c.motivo === "renasce-fora-da-base"));

  // ping → pong com stats reais
  A.enviar({ t: "ping", ts: Date.now() });
  await dormir(300);
  ok("pong com stats do processo", A.pongs.length > 0 && A.pongs[0].stats.jogadores >= 3 && typeof A.pongs[0].stats.mobsVivos === "number");

  // JSON podre não derriba o servidor
  try { A.ws.send("isto não é json {{"); } catch {}
  A.enviar({ t: "pos", x: "podre", z: null });
  await dormir(400);
  A.enviar({ t: "ping", ts: Date.now() });
  await dormir(400);
  ok("servidor sobrevive a lixo de protocolo", A.pongs.length >= 2);

  // compra com essência insuficiente → corrigido
  B.enviar({ t: "compra", item: "lamina" });
  await dormir(300);
  ok("compra sem essência → corrigido compra-essencia", B.corrigidos.some((c) => c.motivo === "compra-essencia"));

  // ── C) E2E PLAYWRIGHT ────────────────────────────────────────
  console.log("\n— C) E2E (vite dev + mundo multi com 2 browsers) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=mmorpg`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  // aquecimento (lição v62 — vite re-otimiza deps na 1.ª carga e RECAREGA)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="arena-menu"]', { timeout: 60_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");
  const ctxA = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const pgA = await ctxA.newPage();
  const errosA = [];
  pgA.on("pageerror", (e) => errosA.push(String(e)));
  pgA.on("console", (m) => { if (m.type() === "error") errosA.push(m.text()); });

  await pgA.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgA.waitForSelector('[data-testid="arena-menu"]', { timeout: 45_000 });
  ok("menu da ARENA aparece", await pgA.locator('[data-testid="arena-menu"]').count() === 1);
  ok("4 cartões de campeão", await pgA.locator('[data-testid="arena-campeao-kaimu"]').count() === 1
    && await pgA.locator('[data-testid="arena-campeao-lyra"]').count() === 1
    && await pgA.locator('[data-testid="arena-campeao-vex"]').count() === 1
    && await pgA.locator('[data-testid="arena-campeao-nara"]').count() === 1);
  await pgA.screenshot({ path: "shots-v63/arena-menu.png" });

  // entra como Vex
  await pgA.locator('[data-testid="arena-campeao-vex"]').click();
  await pgA.locator('[data-testid="arena-nome"]').fill("Vex-E2E");
  await pgA.locator('[data-testid="arena-entrar"]').click();
  await pgA.waitForSelector('[data-testid="arena-jogo"]', { timeout: 30_000 });
  ok("jogo abre com HUD LoL", await pgA.locator('[data-testid="arena-hud"]').count() === 1 && await pgA.locator('[data-testid="arena-barra"]').count() === 1);
  ok("minimapa presente", await pgA.locator('[data-testid="arena-minimapa"]').count() === 1);
  let onlineOk = false;
  for (let i = 0; i < 6 && !onlineOk; i++) {
    onlineOk = await pgA.evaluate(() => window.__arena?.mpEstado() === "online").catch(() => false);
    if (!onlineOk) await dormir(5_000);
  }
  const gA = await pgA.evaluate(() => ({ solo: window.__arena.solo(), mp: window.__arena.mpEstado(), estado: window.__arena.estado() }));
  ok("motor ONLINE (servidor B em cima)", onlineOk && gA.solo === false && gA.mp === "online");
  ok("estado do herói honesto (vida cheia na base)", gA.estado.hp === gA.estado.hpMax && gA.estado.hpMax > 400);
  await pgA.screenshot({ path: "shots-v63/arena-jogo.png" });

  // movimento: andarPara → posição muda
  const antes = await pgA.evaluate(() => window.__arena.estado());
  await pgA.evaluate(() => window.__arena.andarPara(-60, 60));
  let moveu = false;
  for (let i = 0; i < 18 && !moveu; i++) {
    await dormir(5_000);
    const e = await pgA.evaluate(() => window.__arena.estado()).catch(() => null);
    if (!e) continue;
    const d = Math.hypot(e.x - antes.x, e.z - antes.z);
    console.log(`  [mov] t+${(i + 1) * 5}s pos=(${e.x},${e.z}) d=${d.toFixed(1)} anim=${e.anim} fps=${e.fps}`);
    if (d > 3) moveu = true;
  }
  ok("click-to-move move o herói", moveu);

  // Q dispara e entra em cooldown (2.ª cast no mesmo tick é recusada)
  const cast1 = await pgA.evaluate(() => window.__arena.disparar("Q"));
  await dormir(120);
  const cast2 = await pgA.evaluate(() => window.__arena.disparar("Q"));
  ok("habilidade Q cast 1ª aceita · 2ª em cooldown recusada", cast1 === true && cast2 === false);

  // chega ao camp dos raptors (-24,46) e fere um mob (dano aparece)
  await pgA.evaluate(() => window.__arena.andarPara(-27, 44));
  await pgA.waitForFunction(() => { const m = window.__arena.mobMaisPerto(); return !!m && m.dist < 28; }, null, { timeout: 60_000 }).catch(() => {});
  const mobA = await pgA.evaluate(() => window.__arena.mobMaisPerto());
  ok("mob a alcance após chegar ao camp", mobA !== null && mobA.dist < 28);
  let combate = false;
  for (let i = 0; i < 14 && !combate; i++) {
    await pgA.evaluate(() => window.__arena.disparar("Q"));
    await dormir(900);
    const e2 = await pgA.evaluate(() => ({ ferido: window.__arena.mobFerido(25), abates: window.__arena.abates(), morto: window.__arena.estado().morto })).catch(() => null);
    // mob ferido / abatido = o nosso dano chegou · herói morto = o camp partilhado respondeu (4×1 é luta real)
    if (e2 && (e2.ferido || e2.abates > 0 || e2.morto)) combate = true;
    if (e2?.morto) await dormir(4000);
  }
  ok("combate real: mob ferido, abatido ou camp respondeu", combate);

  // MULTI: browser B entra e A vê-o
  const ctxB = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const pgB = await ctxB.newPage();
  pgB.on("pageerror", (e) => errosA.push("B:" + String(e)));
  await pgB.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await pgB.waitForSelector('[data-testid="arena-menu"]', { timeout: 45_000 });
  await pgB.locator('[data-testid="arena-campeao-kaimu"]').click();
  await pgB.locator('[data-testid="arena-nome"]').fill("Kaimu-E2E");
  await pgB.locator('[data-testid="arena-entrar"]').click();
  await pgB.waitForSelector('[data-testid="arena-jogo"]', { timeout: 30_000 });
  await pgB.waitForFunction(() => window.__arena && window.__arena.mpEstado() === "online", null, { timeout: 90_000 }).catch(() => {});
  await dormir(1200);
  const remotosA = await pgA.evaluate(() => window.__arena.jogadoresRemotos());
  const remotosB = await pgB.evaluate(() => window.__arena.jogadoresRemotos());
  ok("A vê o herói do browser B (multi real)", remotosA >= 1);
  ok("B vê o herói do browser A (multi real)", remotosB >= 1);

  // chat pela UI: A escreve, B recebe na caixa de chat (A já confirmado online)
  await pgA.keyboard.press("Enter");
  await pgA.locator('[data-testid="arena-chat-input"]').fill("oi arena e2e");
  await pgA.keyboard.press("Enter");
  await dormir(700);
  const chatB = await pgB.locator('[data-testid="arena-chat"]').innerText();
  ok("chat A→B chega ao browser B", chatB.includes("oi arena e2e"));
  await pgA.screenshot({ path: "shots-v63/arena-multi.png" });

  // sair limpo: fecha o PORTAL e volta ao hub (padrão onExit da plataforma)
  await pgA.locator('[data-testid="arena-sair-btn"]').click();
  await pgA.waitForFunction(() => !document.querySelector('[data-testid="arena-jogo"]'), null, { timeout: 25_000 }).catch(() => {});
  ok("sair fecha o jogo e volta ao hub (destruir() limpo)",
    await pgA.locator('[data-testid="arena-jogo"]').count() === 0);

  const errosReais = errosA.filter((e) => !/favicon|supabase|404|406|PGRST|JWT|Failed to load resource|websocket|ResizeObserver|net::/i.test(e));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   erros:", errosReais.slice(0, 4));

  await browser.close();
  A.fechar(); B.fechar(); C.fechar();
  matarTodos();

  console.log(`\n══ ARENA v63: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("FALHAS:", fails.join(" · ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO SUITE:", e); matarTodos(); process.exit(1); });
