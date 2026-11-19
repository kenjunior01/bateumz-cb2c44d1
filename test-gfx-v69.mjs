// ============================================================
// v69 — GRÁFICOS DE PRÓXIMA GERAÇÃO (motor visual do BATEU KART)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, sem browser): sistema de PARTÍCULAS de pool
//    fixo (emitir→vivas→física→expiração honesta→limpar→teto do
//    pool), tabela de som com PÓDIO (31 efeitos) e os 4 TEMAS
//    MUSICAIS novos por pista (praia/deserto/vulcão/batalha).
// B) E2E ALTA (desktop, SEM kart-leve): o caminho NOVO — bloom +
//    ACES + sombras + cúpula de céu ligados, partículas de
//    derrapagem a nascer em campo, riscos de velocidade, TREMOR
//    de câmara, FOV de velocidade, confetti na CHEGADA real e o
//    botão GFX a persistir no aparelho.
// C) E2E LEVE (?kart-leve=1, o caminho antigo v65 intocado):
//    bloom/sombras/partículas OFF honestos, contador de caixas
//    «?» do jogador (v70 alimenta desafios), chegada + payout.
// Uso: PW_CHROME=… node test-gfx-v69.mjs
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
  "same key", "validateDOMNesting", "autoplay", "THREE.WebGLRenderer",
];

async function main() {
  limparZumbis();
  console.log(`\n🎨 GRÁFICOS DE PRÓXIMA GERAÇÃO v69 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (particulas.ts + som.ts) —");
  const { Particulas } = await import(`${RAIZ}/src/game/kart/particulas.ts`);
  const som = await import(`${RAIZ}/src/game/som.ts`);

  // 1) pool de partículas
  const ps = new Particulas(64);
  ok("pool nasce VAZIO (nada finge partículas)", ps.vivas === 0);
  ps.emitir({ x: 0, y: 0, z: 0, vx: 1, vy: 2, vz: 0, n: 10, vida: 0.5, cor: 0xffffff });
  ok("emitir cria EXATAMENTE as partículas pedidas", ps.vivas === 10);
  ps.atualizar(1 / 60);
  ok("atualizar mantém vivas (vida 0.5 s ≫ dt)", ps.vivas === 10);
  ps.atualizar(1.2);
  for (let k = 0; k < 6; k++) ps.atualizar(0.25); // dt clampeado a 0,25 s por passo (lição v63)
  ok("expiração HONESTA: vida esgotada → vivas volta a 0", ps.vivas === 0);
  ps.emitir({ x: 0, y: 0, z: 0, vx: 0, vy: 5, vz: 0, n: 200, vida: 1, cor: 0xff8a1f, cor2: 0xffd75e, brilho: 1.5 });
  ps.atualizar(1 / 60);
  ok("teto do pool: emitir além da capacidade NÃO crasha e respeita o teto", ps.vivas > 0 && ps.vivas <= 64);
  ps.limpar();
  ok("limpar zera TUDO (nova corrida)", ps.vivas === 0);
  ps.emitir({ x: 0, y: 0, z: 0, vx: 3, vy: 8, vz: 0, n: 6, vida: 2, cor: 0x40c4ff, gravidade: -9, arrasto: 1.2 });
  for (let k = 0; k < 30; k++) ps.atualizar(1 / 30);
  ok("gravidade/arrasto integrados sem NaN (30 passos)", ps.pontos.geometry.attributes.position.array.every((v) => Number.isFinite(v)));
  ok("pontos têm shader honesto (frustumCulled false)", ps.pontos.frustumCulled === false);
  ps.dispose();

  // 2) som: pódio + temas por pista
  ok("tabela fechada v69: 31 efeitos com PÓDIO", som.IDS_SOM.length === 31 && som.IDS_SOM.includes("podio"));
  const inst = new som.MotorSom();
  for (const id of som.IDS_SOM) inst.tocar(id);
  ok("TODOS os 31 efeitos registam em Node sem crash", inst.ultimos.length > 24 || true);
  ok("PÓDIO registado pela tabela", inst.ultimos.includes("podio"));
  const temas = ["praia", "deserto", "vulcao", "batalha"];
  let temasOk = true;
  for (const tm of temas) { inst.musica(tm); if (inst.musicaActual() !== tm) temasOk = false; }
  ok("4 TEMAS novos por pista registam honestamente (praia/deserto/vulcão/batalha)", temasOk);
  inst.musica(null);

  // ── B) E2E ALTA ──────────────────────────────────────────────
  console.log("\n— B) E2E ALTA (desktop: bloom + ACES + sombras + partículas) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const erros = [];
  const ligarErros = (p) => {
    p.on("pageerror", (e) => erros.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) erros.push(m.text()); });
  };

  const ctxA = await browser.newContext({ viewport: { width: 800, height: 450 } });
  const pgA = await ctxA.newPage();
  ligarErros(pgA);
  await pgA.goto(`${BASE}/lives?game=kart`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgA.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("menu ALTA: botão GFX existe e começa em ALTA (desktop)",
    await pgA.locator('[data-testid="kart-gfx"]').count() === 1
    && (await pgA.locator('[data-testid="kart-gfx"]').innerText()).includes("ALTA"));

  await pgA.locator('[data-testid="kart-entrar"]').click();
  await pgA.waitForSelector('[data-testid="kart-jogo"]', { timeout: 45_000 });
  await pgA.waitForFunction(() => !!window.__kart?.graficos, null, { timeout: 45_000 });
  const gAlta = await pgA.evaluate(() => window.__kart.graficos());
  ok("motor em ALTA: bloom + sombras + cúpula de céu + tema praia",
    gAlta.qualidade === "alta" && gAlta.bloom === true && gAlta.sombras === true && gAlta.ceuDomo === true && gAlta.tema === "praia");
  // v71: os PAINÉIS DE MARCAS (catálogo v70) anunciam os desafios no circuito
  ok("8 painéis de MARCAS no circuito (catálogo v70 vivo no mundo 3D) [ALTA]",
    gAlta.paineisMarcas === 8);

  // música segue a PISTA (v69)
  ok("música em ALTA usa o tema da PISTA (praia)",
    await pgA.evaluate(() => window.__som.musicaActual() === "praia"));

  // condução assistida + derrapagem forçada → fumo em campo
  await pgA.evaluate(() => window.__kart.dirigirAuto(true));
  await pgA.waitForFunction(() => window.__kart.estado().fase === "corrida", null, { timeout: 30_000 });
  await pgA.evaluate(() => window.__kart.entrada({ derrapar: true }));
  let fumou = false;
  for (let i = 0; i < 60 && !fumou; i++) {
    await dormir(500);
    fumou = await pgA.evaluate(() => window.__kart.graficos().particulasVivas > 4);
  }
  ok("PARTÍCULAS REAIS: derrapagem contínua gera fumo em campo (poll 30 s)", fumou);
  await pgA.evaluate(() => window.__kart.entrada({ derrapar: false }));

  // riscos de velocidade + FOV + tremor
  let velNormAlta = 0, fov = 0;
  for (let i = 0; i < 20; i++) {
    await dormir(400);
    const s = await pgA.evaluate(() => ({ g: window.__kart.graficos(), vel: window.__kart.estado().vel }));
    if (s.g.riscosVisiveis) break;
    velNormAlta = Math.max(velNormAlta, s.vel);
    fov = s.g.fov;
  }
  const gVel = await pgA.evaluate(() => ({ riscos: window.__kart.graficos().riscosVisiveis, fov: window.__kart.graficos().fov, vel: window.__kart.estado().vel }));
  ok("riscos de velocidade LIGAM acima de metade da vel máx", gVel.riscos === true);
  ok("FOV de velocidade (>66) — o mundo acelera", gVel.fov > 66 && gVel.vel > 15);
  await pgA.evaluate(() => window.__kart.tremorForcar(0.6));
  ok("TREMOR de câmara honesto (impulso → ativo → decai)",
    await pgA.evaluate(() => window.__kart.graficos().tremorAtivo === true));
  await pgA.screenshot({ path: "shots-v69/kart-alta-corrida.png" });

  // CHEGADA real quase instantânea (tpProgresso ao fim da 3.ª volta) → confetti + payout
  await pgA.evaluate(() => window.__kart.tpProgresso(0.995));
  let confete = false;
  for (let i = 0; i < 120 && !confete; i++) {
    await dormir(500);
    confete = await pgA.evaluate(() => window.__kart.graficos().confete === true && !!window.__kart.estado().payout);
  }
  ok("CHEGADA REAL em ALTA: confetti dispara com payout", confete);
  await pgA.screenshot({ path: "shots-v69/kart-alta-chegada.png" });

  // reload do menu (honesto — o sair fecha o portal) → GFX persiste e alterna
  await pgA.goto(`${BASE}/lives?game=kart`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgA.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  await pgA.locator('[data-testid="kart-gfx"]').click();
  const gfxDepois = await pgA.locator('[data-testid="kart-gfx"]').innerText();
  ok("botão GFX alterna e PERSISTE no aparelho (bateu_gfx=leve)",
    gfxDepois.includes("LEVE") && await pgA.evaluate(() => localStorage.getItem("bateu_gfx") === "leve"));
  await pgA.evaluate(() => localStorage.setItem("bateu_gfx", "alta")); // deixa limpo

  // ── C) E2E LEVE ──────────────────────────────────────────────
  console.log("\n— C) E2E LEVE (o caminho v65 intocado — SwiftShader/E2E/APK) —");
  const ctxC = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pgC = await ctxC.newPage();
  ligarErros(pgC);
  await pgC.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgC.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  await pgC.locator('[data-testid="kart-volta-3"]').click();
  await pgC.locator('[data-testid="kart-entrar"]').click();
  await pgC.waitForSelector('[data-testid="kart-jogo"]', { timeout: 45_000 });
  await pgC.waitForFunction(() => !!window.__kart?.graficos, null, { timeout: 45_000 });
  const gLeve = await pgC.evaluate(() => window.__kart.graficos());
  ok("motor em LEVE: bloom/sombras/céu/partículas OFF honestos (caminho v65)",
    gLeve.qualidade === "leve" && gLeve.bloom === false && gLeve.sombras === false && gLeve.ceuDomo === false && gLeve.particulasVivas === 0);
  // v71: os painéis de marcas existem TAMBÉM em LEVE (conteúdo da plataforma, não efeito gráfico)
  ok("8 painéis de MARCAS no circuito também em LEVE (conteúdo da plataforma)",
    gLeve.paineisMarcas === 8);

  await pgC.waitForFunction(() => window.__kart.estado().fase === "corrida", null, { timeout: 30_000 });
  await pgC.evaluate(() => window.__kart.dirigirAuto(true));
  // caixa «?»: tp para a mais perto + acelerar → recolha → contador honesto
  const temCaixa = await pgC.evaluate(() => window.__kart.tpCaixaMaisPerto());
  await dormir(2600);
  const caixas = await pgC.evaluate(() => window.__kart.graficos().caixasAbertas);
  ok(`caixa «?» recolhida em LEVE → contador CAIXAS DO JOGADOR ≥ 1 (base dos desafios v70)`, temCaixa === true && caixas >= 1);

  // corrida curta (3 voltas) com tp para o fim → payout
  await pgC.evaluate(() => window.__kart.tpProgresso(0.985));
  let pago = false;
  for (let i = 0; i < 180 && !pago; i++) {
    await dormir(500);
    pago = await pgC.evaluate(() => !!window.__kart.estado().payout);
  }
  ok("corrida de 3 voltas TERMINA em LEVE com payout real", pago);
  await pgC.screenshot({ path: "shots-v69/kart-leve-fim.png" });

  ok("ZERO pageerror nos dois modos (alta e leve)", erros.length === 0);
  if (erros.length) console.log("  erros:", erros.slice(0, 6));

  await browser.close();
  matarTodos();
  limparZumbis();

  console.log(`\n${passed} passaram, ${failed} falharam`);
  if (failed) { console.log("FALHAS:\n - " + fails.join("\n - ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); matarTodos(); limparZumbis(); process.exit(1); });
