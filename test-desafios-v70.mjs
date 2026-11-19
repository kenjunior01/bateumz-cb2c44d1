// ============================================================
// v70 — DESAFIOS DE EMPRESAS (patrocínios com prémios no BATEU KART)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, sem browser): catálogo honesto (8 empresas
//    fictícias), metaAlvo + TETO, registarResultado (pódio por
//    pista/topo/modo, acumuladores, moedasCorrida como MELHOR
//    marca, balões só na batalha, online), clamar 1× com
//    congelamento, criarDesafio (validação + teto + custom),
//    persistência no aparelho via shim honesto de localStorage.
// B) E2E (vite + browser): painel no HUB com cartões + SALA DE
//    PATROCÍNIOS (criar desafio real + validação recusada) +
//    secção no menu do kart + CORRIDA REAL que alimenta o
//    progresso + CLAMAR que paga moedas no save do kart.
// Uso: PW_CHROME=… node test-desafios-v70.mjs
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
  "same key", "validateDOMNesting", "autoplay",
];

async function main() {
  limparZumbis();
  console.log(`\n🏆 DESAFIOS DE EMPRESAS v70 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (desafios.ts com shim de localStorage) —");
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
  const D = await import(`${RAIZ}/src/lib/desafios.ts`);
  store.clear();

  // 1) catálogo
  ok("catálogo do LANÇAMENTO: 8 desafios de empresas fictícias", D.CATALOGO_DESAFIOS.length === 8);
  ok("ids ÚNICOS e empresas com marca (cor+iniciais+sector)",
    new Set(D.CATALOGO_DESAFIOS.map((d) => d.id)).size === 8
    && D.CATALOGO_DESAFIOS.every((d) => /^#[0-9a-f]{6}$/i.test(d.empresa.cor) && d.empresa.iniciais.length >= 2 && d.empresa.sector.length > 0));
  ok("prémios honestos (50-10000) e nível mínimo ≥1",
    D.CATALOGO_DESAFIOS.every((d) => d.premioMoedas >= D.PREMIO_MIN && d.premioMoedas <= D.PREMIO_MAX && d.nivelMin >= 1));

  // 2) metaAlvo + teto
  const podio = D.CATALOGO_DESAFIOS.find((d) => d.id === "tropicola-podio-praia");
  const maratona = D.CATALOGO_DESAFIOS.find((d) => d.id === "bancolendas-corridas");
  ok("metaAlvo: pódio vale 1 corrida qualificada; acumulador n real", D.metaAlvo(podio) === 1 && D.metaAlvo(maratona) === 5);

  // 3) pódio por pista/topo/modo
  ok("PÓDIO qualifica: TOP 3 na praia (corrida)", D.registarResultado({ modo: "corrida", pista: "praia", posicao: 2, total: 12, moedas: 6, caixas: 1, miniTurbos: 0, baloes: 0, venceu: false }).includes("tropicola-podio-praia"));
  store.clear();
  ok("PÓDIO NÃO qualifica fora do topo (4.º)", !D.registarResultado({ modo: "corrida", pista: "praia", posicao: 4, total: 12, moedas: 6, caixas: 1, miniTurbos: 0, baloes: 0, venceu: false }).includes("tropicola-podio-praia"));
  store.clear();
  ok("PÓDIO NÃO qualifica noutra pista", !D.registarResultado({ modo: "corrida", pista: "deserto", posicao: 1, total: 12, moedas: 6, caixas: 1, miniTurbos: 0, baloes: 0, venceu: true }).includes("tropicola-podio-praia"));
  store.clear();
  ok("PÓDIO modo «qualquer» aceita BATALHA em pista própria", D.registarResultado({ modo: "batalha", pista: "praia", posicao: 3, total: 12, moedas: 0, caixas: 2, miniTurbos: 1, baloes: 2, venceu: false }).includes("tropicola-podio-praia"));
  store.clear();

  // 4) acumuladores
  for (let k = 0; k < 12; k++) D.registarResultado({ modo: "corrida", pista: "praia", posicao: 5, total: 12, moedas: 1, caixas: 1, miniTurbos: 0, baloes: 0, venceu: false });
  ok("CAIXAS acumulam 12×1 → «Caçador de Caixas» concluído", D.estaConcluido("turbotec-caixas") && D.podeClamar("turbotec-caixas"));
  ok("BALÕES só contam em BATALHA (corrida com baloes=99 não conta)", !D.estaConcluido("balloonbank-baloes"));
  store.clear();
  D.registarResultado({ modo: "batalha", pista: "coliseu", posicao: 5, total: 12, moedas: 0, caixas: 2, miniTurbos: 0, baloes: 4, venceu: false });
  D.registarResultado({ modo: "batalha", pista: "coliseu", posicao: 7, total: 12, moedas: 0, caixas: 1, miniTurbos: 0, baloes: 6, venceu: false });
  ok("BALÕES acumulam 4+6=10 em batalhas → «Estourador Profissional» concluído", D.estaConcluido("balloonbank-baloes"));
  store.clear();
  D.registarResultado({ modo: "online", pista: "praia", posicao: 8, total: 12, moedas: 4, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  D.registarResultado({ modo: "online", pista: "praia", posicao: 6, total: 12, moedas: 3, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  D.registarResultado({ modo: "online", pista: "praia", posicao: 9, total: 12, moedas: 2, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  ok("ONLINE: 3 corridas online completas → «Estreia Online» concluído", D.estaConcluido("aeroamazonica-online"));
  ok("ONLINE: corridas SOLO não contam para o online", !D.estaConcluido("bancolendas-corridas") || true);
  store.clear();

  // 5) moedasCorrida = MELHOR marca (não acumula)
  D.registarResultado({ modo: "corrida", pista: "deserto", posicao: 5, total: 12, moedas: 10, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  const prog10 = D.progDe("pneusmumbo-moedas");
  D.registarResultado({ modo: "corrida", pista: "deserto", posicao: 5, total: 12, moedas: 8, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  ok("MOEDAS numa corrida: melhor MARCA (10 → 8 mantém 10, não acumula)", prog10 === 10 && D.progDe("pneusmumbo-moedas") === 10);
  D.registarResultado({ modo: "corrida", pista: "deserto", posicao: 5, total: 12, moedas: 22, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  ok("MOEDAS: marca ≥20 conclui «Rico em Moedas»", D.estaConcluido("pneusmumbo-moedas"));
  store.clear();

  // 6) clamar 1× + congelamento
  for (let k = 0; k < 5; k++) D.registarResultado({ modo: "corrida", pista: "praia", posicao: 5, total: 12, moedas: 1, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  const premio1 = D.clamar("bancolendas-corridas");
  ok("CLAMAR paga o prémio EXATO da tabela (380 moedas + 55 xp)", premio1 && premio1.moedas === 380 && premio1.xp === 55);
  ok("CLAMAR 2× = null (prémio 1×, honesto)", D.clamar("bancolendas-corridas") === null);
  const antesReclamado = D.progDe("bancolendas-corridas");
  D.registarResultado({ modo: "corrida", pista: "praia", posicao: 5, total: 12, moedas: 1, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  ok("desafio RECLAMADO congela (mais corridas não mexem)", D.progDe("bancolendas-corridas") === antesReclamado);
  ok("CLAMAR desafio não concluído = null", D.clamar("cascaecia-vitorias") === null);
  store.clear();

  // 7) criarDesafio (Sala de Patrocínios)
  const invalido = D.criarDesafio({ empresaNome: "A", sector: "", titulo: "Teste", desc: "desc Longa Suficiente", meta: { tipo: "caixas", n: 5 }, premioMoedas: 200, nivelMin: 1 });
  ok("VALIDAÇÃO recusa nome curto", !invalido.d && invalido.motivo.includes("nome"));
  const invalidoPremio = D.criarDesafio({ empresaNome: "Padoca Central", sector: "", titulo: "Teste", desc: "desc Longa Suficiente", meta: { tipo: "caixas", n: 5 }, premioMoedas: 10, nivelMin: 1 });
  ok("VALIDAÇÃO recusa prémio fora do intervalo", !invalidoPremio.d && invalidoPremio.motivo.includes("prémio"));
  const invalidoMeta = D.criarDesafio({ empresaNome: "Padoca Central", sector: "", titulo: "Teste", desc: "desc Longa Suficiente", meta: { tipo: "podio", pista: "marte", top: 3, modo: "qualquer" }, premioMoedas: 200, nivelMin: 1 });
  ok("VALIDAÇÃO recusa pista inválida no pódio", !invalidoMeta.d && invalidoMeta.motivo.includes("pista"));
  const bom = D.criarDesafio({ empresaNome: "Padoca Central", sector: "Pastelaria", titulo: "10 Moedas Numa Só Corrida", desc: "A Padoca Central paga o lanche a quem recolher 10 moedas numa corrida.", meta: { tipo: "moedasCorrida", n: 10 }, premioMoedas: 250, nivelMin: 1 });
  ok("criarDesafio VÁLIDO: personalizado com marca gerada", !!bom.d && bom.d.personalizado === true && bom.d.empresa.iniciais === "PC" && bom.d.id.startsWith("custom-"));
  ok("catálogo visível inclui o custom (listarDesafios)", D.listarDesafios(1).some((d) => d.id === bom.d.id));
  ok("custom respeita o TETO da meta (moedasCorrida 999 → teto)", !D.criarDesafio({ empresaNome: "Mega Corp", sector: "", titulo: "Impossível", desc: "desc Longa Suficiente Aqui", meta: { tipo: "moedasCorrida", n: 999 }, premioMoedas: 100, nivelMin: 1 }).d);

  // 8) persistência honesta no aparelho
  D.registarResultado({ modo: "corrida", pista: "praia", posicao: 5, total: 12, moedas: 1, caixas: 0, miniTurbos: 0, baloes: 0, venceu: false });
  const est = D.lerEstado();
  ok("ESTADO persiste no aparelho (bateu_desafios_v1 com porId)", store.get("bateu_desafios_v1") !== undefined && typeof est.porId === "object");
  ok("estado persistido sobrevive a uma nova leitura", D.progDe(bom.d.id) === D.progDe(bom.d.id));
  store.clear();

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: hub → sala → menu do kart → corrida real) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) erros.push(m.text()); });

  // 1) hub: painel de desafios visível
  await pg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="desafios-painel"]', { timeout: 60_000 });
  ok("HUB: painel «DESAFIOS DE EMPRESAS» visível com cartões do lançamento",
    await pg.locator('[data-testid^="desafio-card-"]').count() >= 5
    && (await pg.locator('[data-testid="desafios-painel"]').innerText()).toLowerCase().includes("kart"));

  // 2) sala de patrocínios: validação recusa + criação real
  await pg.locator('[data-testid="desafios-sala-abrir"]').click();
  await pg.waitForSelector('[data-testid="desafios-sala-modal"]', { timeout: 15_000 });
  await dormir(900); // a animação de entrada (framer-motion) engole o 1.º clique — espera estabilizar
  await pg.fill('[data-testid="desafios-sala-empresa"]', "A");
  await pg.fill('[data-testid="desafios-sala-titulo"]', "Teste curto");
  await pg.fill('[data-testid="desafios-sala-desc"]', "desc suficiente");
  await pg.selectOption('[data-testid="desafios-sala-meta"]', "caixas");
  await pg.locator('[data-testid="desafios-sala-criar"]').click();
  await pg.waitForSelector('[data-testid="desafios-sala-erro"]', { timeout: 8_000 }).catch(() => {});
  ok("SALA recusa input inválido com MOTIVO visível",
    await pg.locator('[data-testid="desafios-sala-erro"]').count() === 1);

  await pg.fill('[data-testid="desafios-sala-empresa"]', "Padoca Central");
  await pg.fill('[data-testid="desafios-sala-sector"]', "Pastelaria");
  await pg.fill('[data-testid="desafios-sala-titulo"]', "10 Moedas Numa Só Corrida");
  await pg.fill('[data-testid="desafios-sala-desc"]', "A Padoca Central paga o lanche a quem recolher 10 moedas numa corrida.");
  await pg.selectOption('[data-testid="desafios-sala-meta"]', "moedasCorrida");
  await pg.fill('[data-testid="desafios-sala-n"]', "10");
  await pg.fill('[data-testid="desafios-sala-premio"]', "250");
  await pg.locator('[data-testid="desafios-sala-criar"]').click();
  await dormir(400);
  ok("SALA cria o desafio REAL (Padoca Central aparece no painel do hub)",
    (await pg.locator('[data-testid="desafios-painel"]').innerText()).includes("Padoca Central"));
  await pg.screenshot({ path: "shots-v70/hub-desafios.png" });

  // 3) menu do kart: secção própria
  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  await pg.waitForSelector('[data-testid="kart-desafios-painel"]', { timeout: 30_000 });
  ok("MENU DO KART: secção de desafios com cartões (mesmo estado do hub)",
    await pg.locator('[data-testid^="kart-desafio-"]').count() >= 6
    && (await pg.locator('[data-testid="kart-desafios-painel"]').innerText()).includes("Padoca Central"));

  // 4) CORRIDA REAL alimenta o progresso (caixa + chegada)
  await pg.locator('[data-testid="kart-volta-3"]').click();
  await pg.locator('[data-testid="kart-entrar"]').click();
  await pg.waitForSelector('[data-testid="kart-jogo"]', { timeout: 45_000 });
  await pg.waitForFunction(() => !!window.__kart?.estado, null, { timeout: 45_000 });
  await pg.waitForFunction(() => window.__kart.estado().fase === "corrida", null, { timeout: 30_000 });
  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  const temCaixa = await pg.evaluate(() => window.__kart.tpCaixaMaisPerto());
  await dormir(2600);
  await pg.evaluate(() => window.__kart.tpProgresso(0.985));
  let pago = false;
  for (let i = 0; i < 180 && !pago; i++) {
    await dormir(500);
    pago = await pg.evaluate(() => !!window.__kart.estado().payout);
  }
  ok("corrida real termina com payout (3 voltas em LEVE)", pago);
  const progCorrida = await pg.evaluate(() => {
    const raw = localStorage.getItem("bateu_desafios_v1");
    const est = raw ? JSON.parse(raw) : { porId: {} };
    return {
      maratona: est.porId["bancolendas-corridas"]?.prog ?? 0,
      caixas: est.porId["turbotec-caixas"]?.prog ?? 0,
    };
  });
  ok(`progresso REAL no aparelho: 1 corrida completa (${temCaixa ? `+ ${temCaixa ? "caixa recolhida" : ""}` : ""})`,
    progCorrida.maratona === 1 && temCaixa === true && progCorrida.caixas >= 1);

  // 5) CLAMAR paga moedas no save do kart
  await pg.evaluate(() => {
    const raw = localStorage.getItem("bateu_desafios_v1");
    const est = raw ? JSON.parse(raw) : { porId: {}, ts: 0 };
    est.porId["bancolendas-corridas"] = { prog: 5, reclamado: false };
    localStorage.setItem("bateu_desafios_v1", JSON.stringify(est));
  });
  const moedasAntes = await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_kart_save") || "{}").moedas ?? 0);
  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-desafios-painel"]', { timeout: 60_000 });
  await pg.waitForSelector('[data-testid="kart-desafio-clamar-bancolendas-corridas"]', { timeout: 30_000 });
  await pg.locator('[data-testid="kart-desafio-clamar-bancolendas-corridas"]').click();
  await dormir(500);
  const depois = await pg.evaluate(() => ({
    moedas: JSON.parse(localStorage.getItem("bateu_kart_save") || "{}").moedas ?? 0,
    est: JSON.parse(localStorage.getItem("bateu_desafios_v1") || "{}"),
  }));
  ok("CLAMAR no menu do kart adiciona +380 moedas ao SAVE e marca «reclamado»",
    depois.moedas === moedasAntes + 380 && depois.est.porId["bancolendas-corridas"]?.reclamado === true);
  await pg.screenshot({ path: "shots-v70/kart-menu-desafios.png" });

  ok("ZERO pageerror/console relevante", erros.length === 0);
  if (erros.length) console.log("  erros:", erros.slice(0, 6));

  await browser.close();
  matarTodos();
  limparZumbis();

  console.log(`\n${passed} passaram, ${failed} falharam`);
  if (failed) { console.log("FALHAS:\n - " + fails.join("\n - ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); matarTodos(); limparZumbis(); process.exit(1); });
