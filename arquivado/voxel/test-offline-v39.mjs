// ============================================================
// E2E — v39 PERSISTÊNCIA HONESTA + OFFLINE REAL (roteiro N1)
// ────────────────────────────────────────────────────────────
// Parte A (dev 8099) — armazem.ts (IndexedDB + espelho LS):
//   roundtrip · guardar() honesto do motor · regra do `ts`
//   (o registo mais recente ganha, nunca um espelho velho) ·
//   save só-no-IDB · apagar limpa os DOIS armazéns ·
//   progresso da Cidade recuperado após limpeza do localStorage.
// Parte B (preview 4174 — BUILD real com service worker):
//   /cidade e / jogam OFFLINE a partir do precache, com erros
//   honestos nas fontes de rede e ZERO pageerrors.
// Uso: PW_CHROME=<chromium> node test-offline-v39.mjs
//      (vite dev na 8099; a Parte B lança `vite preview` sozinha)
// ============================================================
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_B = 4174;
const BASE_B = `http://localhost:${PORTA_B}`;
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
  "ENTRADA", "favicon", "service worker", "ServiceWorker", "The script has an unsupported MIME type",
];
const erroReal = (erros) => erros.filter((e) => !NOISE.some((n) => e.includes(n)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n💾 v39 ARMAZÉM + OFFLINE — A: ${BASE} · B: ${BASE_B}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ══════════ PARTE A — persistência honesta (dev) ══════════
  console.log("═══ A · Armazém (IndexedDB + espelho LS) ═══");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errosA = [];
  page.on("pageerror", (e) => errosA.push(String(e)));
  // limpar AMBOS os armazéns na 1ª carga (LS + IDB) — como o utilizador novo
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem("__v39_test_init")) {
        localStorage.setItem("__v39_test_init", "1");
        localStorage.removeItem("bateu_blocos_save");
        localStorage.removeItem("bateu_cidade_perfil");
        localStorage.removeItem("bateu_cidade_missao");
        localStorage.removeItem("bateu_cidade_creditos");
        indexedDB.deleteDatabase("bateu_armazem");
      }
    } catch { /* ignore */ }
  });

  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!(window).__armazem && !!(window).__blocos, null, { timeout: 20000 }).catch(() => {});

  console.log("— A1 · __armazem (roundtrip e quota real)");
  ok("ganchos __armazem registados", await page.evaluate(() => !!(window).__armazem));
  ok("IndexedDB disponível", await page.evaluate(() => (window).__armazem.disponivel() === true));
  const rt = await page.evaluate(async () => {
    const r = await (window).__armazem.definir("teste_v39", { a: 1, b: "x" });
    const lido = await (window).__armazem.obter("teste_v39");
    return { ok: r.ok, onde: r.onde, bytes: r.bytes, ts: lido?.ts, v: lido?.v };
  });
  ok("idbDefinir guarda (ok, no IDB)", rt.ok === true && rt.onde === "idb");
  ok("bytes medidos (não estimados)", typeof rt.bytes === "number" && rt.bytes > 0);
  ok("idbObter devolve envelope {ts, v} intacto", rt.ts > 0 && rt.v?.a === 1 && rt.v?.b === "x");
  const est = await page.evaluate(() => (window).__armazem.estimar());
  ok("estimarEspaco devolve números REAIS ou null honesto",
    est === null || (typeof est.uso === "number" && typeof est.quota === "number" && est.quota > 0));

  console.log("— A2 · guardar() honesto do motor (LS + IDB)");
  await page.evaluate(() => { try { localStorage.removeItem("bateu_blocos_save"); } catch { /* ignore */ } });
  await page.evaluate(() => (window).__blocos.iniciar("sobrevivencia"));
  await page.waitForFunction(() => (window).__blocos.captura()?.fase === "jogando", null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => (window).__blocos.pump(20));
  const posP1 = await page.evaluate(() => { const c = (window).__blocos.captura(); return { x: c.pos[0], y: c.pos[1], z: c.pos[2] }; });
  const resSave = await page.evaluate(() => (window).__blocos.guardar());
  ok("guardar() devolve resultado honesto ok", resSave?.ok === true);
  ok("registo ficou no IDB", resSave?.onde === "idb" && resSave.bytes > 0);
  const noIDB = await page.evaluate(() => (window).__armazem.obter("bateu_blocos_save"));
  ok("bateu_blocos_save no IDB com carimbo ts", !!noIDB && noIDB.ts > 0 && noIDB.v?.v === 3);
  const noLS = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("bateu_blocos_save") || "null"); } catch { return null; } });
  ok("espelho localStorage também escrito", !!noLS && noLS.semente === noIDB.v.semente);

  console.log("— A3 · regra do ts: espelho VELHO nunca ganha ao IDB novo");
  await page.evaluate((p1) => (window).__armazem.obter("bateu_blocos_save").then((e2) => {
    const velho = { ...e2.v, ts: e2.ts - 10 * 60 * 1000, pos: [p1.x + 50, p1.y, p1.z] };
    localStorage.setItem("bateu_blocos_save", JSON.stringify(velho));
  }), posP1);
  await page.reload({ waitUntil: "domcontentloaded" });
  // esperar o BOTÃO (o temSave() do motor resolve antes do re-render do React)
  await page.getByTestId("bc-continuar").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  ok("CONTINUAR aparece (save visível nos dois armazéns)", await page.getByTestId("bc-continuar").isVisible().catch(() => false));
  await page.getByTestId("bc-continuar").click();
  await page.waitForFunction(() => (window).__blocos.captura()?.fase === "jogando", null, { timeout: 30000 }).catch(() => {});
  const posA3 = await page.evaluate(() => { const c = (window).__blocos.captura(); return { x: c.pos[0], z: c.pos[2] }; });
  ok("posição do IDB (novo) venceu o espelho velho", Math.abs(posA3.x - posP1.x) < 2 && Math.abs(posA3.z - posP1.z) < 2);
  ok("posição velha (+50) NÃO foi carregada", Math.abs(posA3.x - (posP1.x + 50)) > 10);

  console.log("— A4 · save SÓ no IDB (localStorage apagado) continua a funcionar");
  await page.evaluate(async () => {
    await (window).__blocos.guardar();
    localStorage.removeItem("bateu_blocos_save");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("bc-continuar").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  ok("CONTINUAR aparece só com o save do IDB", await page.getByTestId("bc-continuar").isVisible().catch(() => false));
  await page.getByTestId("bc-continuar").click();
  await page.waitForFunction(() => (window).__blocos.captura()?.fase === "jogando", null, { timeout: 30000 }).catch(() => {});
  ok("mundo carregou do IDB", await page.evaluate(() => (window).__blocos.captura()?.fase === "jogando"));

  console.log("— A5 · apagar limpa os DOIS armazéns");
  await page.evaluate(() => (window).__blocos.apagarSave());
  await sleep(400);
  const depoisApagar = await page.evaluate(async () => ({
    idb: await (window).__armazem.obter("bateu_blocos_save"),
    ls: localStorage.getItem("bateu_blocos_save"),
    tem: (window).__blocos.temSave(),
  }));
  ok("IDB vazio após apagarSave", depoisApagar.idb === null);
  ok("LS vazio após apagarSave", depoisApagar.ls === null);
  ok("temSave() honesto = false", depoisApagar.tem === false);

  console.log("— A6 · Cidade: progresso recuperado do IDB após limpeza do LS");
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const xpAntes = await page.evaluate(() => {
    const r = (window).__cidade.darXP(150);
    return r.xp;
  });
  ok("XP acumulado antes da limpeza", xpAntes >= 150);
  // esperar o espelho IDB do perfil aterrar (escrita é fire-and-forget)
  await page.waitForFunction(async () => {
    try { return await (window).__armazem?.obter("bateu_cidade_perfil") !== null; } catch { return false; }
  }, null, { timeout: 10000 }).catch(() => {});
  ok("perfil espelhado no IDB", await page.evaluate(async () => !!(await (window).__armazem.obter("bateu_cidade_perfil"))));
  await page.evaluate(() => {
    localStorage.removeItem("bateu_cidade_perfil");
    localStorage.removeItem("bateu_cidade_missao");
    localStorage.removeItem("bateu_cidade_creditos");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => (window).__cidade?.restaurado?.() != null, null, { timeout: 10000 }).catch(() => {});
  const restaurado = await page.evaluate(() => (window).__cidade.restaurado());
  ok("recuperação devolve o que repôs (perfil sim, resto honesto false)",
    !!restaurado && restaurado.perfil === true && restaurado.missao === false && restaurado.creditos === false);
  const xpDepois = await page.evaluate(() => (window).__cidade.perfil().xp);
  ok("XP sobreviveu à limpeza do localStorage", xpDepois === xpAntes);
  ok("zero pageerrors na parte A", erroReal(errosA).length === 0);
  await ctx.close();

  // ══════════ PARTE B — OFFLINE real (build + service worker) ══════════
  console.log("\n═══ B · Offline real (precache do SW, build de produção) ═══");
  let preview = null;
  try {
    if (!existsSync("dist/index.html")) {
      console.log("   ↳ dist/ não existe — a fazer build de produção…");
      await new Promise((res, rej) => {
        const b = spawn("npm", ["run", "build"], { cwd: process.cwd(), stdio: "inherit" });
        b.on("exit", (c) => (c === 0 ? res() : rej(new Error("build falhou"))));
      });
    }
    preview = spawn("npx", ["vite", "preview", "--port", String(PORTA_B), "--strictPort"], { cwd: process.cwd(), stdio: "ignore" });
    let acima = false;
    for (let i = 0; i < 40 && !acima; i++) {
      await sleep(500);
      try { const r = await fetch(BASE_B); acima = r.ok; } catch { /* ainda não */ }
    }
    ok("servidor de preview acima (build de produção)", acima);
    if (!acima) throw new Error("preview não subiu");

    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pgB = await ctxB.newPage();
    const errosB = [];
    pgB.on("pageerror", (e) => errosB.push(String(e)));

    // 1ª visita ONLINE: o SW instala e assume o controlo
    await pgB.goto(`${BASE_B}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await pgB.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30000 }).catch(() => {});
    if (!(await pgB.evaluate(() => navigator.serviceWorker?.controller !== null))) {
      await pgB.reload({ waitUntil: "domcontentloaded" }); // autoUpdate: 2ª carga fica controlada
      await pgB.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30000 }).catch(() => {});
    }
    ok("service worker controla a página", await pgB.evaluate(() => navigator.serviceWorker?.controller !== null));
    const swUrl = await pgB.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || "");
    ok("SW é o workbox do build (sw.js)", swUrl.includes("sw.js"));

    // OFFLINE: cortar a rede e jogar
    await ctxB.setOffline(true);
    await pgB.goto(`${BASE_B}/cidade`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pgB.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    ok("OFFLINE: /cidade abre pelo precache", await pgB.getByTestId("cd-inicio").isVisible().catch(() => false));
    const climaChip = await pgB.getByTestId("cd-clima-inicio").textContent().catch(() => "");
    ok("OFFLINE: clima honesto — NENHUMA temperatura inventada", !/\d+[.,]\d+\s*°/.test(climaChip || ""));
    await pgB.getByTestId("cd-entrar").dispatchEvent("click");
    await pgB.waitForFunction(() => (window).__cidade?.fase() === "jogando", null, { timeout: 25000 }).catch(() => {});
    ok("OFFLINE: fase jogando", await pgB.evaluate(() => (window).__cidade?.fase() === "jogando"));
    const off = await pgB.evaluate(() => { const c = (window).__cidade.captura(); return { chunks: c.chunks, pos: c.pos }; });
    ok("OFFLINE: mundo gerado localmente (chunks > 0)", off.chunks > 0);
    ok("OFFLINE: spawn honesto na praça", Math.abs(off.pos[0] - 0.5) < 2 && Math.abs(off.pos[2] - 6.5) < 2);
    ok("OFFLINE: MP honesto (sem servidor = off)", await pgB.evaluate(() => (window).__cidade.mpEstado() === "off"));
    ok("OFFLINE: zero pageerrors na cidade", erroReal(errosB).length === 0);

    await pgB.goto(`${BASE_B}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    // esperar o React RENDERIZAR (domcontentloaded dispara antes do JS executar)
    await pgB.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 20000 }).catch(() => {});
    const corpo = (await pgB.locator("body").textContent().catch(() => "")) || "";
    ok("OFFLINE: página inicial abre pelo precache", corpo.length > 200);
    ok("OFFLINE: zero pageerrors na home", erroReal(errosB).length === 0);
    await ctxB.close();
  } catch (e) {
    ok("parte B correu até ao fim", false);
    console.log("   ↳ erro:", String(e).slice(0, 200));
  } finally {
    try { preview?.kill(); } catch { /* ignore */ }
  }

  await browser.close();
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  -", f)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
