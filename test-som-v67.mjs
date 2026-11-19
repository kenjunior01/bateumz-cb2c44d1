// ============================================================
// v67 — SOM E MÚSICA (Web Audio 100% sintetizado, zero assets)
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, SEM browser): o módulo importa SEM AudioContext
//    e tudo é no-op honesto que REGISTA o que tocaria; singleton
//    preguiçoso; mudo persistido; tabela fechada IDS_SOM completa;
//    adaptador SomKart (mapeamento evento→som por casos).
// B) E2E KART (vite + browser): política de autoplay (contexto só
//    nasce num GESTO), botão de som muda + persiste no aparelho
//    (sobrevive ao reload), música segue a fase (menu/corrida),
//    beeps da contagem 3-2-1-JÁ, loop do MOTOR alimentado por
//    frame com velocidade real, DERRAPAGEM alimentada, PAUSA
//    silencia por frame, caixa→item→uso com som real, ZERO pageerror.
// Uso: PW_CHROME=… node test-som-v67.mjs
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

// ═══════════════════════════════════════════════════════════════
let som, SK;
async function main() {
  limparZumbis();
  console.log(`\n🔊 SOM E MÚSICA v67 — ${BASE}\n`);

  // ── A) NÚCLEO (Node SEM AudioContext) ─────────────────────────
  console.log("— A) Núcleo (Node, sem AudioContext: no-op HONESTO que regista) —");
  const mod = await import(`${RAIZ}/src/game/som.ts`);
  som = mod.MotorSom; SK = mod;
  ok("som.ts importa em Node SEM AudioContext (sem crash)", typeof mod.MotorSom === "function");

  const inst1 = mod.somGlobal();
  const inst2 = mod.somGlobal();
  ok("somGlobal() é SINGLETON preguiçoso", inst1 === inst2);
  ok("vivo() é FALSE em Node (nunca fingiu contexto)", inst1.vivo() === false);
  ok("tocar() em Node não-crasha e REGISTA o que tocaria (instrumentação honesta)",
    (inst1.tocar("moeda"), inst1.ultimos.includes("moeda")));

  let tabelaOk = true;
  for (const id of mod.IDS_SOM) { try { inst1.tocar(id); } catch { tabelaOk = false; } }
  ok(`tabela FECHADA completa: TODOS os ${mod.IDS_SOM.length} efeitos sintetizam sem crash (Node no-op)`, tabelaOk && mod.IDS_SOM.length === 31);
  ok("v69: PÓDIO existe na tabela e sintetiza (fanfarra triunfal)", inst1.ultimos.includes("podio") && mod.IDS_SOM.includes("podio"));
  ok("ultimos é um anel com teto (24)", inst1.ultimos.length <= 24 && inst1.ultimos.length >= 20);

  ok("mudo: default FALSE e alternável SEM contexto", inst1.estaMudo() === false && (inst1.definirMudo(true), inst1.estaMudo() === true));
  inst1.tocar("ui");
  ok("messo MUDO o tocar() continua a REGISTAR (nada finge, nada esconde)", inst1.ultimos[inst1.ultimos.length - 1] === "ui");
  inst1.definirMudo(false);

  ok("musica() em Node: tipo registado, sem crash", (inst1.musica("menu"), inst1.musicaActual() === "menu"));
  ok("música muda de tema e desliga a null", (inst1.musica("corrida"), inst1.musicaActual() === "corrida") && (inst1.musica(null), inst1.musicaActual() === null));
  // v69: os 4 NOVOS temas por pista registam honestamente em Node (o sequenciador é no-op sem ctx)
  ok("v69: tema PRAIA registado", (inst1.musica("praia"), inst1.musicaActual() === "praia"));
  ok("v69: tema DESERTO registado", (inst1.musica("deserto"), inst1.musicaActual() === "deserto"));
  ok("v69: tema VULCÃO registado", (inst1.musica("vulcao"), inst1.musicaActual() === "vulcao"));
  ok("v69: tema BATALHA registado", (inst1.musica("batalha"), inst1.musicaActual() === "batalha"));
  inst1.musica(null);
  ok("loops em Node: motorKart/derrapagem/pararLoops sem crash",
    (inst1.motorKart(0.5, true), inst1.derrapagem(0.4), inst1.pararLoops(), true));
  ok("instrumentação dos loops REGISTA mesmo sem contexto",
    (inst1.motorKart(0.7, false), inst1.ultimoVelNorm() === 0.7) && (inst1.derrapagem(0.3), inst1.ultimoDerrapa() === 0.3));
  inst1.pararLoops();
  ok("pararLoops zera a instrumentação", inst1.ultimoVelNorm() === 0 && inst1.ultimoDerrapa() === 0);
  ok("despertar() em Node é no-op seguro (sem window)", (inst1.despertar(), inst1.vivo() === false));

  // adaptador SomKart — mapeamento evento→som (a TABELA do jogo)
  const ad = SK.adaptadorSomKart(inst1);
  const ultimo = () => inst1.ultimos[inst1.ultimos.length - 1];
  ok("beep(3/2/1) → «contagem» · beep(0) → «ja»",
    (ad.beep(3), ultimo() === "contagem") && (ad.beep(0), ultimo() === "ja"));
  ad.evento({ t: "item", id: 6, item: "casca" }, 6);
  ok("item MEU → «item» (caixa rebenta + revelação)", ultimo() === "item");
  const antes = inst1.ultimos.length;
  ad.evento({ t: "item", id: 3, item: "casca" }, 6);
  ok("item ALHEIO é ignorado (sem ruído dos outros)", inst1.ultimos.length === antes);
  ad.evento({ t: "moeda", id: 6 }, 6);
  ok("moeda → «moeda»", ultimo() === "moeda");
  ad.evento({ t: "uso", id: 6, item: "missil" }, 6);
  ok("uso de míssil → som PRÓPRIO do míssil", ultimo() === "missil");
  ad.evento({ t: "uso", id: 6, item: "cogumelo3" }, 6);
  ok("cogumelo3 consome por cargas → som do cogumelo", ultimo() === "cogumelo");
  ad.evento({ t: "uso", id: 6, item: "escudo" }, 6);
  ok("uso de escudo → «escudo»", ultimo() === "escudo");
  ad.evento({ t: "golpe", alvo: 6, por: 2, tipo: "casca" }, 6);
  ok("golpe RECEBIDO → «golpe»", ultimo() === "golpe");
  ad.evento({ t: "golpe", alvo: 2, por: 6, tipo: "casca" }, 6);
  ok("o MEU projétil acerta → «acerto»", ultimo() === "acerto");
  ad.evento({ t: "raio", por: 6 }, 6);
  ok("raio LANÇADO por mim → «raio»", ultimo() === "raio");
  ad.evento({ t: "raio", por: 2 }, 6);
  ok("raio dos outros atinge-me → «golpe»", ultimo() === "golpe");
  ad.evento({ t: "escudo", alvo: 6 }, 6);
  ok("escudo em mim → «escudo»", ultimo() === "escudo");
  ad.evento({ t: "deriva", fase: 2, id: 6 }, 6);
  ok("mini-turbo tier 2 → «turbo2»", ultimo() === "turbo2");
  ad.evento({ t: "deriva", fase: 1, id: 6 }, 6);
  ok("mini-turbo tier 1 → «turbo1»", ultimo() === "turbo1");
  ad.evento({ t: "rampa", id: 6 }, 6);
  ok("rampa → «rampa»", ultimo() === "rampa");
  ad.evento({ t: "contrario" }, 6);
  ok("sentido contrário → aviso sonoro", ultimo() === "contrario");
  const nAntes = inst1.ultimos.length;
  ad.evento({ t: "volta", id: 6, volta: 2 }, 6);
  ad.evento({ t: "fimSala" }, 6);
  ok("volta/fimSala SEM som próprio (sem crash, sem ruído)", inst1.ultimos.length === nAntes);
  ad.chegada();
  ok("chegada → fanfarra", ultimo() === "chegada");

  // ── v67 FURO REAL: colisão kart-kart drenava por STEP de contacto contínuo ──
  // (pilha de karts no cotovelo do deserto mantinha todos a ~4 u/s com acelerar preso)
  {
    const coreK = await import(`${RAIZ}/src/game/kart/core.ts`);
    const pista = coreK.construirPista(coreK.pistaPorId("deserto"));
    const prepara = () => {
      const e2 = coreK.novaCorridaOnline({
        pista, voltas: 3, semente: 99,
        jogadores: [{ nome: "A", kart: "viralata", melhorias: {} }, { nome: "B", kart: "viralata", melhorias: {} }],
      });
      for (let i = 0; i < 180; i++) coreK.passoCorridaMulti(e2, {}, 1 / 30); // contagem → corrida
      return e2;
    };
    const entAcel = { acelerar: true, travar: false, virar: 0, derrapar: false, usarItem: false };
    // RASTEJAR lado a lado: mesmo dirAng, mesma vel, sobrepostos, ambos a acelerar → vel mantém
    {
      const e2 = prepara();
      const [a, b] = [e2.corredores[0], e2.corredores[1]]; // os DOIS humanos (slots 6 e 8)
      a.x = b.x + 1; a.z = b.z; a.ang = b.ang; a.dirAng = b.dirAng; a.vel = 20; b.vel = 20;
      for (let i = 0; i < 30; i++) coreK.passoCorridaMulti(e2, { [a.id]: entAcel, [b.id]: entAcel }, 1 / 30);
      ok("CONTACTO contínuo (rastejar junto) NÃO drena velocidade (a pilha desfaz-se)",
        a.vel > 16 && b.vel > 16);
    }
    // CHOQUE frontal: aproximação real → perde velocidade (a batida continua a custar)
    {
      const e2 = prepara();
      const [a, b] = [e2.corredores[0], e2.corredores[1]];
      a.vel = 20; b.vel = 20;
      a.ang = b.ang + Math.PI; a.dirAng = a.ang; // A aponta CONTRA B
      a.x = b.x + Math.sin(b.ang) * 2.2; a.z = b.z + Math.cos(b.ang) * 2.2; // A À FRENTE de B (vindo ao seu encontro)
      for (let i = 0; i < 10; i++) coreK.passoCorridaMulti(e2, { [a.id]: entAcel, [b.id]: entAcel }, 1 / 30);
      ok("CHOQUE frontal (aproximação) PERDE velocidade", a.vel < 18.5 && b.vel < 18.5);
    }
  }

  // ── B) E2E KART ───────────────────────────────────────────────
  console.log("\n— B) E2E kart (vite + browser: gesto→contexto, contagem, motor, pausa, item) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  // aquecimento (lição v62)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 }).catch(() => {});
  await dormir(1500);
  await warmPg.close(); await warmCtx.close();

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error" && !/favicon|net::|30\d|40\d|devtools/i.test(m.text())) erros.push(m.text()); });

  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  await pg.evaluate(() => { try { localStorage.removeItem("bateu_som"); } catch {} }); // limpeza 1× (NÃO addInitScript — lição v65: apagaria no reload do próprio teste)
  ok("menu do kart com gancho de som window.__som", await pg.evaluate(() => !!window.__som && typeof window.__som.ultimos === "object"));

  ok("POLÍTICA DE AUTOPLAY honesta: contexto ainda NÃO nasceu antes do gesto",
    await pg.evaluate(() => window.__som.vivo() === false));

  await pg.locator('[data-testid="kart-som"]').click();
  await dormir(300);
  ok("1.º clique no botão: contexto NASCE num gesto + muda para mudo",
    await pg.evaluate(() => window.__som.vivo() === true && window.__som.estaMudo() === true));
  ok("mudo PERSISTE no aparelho (bateu_som = «1»)",
    await pg.evaluate(() => localStorage.getItem("bateu_som") === "1"));
  await pg.screenshot({ path: "shots-v67/kart-menu-som.png" });

  await pg.locator('[data-testid="kart-som"]').click();
  await dormir(200);
  ok("2.º clique volta a LIGAR o som (e grava «0»)",
    await pg.evaluate(() => window.__som.estaMudo() === false && localStorage.getItem("bateu_som") === "0"));

  await pg.locator('[data-testid="kart-entrar"]').click();
  await pg.waitForSelector('[data-testid="kart-canvas"]', { timeout: 30_000 });
  ok("corrida começa e a MÚSICA segue a fase E A PISTA (v69: tema da pista default = praia)",
    await pg.evaluate(() => window.__som.musicaActual() === "praia"));

  // contagem 3-2-1-JÁ
  let temContagem = false, temJa = false;
  for (let i = 0; i < 90 && !(temContagem && temJa); i++) {
    const u = await pg.evaluate(() => window.__som.ultimos.slice(-12));
    if (u.includes("contagem")) temContagem = true;
    if (u.includes("ja")) temJa = true;
    await dormir(100);
  }
  ok("CONTAGEM tem beeps (3·2·1)", temContagem);
  ok("largada tem o «JÁ!»", temJa);

  // motor alimentado por frame com velocidade REAL
  await pg.evaluate(() => window.__kart.dirigirAuto(true));
  let velNormMax = 0;
  for (let i = 0; i < 40; i++) {
    velNormMax = Math.max(velNormMax, await pg.evaluate(() => window.__som.ultimoVelNorm()));
    if (velNormMax > 0.05) break;
    await dormir(100);
  }
  ok("loop do MOTOR é alimentado por FRAME com a velocidade real (velNorm > 0,05)", velNormMax > 0.05);

  // derrapagem alimentada (o auto OVERWRITES a entrada a cada frame — desligá-lo primeiro;
  // o core exige derrapar + vel > 16 + virar ≠ 0 para ENTRAR em deriva)
  await pg.evaluate(() => window.__kart.dirigirAuto(false));
  await pg.evaluate(() => window.__kart.entrada({ acelerar: true, virar: 0.8, derrapar: true }));
  let derrapaMax = 0;
  for (let i = 0; i < 50; i++) {
    derrapaMax = Math.max(derrapaMax, await pg.evaluate(() => window.__som.ultimoDerrapa()));
    if (derrapaMax > 0.3) break;
    await dormir(100);
  }
  await pg.evaluate(() => window.__kart.entrada({ derrapar: false, virar: 0 }));
  ok("loop da DERRAPAGEM é alimentado quando derrapa (força > 0,3)", derrapaMax > 0.3);

  // pausa silencia POR FRAME (e não só uma vez)
  await pg.evaluate(() => window.__kart.pausar(true));
  await dormir(400);
  const pausaSilencia = await pg.evaluate(() => window.__som.ultimoVelNorm() === 0 && window.__som.ultimoDerrapa() === 0);
  ok("PAUSA silencia os loops por frame (motor+derrapagem a 0)", pausaSilencia);
  await pg.evaluate(() => window.__kart.pausar(false));
  await dormir(400);
  ok("retomar devolve o motor (velNorm > 0 de novo)",
    (await pg.evaluate(() => window.__som.ultimoVelNorm())) > 0);

  // caixa → item → uso com som REAL (o core emite SÓ «item» na recolha)
  await pg.evaluate(() => window.__kart.tpCaixaMaisPerto());
  let temItem = false;
  for (let i = 0; i < 160 && !temItem; i++) {
    temItem = await pg.evaluate(() => window.__kart.estado().item !== null);
    await dormir(100);
  }
  ok("caixa rebenta + item revelado com SOM («item» no registo)", (await pg.evaluate(() => window.__som.ultimos)).includes("item"));
  if (temItem) {
    await pg.evaluate(() => window.__kart.usarItem());
    await dormir(500);
    const usos = ["casca", "cascaAlvo", "missil", "oleo", "raio", "escudo", "cogumelo"];
    const ult = await pg.evaluate(() => window.__som.ultimos.slice(-8));
    ok(`uso do item (${temItem ? "com item real" : "?"}) tem som PRÓPRIO do tipo`, ult.some((x) => usos.includes(x)));
  }

  // voltar ao HUB (o sair fecha o PORTAL — comportamento v63/v65) e a música PARA
  await pg.locator('[data-testid="kart-pausa"]').click();
  await pg.locator('[data-testid="kart-sair-pausa"]').click();
  await dormir(1200);
  ok("sair fecha o portal e a música PARA (hub silencioso, honesto)",
    await pg.evaluate(() => window.__som === undefined || window.__som.musicaActual() === null));

  // mudo persiste após RELOAD: nova carga do menu, liga o mudo, recarrega
  await pg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  await pg.locator('[data-testid="kart-som"]').click(); // liga o mudo
  await dormir(200);
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
  ok("APÓS RELOAD o mudo persiste (o aparelho é a fonte)",
    await pg.evaluate(() => window.__som.estaMudo() === true));
  await pg.locator('[data-testid="kart-som"]').click();
  await dormir(200);
  ok("dessilenciar depois do reload funciona (fica «0»)",
    await pg.evaluate(() => window.__som.estaMudo() === false && localStorage.getItem("bateu_som") === "0"));
  await pg.screenshot({ path: "shots-v67/kart-menu-final.png" });

  ok("kart: ZERO pageerror/console relevante", erros.length === 0);

  await browser.close();

  // ── relatório ─────────────────────────────────────────────────
  console.log(`\n══ SOM E MÚSICA v67: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("  FALHADOS:"); for (const f of fails) console.log(`   · ${f}`); }
  process.exitCode = failed === 0 ? 0 : 1;
}

main().finally(() => { matarTodos(); limparZumbis(); });
