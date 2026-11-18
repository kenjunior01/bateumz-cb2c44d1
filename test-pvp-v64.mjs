// ============================================================
// v64 — PvP DA ARENA: todos contra todos com dano AUTORITATIVO
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node): validaGolpePvp/validaCast, danoAtaqueBasico,
//    recursosAbate, zonaSegura, cadenciaPermitida, xpTotalAteNivel.
// B) SERVIDOR REAL: o cliente NUNCA manda dano — o servidor computa
//    o valor (básico e habilidade), zona segura da fonte, cadência,
//    um cast = um alvo, morte/renascimento autoritativos, recompensas
//    de abate, progresso que o cliente NÃO pode forjar (essência).
// C) E2E (vite + servidor): 2 browsers no mesmo mundo — alvo-herói,
//    combate PvP real até à morte, kill feed, overlay com assassino,
//    renascimento na fonte.
// Uso: PW_CHROME=… node test-pvp-v64.mjs
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

// ── Subprocessos (grupo DETACHED inteiro — lições v49/v53/v56) ──
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
let BASE_POS = { x: -78, z: 78 };

/** Caminha em passos LEGAIS (≤1 u — dentro do orçamento do servidor). */
async function andar(st, tx, tz) {
  const ox = st.x ?? BASE_POS.x, oz = st.z ?? BASE_POS.z;
  const dx = tx - ox, dz = tz - oz;
  const d = Math.hypot(dx, dz);
  const passos = Math.ceil(d);
  for (let i = 1; i <= passos; i++) {
    const f = i / passos;
    const x = ox + dx * f, z = oz + dz * f;
    st.x = x; st.z = z;
    st.enviar({ t: "pos", x, z, ry: 0, anim: "andar" });
    await dormir(14);
  }
}

// ── Cliente ws de teste (v64: eventos de heróis + eu autoritativo) ──
function clienteArena({ nome, campeao = "kaimu", xpTotal = 0, essencia = 0, itens = {}, abates = 0 }) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORTA_ARENA}`);
  const st = {
    ws, nome, id: -1, bemVindo: null, snaps: [], falas: [], fere: [], mortesMob: [],
    morteHeroi: [], renasceu: [], abatesPvp: [], golpesHeroi: [], corrigidos: [], pongs: [], abertos: false,
  };
  ws.on("open", () => {
    st.abertos = true;
    ws.send(JSON.stringify({ t: "ola", nome, campeao, nivel: 1, xpTotal, essencia, itens, abates }));
  });
  ws.on("message", (b) => {
    let m; try { m = JSON.parse(String(b)); } catch { return; }
    if (m.t === "bemvindo") { st.bemVindo = m; st.id = m.id; }
    if (m.t === "snap") st.snaps.push(m);
    if (m.t === "fala") st.falas.push(m);
    if (m.t === "fere") st.fere.push(m);
    if (m.t === "mobmorreu") st.mortesMob.push(m);
    if (m.t === "morteheroi") st.morteHeroi.push(m);
    if (m.t === "renasceu") st.renasceu.push(m);
    if (m.t === "abate-pvp") st.abatesPvp.push(m);
    if (m.t === "golpeheroi") st.golpesHeroi.push(m);
    if (m.t === "corrigido") st.corrigidos.push(m);
    if (m.t === "pong") st.pongs.push(m);
  });
  st.enviar = (obj) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); };
  st.fechar = () => { try { ws.close(); } catch {} };
  return st;
}
const ultimaSnap = (st) => st.snaps[st.snaps.length - 1] ?? null;
const ultimoEu = (st) => ultimaSnap(st)?.eu ?? null;
const heroiNaSnap = (st, nome) => ultimaSnap(st)?.j?.find((h) => h.nome === nome) ?? null;
const limparCorrigidos = (st) => { st.corrigidos.length = 0; };

// ═══════════════════════════════════════════════════════════════
async function main() {
  limparZumbis();
  console.log(`\n⚔ ARENA v64 — PvP AUTORITATIVO — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (core.ts) —");
  const core = await import(`${RAIZ}/src/game/arena/core.ts`);
  BASE_POS = core.POS_BASE;

  ok("RAIO_ZONA_SEGURA = fonte + 2", core.RAIO_ZONA_SEGURA === core.RAIO_FONTE + 2);
  ok("validaGolpePvp aceita básico e QWER", core.validaGolpePvp({ alvoId: 3, hab: "" })?.hab === ""
    && ["Q", "W", "E", "R"].every((s) => core.validaGolpePvp({ alvoId: 3, hab: s })?.hab === s));
  ok("validaGolpePvp: hab ausente = básico", core.validaGolpePvp({ alvoId: 5 })?.hab === "");
  ok("validaGolpePvp recusa podres", core.validaGolpePvp({ alvoId: -1, hab: "" }) === null
    && core.validaGolpePvp({ alvoId: 1.5, hab: "" }) === null
    && core.validaGolpePvp({ alvoId: 1, hab: "X" }) === null
    && core.validaGolpePvp("podre") === null);
  const claimFalso = core.validaGolpePvp({ alvoId: 2, hab: "", dano: 99999 });
  ok("validaGolpePvp IGNORA o campo dano (valor é do servidor)", claimFalso !== null && !("dano" in claimFalso));
  ok("validaCast aceita QWER e recusa lixo", core.validaCast({ slot: "Q" })?.slot === "Q" && core.validaCast({ slot: "W" }) !== null
    && core.validaCast({ slot: "x" }) === null && core.validaCast(null) === null);

  const atk1 = core.danoAtaqueBasico("kaimu", 1, {});
  const atk18 = core.danoAtaqueBasico("kaimu", 18, {});
  ok("danoAtaqueBasico = statsDe.ataque e escala", atk1 === Math.round(core.statsDe("kaimu", 1, {}).ataque) && atk18 > atk1);
  ok("danoAtaqueBasico cresce com itens", core.danoAtaqueBasico("kaimu", 1, { lamina: 3 }) > atk1);

  const rec1 = core.recursosAbate(1);
  const rec10 = core.recursosAbate(10);
  ok("recursosAbate nv1 = base", rec1.essencia === core.ESSENCIA_ABATE_BASE && rec1.xp === core.XP_ABATE_BASE);
  ok("recursosAbate escala com o nível da VÍTIMA", rec10.essencia === core.ESSENCIA_ABATE_BASE + core.ESSENCIA_ABATE_POR_NIVEL * 9
    && rec10.xp === core.XP_ABATE_BASE + core.XP_ABATE_POR_NIVEL * 9);

  ok("zonaSegura: dentro da fonte", core.zonaSegura(core.POS_BASE.x, core.POS_BASE.z) === true);
  ok("zonaSegura: no limite do raio", core.zonaSegura(core.POS_BASE.x + core.RAIO_ZONA_SEGURA - 0.1, core.POS_BASE.z) === true
    && core.zonaSegura(core.POS_BASE.x + core.RAIO_ZONA_SEGURA + 1, core.POS_BASE.z) === false);

  ok("cadenciaPermitida impede spam e tolera rede", !core.cadenciaPermitida(1000, 1300, 1)
    && core.cadenciaPermitida(1000, 1300 + core.TOL_REDE_S * 1000, 1)
    && core.cadenciaPermitida(1000, 1000 + 1200, 1 / 0.85));

  ok("xpTotalAteNivel é o inverso exato de nivelDeXp", [1, 2, 5, 10, 17, 18].every((n) => core.nivelDeXp(core.xpTotalAteNivel(n)).nivel === n)
    && core.xpTotalAteNivel(1) === 0);

  // ── B) SERVIDOR REAL ─────────────────────────────────────────
  console.log("\n— B) Servidor real: o dano PvP é COMPUTADO pelo servidor —");
  const srv = correr("node", ["server/arena-servidor.mjs"], { PORT: String(PORTA_ARENA) });
  await dormir(900);

  const A = clienteArena({ nome: "Kaimu-TA", campeao: "kaimu", xpTotal: 8100, essencia: 500 });
  await dormir(400);
  const euA0 = A.bemVindo?.eu;
  const hpMaxA18 = core.statsDe("kaimu", 18, {}).hpMax;
  ok("bemvindo traz `eu` AUTORITATIVO (hpMax do nível 18)", !!euA0 && euA0.hpMax === hpMaxA18 && euA0.hp === euA0.hpMax && euA0.nivel === 18);

  const B = clienteArena({ nome: "Vex-TB", campeao: "vex" });
  await dormir(500);
  ok("B id distinto do A", B.bemVindo !== null && B.bemVindo.id !== A.bemVindo.id);

  // B sai da zona segura (a fonte) — andando legalmente
  await andar(B, -70, 62);
  await dormir(600);

  // 1) atacar DE dentro da fonte → zona-segura
  limparCorrigidos(A);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "" });
  await dormir(300);
  ok("atacar DE dentro da fonte → corrigido zona-segura", A.corrigidos.some((c) => c.motivo === "zona-segura"));

  // 2) A sai da fonte e aproxima-se de B → ataque básico com dano DO SERVIDOR
  await andar(A, -71, 64);
  await dormir(600);
  const dAB = Math.hypot(A.x - B.x, A.z - B.z);
  limparCorrigidos(A); B.fere.length = 0; A.golpesHeroi.length = 0;
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "" });
  await dormir(400);
  const danoBasicoEsperado = Math.max(1, Math.round(core.reduzArmadura(core.danoAtaqueBasico("kaimu", 18, {}), core.CAMPEOES.vex.armadura)));
  ok(`ataque básico → fere em B com dano DO SERVIDOR (${danoBasicoEsperado}, A não mandou dano; d=${dAB.toFixed(1)})`,
    B.fere.length > 0 && B.fere[B.fere.length - 1].dano === danoBasicoEsperado);
  ok("o ATACANTE também recebe o número autoritativo (golpeheroi)", A.golpesHeroi.some((g) => g.alvoId === B.id && g.dano === danoBasicoEsperado && g.de === A.id));

  // 3) cadência: o 2.º básico imediato é recusado
  limparCorrigidos(A);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "" });
  await dormir(300);
  ok("2.º básico imediato → corrigido golpepvp-rapido", A.corrigidos.some((c) => c.motivo === "golpepvp-rapido"));

  // 4) claim de habilidade SEM cast → recusado
  limparCorrigidos(A);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "Q" });
  await dormir(300);
  ok("golpepvp hab=Q sem cast → corrigido golpepvp-sem-cast", A.corrigidos.some((c) => c.motivo === "golpepvp-sem-cast"));

  // 5) cast Q + claim → dano da habilidade computado pelo servidor
  limparCorrigidos(A); B.fere.length = 0;
  A.enviar({ t: "cast", slot: "Q" });
  await dormir(250);
  ok("cast Q aceite (sem corrigido)", !A.corrigidos.some((c) => c.motivo === "cast-cd" || c.motivo === "cast-mana"));
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "Q" });
  await dormir(400);
  const danoQEsperado = Math.max(1, Math.round(core.reduzArmadura(
    core.danoHabilidade(core.CAMPEOES.kaimu.habilidades.Q, 18, core.statsDe("kaimu", 18, {}).poder),
    core.CAMPEOES.vex.armadura)));
  ok(`habilidade Q → fere com dano DO SERVIDOR (${danoQEsperado})`, B.fere.some((f) => f.dano === danoQEsperado));

  // 6) o MESMO cast não fere o MESMO alvo duas vezes
  limparCorrigidos(A);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "Q" });
  await dormir(300);
  ok("mesmo alvo no mesmo cast → corrigido cast-usado", A.corrigidos.some((c) => c.motivo === "cast-usado"));

  // 7) campo `dano` FALSO é ignorado — o valor continua a ser o do servidor.
  //    NOTA: B já levou 140 (básico) + 356 (Q) = 496 de 510 hp — ESTE golpe MATA.
  A.morteHeroi.length = 0; B.morteHeroi.length = 0; A.abatesPvp.length = 0;
  await dormir(1100);   // cadência do básico volta a abrir
  B.fere.length = 0;
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "", dano: 99999 });
  await dormir(500);
  ok("dano:99999 no pacote é IGNORADO (fere continua do servidor)", B.fere.some((f) => f.dano === danoBasicoEsperado));

  // 8) MORTE AUTORITATIVA — o golpe acima consumiu os últimos hp de B
  ok("ABATE autoritativo: morteheroi chega a A e a B",
    A.morteHeroi.some((m) => m.vitima === "Vex-TB" && m.assassino === A.id && m.nomeAssassino === "Kaimu-TA")
    && B.morteHeroi.some((m) => m.vitima === "Vex-TB" && m.assassino === A.id));
  ok("abate-pvp chega ao assassino com recompensa do nível da VÍTIMA",
    A.abatesPvp.some((m) => m.vitima === "Vex-TB" && m.essencia === core.recursosAbate(1).essencia && m.xp === core.recursosAbate(1).xp));

  const euBMorto = ultimoEu(B);
  ok("B fica MORTO no estado autoritativo (hp 0, morto true)", !!euBMorto && euBMorto.morto === true && euBMorto.hp === 0);
  ok("a snapshot mostra a vítima morta para o MUNDO", heroiNaSnap(A, "Vex-TB")?.morto === true);

  // 9) auto-renascimento AUTORITATIVO na fonte (para A e para B)
  A.renasceu.length = 0; B.renasceu.length = 0;
  let reviveu = false;
  for (let i = 0; i < 22 && !reviveu; i++) { await dormir(1000); reviveu = B.renasceu.length > 0; }
  const renB = B.renasceu[B.renasceu.length - 1];
  ok("auto-renascimento após TEMPO_RESPAWN → renasceu para B", reviveu && renB.id === B.id);
  ok("posição do renascimento é junto à fonte", !!renB && Math.hypot(renB.x - core.POS_BASE.x, renB.z - core.POS_BASE.z) <= core.RAIO_REVIVER + 2.1);
  ok("o MUNDO vê o renascimento (renasceu chega a A)", A.renasceu.some((m) => m.id === B.id));
  await dormir(500);
  const euBRev = ultimoEu(B);
  ok("B renasce VIVO e com vida cheia (eu autoritativo)", !!euBRev && euBRev.morto === false && euBRev.hp === euBRev.hpMax);

  // 10) a fonte é zona segura para a VÍTIMA também
  B.x = renB.x; B.z = renB.z;
  limparCorrigidos(A);
  await dormir(1100);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "" });
  await dormir(300);
  ok("atacar quem está NA fonte → corrigido zona-segura", A.corrigidos.some((c) => c.motivo === "zona-segura"));

  // 11) escudo do Kaimu é estado AUTORITATIVO no `eu` (e expira)
  A.enviar({ t: "cast", slot: "W" });
  await dormir(400);
  const euEscudo = ultimoEu(A);
  ok("cast W → escudo AUTORITATIVO no eu", !!euEscudo && euEscudo.escudo >= Math.round(core.curaHabilidade(core.CAMPEOES.kaimu.habilidades.W, 18, core.statsDe("kaimu", 18, {}).poder)) - 2);
  await dormir(3400);
  ok("escudo EXPIRA no servidor", (ultimoEu(A)?.escudo ?? -1) === 0);

  // 12) progresso é DO SERVIDOR: essência reportada pelo cliente é ignorada
  B.enviar({ t: "pos", x: B.x, z: B.z, ry: 0, anim: "parado" });
  limparCorrigidos(B);
  B.enviar({ t: "compra", item: "lamina" });
  await dormir(300);
  ok("B sem essência → compra recusada (pos com essência não existe mais)", B.corrigidos.some((c) => c.motivo === "compra-essencia"));
  limparCorrigidos(A);
  A.enviar({ t: "compra", item: "anel" });   // A tem 500+55=555 < 800 — MESMO afirmando essência alta
  await dormir(300);
  ok("A (555 de essência REAIS) não compra anel de 800", A.corrigidos.some((c) => c.motivo === "compra-essencia"));

  // 13) lixo de protocolo não derriba o servidor
  A.enviar({ t: "golpepvp", alvoId: "podre", hab: 42 });
  A.enviar({ t: "cast", slot: "Z" });
  try { A.ws.send("não é json {{{"); } catch {}
  await dormir(300);
  A.enviar({ t: "ping", ts: Date.now() });
  await dormir(300);
  ok("servidor sobrevive a lixo de protocolo", A.pongs.length > 0);

  // ── C) E2E: dois browsers no mesmo mundo, PvP REAL ──────────
  console.log("\n— C) E2E (vite + 2 browsers: alvo-herói → abate → respawn) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=mmorpg`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  // aquecimento (lição v62: a 1.ª carga otimiza deps e RECAREGA a página)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="arena-menu"]', { timeout: 60_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  const erros = [];
  const ctxA = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const pgA = await ctxA.newPage();
  pgA.on("pageerror", (e) => erros.push("A:" + String(e)));
  pgA.on("console", (m) => { if (m.type() === "error") erros.push("A:" + m.text()); });
  await pgA.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgA.waitForSelector('[data-testid="arena-menu"]', { timeout: 45_000 });
  ok("menu com a nota PvP (zona segura + dano do servidor)",
    await pgA.locator('[data-testid="arena-pvp-nota"]').count() === 1
    && (await pgA.locator('[data-testid="arena-pvp-nota"]').innerText()).length > 20);

  await pgA.locator('[data-testid="arena-campeao-kaimu"]').click();
  await pgA.locator('[data-testid="arena-nome"]').fill("Kaimu-PvP");
  await pgA.locator('[data-testid="arena-entrar"]').click();
  await pgA.waitForSelector('[data-testid="arena-jogo"]', { timeout: 30_000 });
  let onlineA = false;
  for (let i = 0; i < 8 && !onlineA; i++) {
    onlineA = await pgA.evaluate(() => window.__arena?.mpEstado() === "online").catch(() => false);
    if (!onlineA) await dormir(5000);
  }
  ok("browser A online no mundo partilhado", onlineA);

  // browser B: o ALVO
  const ctxB = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const pgB = await ctxB.newPage();
  pgB.on("pageerror", (e) => erros.push("B:" + String(e)));
  pgB.on("console", (m) => { if (m.type() === "error") erros.push("B:" + m.text()); });
  await pgB.goto(`${BASE}/lives?game=mmorpg&arena-leve=1`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await pgB.waitForSelector('[data-testid="arena-menu"]', { timeout: 45_000 });
  await pgB.locator('[data-testid="arena-campeao-vex"]').click();
  await pgB.locator('[data-testid="arena-nome"]').fill("Vex-PvP");
  await pgB.locator('[data-testid="arena-entrar"]').click();
  await pgB.waitForSelector('[data-testid="arena-jogo"]', { timeout: 30_000 });
  let onlineB = false;
  for (let i = 0; i < 8 && !onlineB; i++) {
    onlineB = await pgB.evaluate(() => window.__arena?.mpEstado() === "online").catch(() => false);
    if (!onlineB) await dormir(5000);
  }
  ok("browser B online no mesmo mundo", onlineB);
  await dormir(1500);
  ok("A vê o herói de B (multi real)", await pgA.evaluate(() => window.__arena.jogadoresRemotos()) >= 1);

  // B sai da zona segura da fonte
  await pgB.evaluate(() => { const p = { x: -53, z: 53 }; window.__arena.andarPara(p.x, p.z); });
  let bFora = false;
  for (let i = 0; i < 20 && !bFora; i++) {
    await dormir(3000);
    const e = await pgB.evaluate(() => window.__arena.estado()).catch(() => null);
    if (e && Math.hypot(e.x - (-53), e.z - 53) < 4) bFora = true;
  }
  ok("B saiu da zona segura (andarPara honesto)", bFora);

  // A mira o herói de B e ATACA (pursuit + auto-attack estilo LoL)
  const alvoId = await pgA.evaluate(() => window.__arena.heroiMaisPerto()?.id ?? -1);
  ok("A tem herói-alvo real (B na snapshot)", alvoId >= 0);
  await pgA.evaluate((id) => window.__arena.targetHeroi(id), alvoId);
  ok("targetHeroi fixa o alvo", await pgA.evaluate((id) => window.__arena.alvoHeroi() === id, alvoId));

  // o hp de B CAI (dano do servidor chega por fere + eu)
  let hpCaiu = false;
  for (let i = 0; i < 22 && !hpCaiu; i++) {
    await dormir(4000);
    const e = await pgB.evaluate(() => ({ hp: window.__arena.estado().hp, hpMax: window.__arena.estado().hpMax, morto: window.__arena.estado().morto })).catch(() => null);
    if (e && (e.hp < e.hpMax - 20 || e.morto)) hpCaiu = true;
  }
  ok("PvP REAL: o hp de B cai com os golpes de A (dano do servidor)", hpCaiu);

  // combate até ao abate (overlay de morte com o nome do assassino)
  let abateu = false;
  for (let i = 0; i < 30 && !abateu; i++) {
    await dormir(4000);
    const e = await pgB.evaluate(() => ({ morto: window.__arena.estado().morto, por: window.__arena.mortePor() })).catch(() => null);
    if (e?.morto) abateu = true;
  }
  ok("ABATE no browser: B morre pelo PvP do servidor", abateu);
  const mortePor = await pgB.locator('[data-testid="arena-morte-por"]').innerText().catch(() => "");
  ok("overlay de morte mostra o ASSASSINO", abateu && mortePor.includes("Kaimu-PvP"));
  await pgA.screenshot({ path: "shots-v64/arena-pvp-combate.png" }).catch(() => {});

  // kill feed no chat de A
  let feedOk = false;
  for (let i = 0; i < 6 && !feedOk; i++) {
    await dormir(2000);
    const txt = await pgA.locator('[data-testid="arena-chat"]').innerText().catch(() => "");
    if (txt.includes("Vex-PvP") && (txt.includes("abateu") || txt.includes("slew"))) feedOk = true;
  }
  ok("kill feed no chat de A («Kaimu-PvP abateu Vex-PvP»)", feedOk);

  // B renasce na fonte (autoritativo) e fica vivo outra vez
  let renasceuE2e = false;
  for (let i = 0; i < 20 && !renasceuE2e; i++) {
    await dormir(3000);
    const e = await pgB.evaluate(() => {
      const s = window.__arena.estado();
      return { morto: s.morto, x: s.x, z: s.z, hp: s.hp, hpMax: s.hpMax };
    }).catch(() => null);
    if (e && !e.morto && e.hp === e.hpMax && Math.hypot(e.x - (-78), e.z - 78) < 12) renasceuE2e = true;
  }
  ok("B renasce VIVO na fonte (renasceu autoritativo)", renasceuE2e);
  await pgB.screenshot({ path: "shots-v64/arena-pvp-respawn.png" }).catch(() => {});

  const errosReais = erros.filter((e) => !/favicon|supabase|404|406|PGRST|JWT|Failed to load resource|websocket|ResizeObserver|net::/i.test(e));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   erros:", errosReais.slice(0, 4));

  await browser.close();
  A.fechar(); B.fechar();
  matarTodos();

  console.log(`\n══ ARENA v64: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("FALHAS:", fails.join(" · ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO SUITE:", e); matarTodos(); process.exit(1); });
