// ============================================================
// v68 — BATALHA DE BALÕES (modo Batalha do BATEU KART)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, sem browser): arena Coliseu (fora do menu de
//    corridas, determinística), novaBatalha (12×3 balões, voltas
//    ∞ — o FURO do clamp de voltas provado), golpe → balão, janela
//    de invulnerabilidade, raio com escudo a PROTEGER, eliminação
//    (wreck em campo que não volta a ser atingido), recompensa por
//    tabela+bónus, ranking (balões ↓ golpes ↓, eliminados por ordem
//    REVERSA), BATALHA COMPLETA determinística (seed fixa — valores
//    exatos) e o TETO DE TEMPO (fim por tempo com balões cheios).
// B) E2E (vite + browser): menu com botão 🎈 BATALHA, contagem →
//    corrida, hook batalha() (arena/12/3), condução assistida real,
//    HUD de balões («×3» + «12 de pé»), teto em contagem decrescente,
//    PAUSA congela a batalha, balões a ESTOURAR em campo (poll),
//    ZERO pageerror.
// Uso: PW_CHROME=… node test-kart-batalha-v68.mjs
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
const SEME_PROVA = 20261119;

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "autoplay",
];

const entParada = () => ({ acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false });

let bat, core;
async function main() {
  limparZumbis();
  console.log(`\n🎈 BATALHA DE BALÕES v68 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (batalha.ts + core.ts) —");
  core = await import(`${RAIZ}/src/game/kart/core.ts`);
  bat = await import(`${RAIZ}/src/game/kart/batalha.ts`);

  // 1) arena Coliseu
  ok("arena «coliseu» resolve por pistaPorId e NÃO entra no menu de corridas",
    core.pistaPorId("coliseu") === bat.pistaBatalha
    && !core.IDS_PISTAS.includes("coliseu")
    && core.pistaPorId("praia") !== null);
  const arena1 = core.construirPista(bat.pistaBatalha);
  const arena2 = core.construirPista(bat.pistaBatalha);
  ok("Coliseu: anel CURTO e LARGO determinístico (400-800 u, largura ≥ 10)",
    arena1.comprimento > 400 && arena1.comprimento < 800
    && arena1.def.largura >= 10
    && arena1.amostras[100].x === arena2.amostras[100].x);
  ok("Coliseu tem caixas, moedas e rampas (a batalha usa as MESMAS armas do core)",
    arena1.caixas.length >= 12 && arena1.moedas.length >= 20 && arena1.rampas.length === 3);

  // 2) novaBatalha
  const b0 = bat.novaBatalha({ kartJogador: "viralata", semente: SEME_PROVA });
  ok("12 pilotos · jogador no slot 6 · 3 balões para todos",
    b0.cor.corredores.length === 12
    && b0.cor.corredores[6].eJogador && b0.cor.corredores[6].id === 6
    && b0.baloes.every((x) => x === 3));
  ok("voltas ∞ SOBREVIVE ao clamp da corrida (furo da sonda: 999 entrava como 5)",
    b0.cor.voltas === 999 && b0.cor.pista.def.id === "coliseu"
    && core.VOLTAS_MAX === 5 && b0.cor.fase === "contagem");

  // 3) contagem → corrida (batalha PRÓPRIA — as provas de unidade ficam NA CONTAGEM,
  //    onde os bots estão congelados: zero ruído de eventos reais)
  for (let i = 0; i < 150; i++) { bat.passoBatalha(b0, entParada(), 1 / 30); b0.cor.eventos.length = 0; }
  ok("contagem 3-2-1-JÁ termina (≈4 s) e a batalha corre", b0.cor.fase === "corrida" && b0.cor.tempo > 0);

  // batalha isolada para os testes de duto de eventos (sempre em CONTAGEM)
  const bu = bat.novaBatalha({ kartJogador: "viralata", semente: SEME_PROVA });
  // 4) golpe → balão (lote manipulado: prova o DUTO de eventos do core)
  bu.cor.eventos.push({ t: "golpe", alvo: 3, tipo: "casca", por: 6 });
  bat.passoBatalha(bu, entParada(), 1 / 30);
  bu.cor.eventos.length = 0; // dreno (como o motor faz por frame)
  ok("golpe tira 1 balão, credita o agressor e dá invulnerabilidade",
    bu.baloes[3] === 2 && bu.invuln[3] > 0 && bu.golpes[6] === 1
    && bu.eventos.some((e) => e.t === "balao" && e.alvo === 3 && e.restam === 2));
  // 5) invuln: o mesmo alvo num lote seguinte NÃO perde outro balão
  bu.cor.eventos.push({ t: "golpe", alvo: 3, tipo: "oleo", por: 7 });
  const antesBal3 = bu.baloes[3];
  const nEv5 = bu.eventos.length;
  bat.passoBatalha(bu, entParada(), 1 / 30);
  bu.cor.eventos.length = 0;
  ok("INVULNERÁVEL: golpe durante a janela não estoura o 2.º balão",
    bu.baloes[3] === antesBal3
    && !bu.eventos.slice(nEv5).some((e) => e.t === "balao" && e.alvo === 3));

  // 6) raio respeita o ESCUDO (o core consome o escudo → evento escudo → protegido)
  bu.cor.eventos.push({ t: "escudo", alvo: 5 }, { t: "raio", por: 0 });
  const antes = bu.baloes.slice();
  bat.passoBatalha(bu, entParada(), 1 / 30);
  bu.cor.eventos.length = 0;
  ok("RAIO: quem tem escudo NÃO perde balão; os restantes perdem 1 (o lançador nunca)",
    bu.baloes[5] === antes[5] && bu.baloes[0] === antes[0]
    && bu.baloes[1] === antes[1] - 1 && bu.baloes[11] === antes[11] - 1);

  // 7) eliminação: 3 balões → wreck que não volta a ser atingido
  for (let k = 0; k < 3; k++) {
    bu.invuln[4] = 0;
    bu.cor.eventos.push({ t: "golpe", alvo: 4, tipo: "missil", por: 6 });
    bat.passoBatalha(bu, entParada(), 1 / 30);
    bu.cor.eventos.length = 0;
  }
  ok("3 golpes = ELIMINADO (wreck: terminou em campo + ordem de eliminação)",
    bu.baloes[4] === 0 && bu.cor.corredores[4].terminou === true
    && bu.eliminados.length === 1 && bu.eliminados[0] === 4
    && bu.eventos.some((e) => e.t === "eliminado" && e.alvo === 4));
  bu.invuln[4] = 0;
  bu.cor.eventos.push({ t: "golpe", alvo: 4, tipo: "casca", por: 6 });
  bat.passoBatalha(bu, entParada(), 1 / 30);
  bu.cor.eventos.length = 0;
  ok("eliminado não perde mais balões nem volta ao ranking de vivos",
    bu.baloes[4] === 0 && bat.rankingBatalha(bu).every((c) => !(c.id === 4 && !c.terminou)));

  // 8) recompensa
  ok("recompensaBatalha: 1.º > 12.º e bónus por balão sobrevivente (teto = 3)",
    bat.recompensaBatalha(1, 0).moedas > bat.recompensaBatalha(12, 0).moedas
    && bat.recompensaBatalha(5, 3).moedas === bat.recompensaBatalha(5, 0).moedas + 30
    && bat.recompensaBatalha(5, 9).moedas === bat.recompensaBatalha(5, 0).moedas + 30
    && bat.recompensaBatalha(2, 0).moedas === 85);

  // 9) ranking sintético
  const br = bat.novaBatalha({ kartJogador: "viralata", semente: 7 });
  br.baloes = [1, 3, 3, 0, 2, 3, 0, 1, 3, 0, 2, 0];
  br.golpes = [0, 0, 5, 0, 0, 0, 0, 0, 9, 0, 1, 0];
  br.cor.corredores[3].terminou = true; br.eliminados.push(3);
  br.cor.corredores[6].terminou = true; br.eliminados.push(6);
  br.cor.corredores[9].terminou = true; br.eliminados.push(9);
  br.cor.corredores[11].terminou = true; br.eliminados.push(11);
  const ordem = bat.rankingBatalha(br).map((c) => c.id);
  ok("ranking: balões ↓, desempate por GOLPES, eliminados por ordem REVERSA",
    JSON.stringify(ordem) === JSON.stringify([8, 2, 1, 5, 10, 4, 0, 7, 11, 9, 6, 3]));

  // 10) batalha COMPLETA determinística (valores exatos da seed de prova)
  const { estado: b1, passos } = bat.simularBatalha({ kartJogador: "viralata", semente: SEME_PROVA, dt: 1 / 30 });
  const soma1 = b1.baloes.reduce((a, x) => a + x, 0);
  const golpes1 = b1.golpes.reduce((a, x) => a + x, 0);
  ok("batalha completa: acaba por ÚLTIMO-DE-PÉ antes do teto (não por voltas)",
    b1.fim && b1.cor.fase === "fim" && b1.cor.tempo < 180 && b1.vencedor === 0);
  ok("batalha completa: 11 eliminados, 2 balões de pé e 33 golpes creditados (seed exata)",
    b1.eliminados.length === 11 && soma1 === 2 && golpes1 === 33
    && JSON.stringify(b1.eliminados) === JSON.stringify([4, 3, 5, 9, 1, 7, 8, 10, 11, 2, 6]));
  ok("resultados: 12 posições únicas · jogador 2.º lugar com payout da tabela",
    b1.cor.resultados.length === 12
    && [...b1.cor.resultados].sort((a, b) => a.posicao - b.posicao).every((r, i) => r.posicao === i + 1)
    && (b1.cor.resultados.find((r) => r.id === 6)?.posicao ?? -1) === 2
    && b1.cor.payout.moedas === bat.recompensaBatalha(2, 0).moedas
    && b1.cor.payout.xp === bat.recompensaBatalha(2, 0).xp);
  ok("evento fimBatalha com o vencedor e o wreck do jogador honesto",
    b1.eventos.some((e) => e.t === "fimBatalha" && e.vencedor === 0)
    && b1.cor.corredores[6].terminou === true && b1.baloes[6] === 0
    && passos * (1 / 30) >= b1.cor.tempo);

  // 11) determinismo
  const { estado: b2 } = bat.simularBatalha({ kartJogador: "viralata", semente: SEME_PROVA, dt: 1 / 30 });
  ok("DETERMINISMO: mesma seed → mesma batalha inteira",
    b2.vencedor === b1.vencedor && JSON.stringify(b2.baloes) === JSON.stringify(b1.baloes)
    && JSON.stringify(b2.eliminados) === JSON.stringify(b1.eliminados)
    && b2.cor.tempo.toFixed(3) === b1.cor.tempo.toFixed(3));

  // 12) teto de tempo: balões cheios → fim por TEMPO com ranking por balões
  const b3 = bat.novaBatalha({ kartJogador: "viralata", semente: 41 });
  b3.baloes.fill(99); // cheios o suficiente para NINGUÉM cair dentro de 180 s
  let guarda = 0;
  while (!b3.fim && guarda < 6200) {
    b3.cor.eventos.length = 0; // (só higiene de memória — os golpes reais dos bots continuam a valer)
    bat.passoBatalha(b3, entParada(), 1 / 30);
    guarda++;
  }
  const cls3 = bat.rankingBatalha(b3).map((c) => ({ id: c.id, bal: b3.baloes[c.id] }));
  ok("TETO DE TEMPO: fecha a 180 s com balões de pé e ranking por balões ↓",
    b3.fim && b3.cor.tempo >= 180 && b3.cor.tempo < 181 && b3.cor.resultados.length === 12
    && cls3[0].bal >= cls3[cls3.length - 1].bal && b3.vencedor >= 0);
  const posJ3 = b3.cor.resultados.find((r) => r.id === 6)?.posicao ?? 12;
  ok("payout do teto = tabela da posição real do jogador (bónus ≤ 3 balões)",
    b3.cor.payout !== null
    && b3.cor.payout.moedas === bat.recompensaBatalha(posJ3, b3.baloes[6]).moedas
    && b3.cor.payout.moedas >= bat.recompensaBatalha(posJ3, 0).moedas);

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: menu 🎈 → Coliseu → HUD de balões) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("menu do kart carrega com o botão da BATALHA",
    await pg.locator('[data-testid="kart-batalha"]').count() === 1
    && await pg.locator('[data-testid="kart-batalha-sub"]').count() === 1);

  await pg.locator('[data-testid="kart-batalha"]').click();
  await pg.waitForSelector('[data-testid="kart-jogo"]', { timeout: 45_000 });
  await pg.waitForFunction(() => !!window.__kart?.batalha, null, { timeout: 45_000 });
  ok("Coliseu arranca: arena certa, 12 pilotos, 3 balões no jogador",
    await pg.evaluate(() => {
      const b = window.__kart.batalha();
      return b && b.arena === "coliseu" && b.corredores === 12 && b.meus === 3 && b.vivos === 12 && b.fase === "contagem";
    }));

  await pg.waitForFunction(() => window.__kart.batalha()?.fase === "corrida", null, { timeout: 30_000 });
  ok("contagem 3-2-1-JÁ passou e a batalha corre", true);

  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  await dormir(2200);
  const vel = await pg.evaluate(() => window.__kart.estado().vel);
  ok("kart do jogador MOVE-SE de verdade (condução assistida)", vel > 5);

  const hudBal = await pg.locator('[data-testid="kart-batalha-baloes"]').innerText().catch(() => "");
  const hudVivos = await pg.locator('[data-testid="kart-batalha-vivos"]').innerText().catch(() => "");
  ok("HUD da batalha: balões «×3» e «12 de pé»",
    hudBal.includes("×3") && hudVivos.includes("12"));

  // teto em contagem decrescente
  const t1 = await pg.evaluate(() => window.__kart.batalha().tempoRestante);
  await dormir(2100);
  const t2 = await pg.evaluate(() => window.__kart.batalha().tempoRestante);
  ok("teto de 180 s em CONTAGEM decrescente", t1 > t2 && t2 >= t1 - 4 && t2 <= 180);

  // pausa congela a batalha
  await pg.evaluate(() => window.__kart.pausar(true));
  const tp = await pg.evaluate(() => window.__kart.batalha().tempoRestante);
  await dormir(1300);
  const tp2 = await pg.evaluate(() => window.__kart.batalha().tempoRestante);
  ok("PAUSA congela a batalha (teto não anda)", tp2 === tp);
  await pg.evaluate(() => window.__kart.pausar(false));

  // balões a estourar em campo (poll generoso — 12 bots armados num anel apertado)
  let pop = false, popInfo = null;
  for (let i = 0; i < 60 && !pop; i++) {
    const b = await pg.evaluate(() => {
      const x = window.__kart.batalha();
      return { soma: x.baloes.reduce((a, y) => a + y, 0), elim: x.eliminados.length, vivos: x.vivos };
    });
    if (b.soma < 36 || b.elim > 0 || b.vivos < 12) { pop = true; popInfo = b; break; }
    await dormir(1500);
  }
  ok(`BALÕES ESTOURAM em campo (soma ${popInfo?.soma ?? 36} < 36 · eliminados ${popInfo?.elim ?? 0})`, pop);

  await pg.screenshot({ path: "shots-v68/batalha-arena.png" });

  const errosReais = erros.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("ZERO pageerror/console relevante", errosReais.length === 0);
  if (errosReais.length) console.log("   →", errosReais.slice(0, 3));

  await browser.close();

  console.log(`\n══ BATALHA DE BALÕES v68: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("  FALHADOS:"); for (const f of fails) console.log(`   · ${f}`); }
  process.exitCode = failed === 0 ? 0 : 1;
}

try {
  await main();
} finally {
  matarTodos();
  limparZumbis();
}
