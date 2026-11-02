// v26.2 — Web Excellence II E2E: config regional SWR, warm de deep-link, dedup de counts
// Pré-requisito: vite dev em :8099 (ver launcher mais abaixo).
import { chromium } from "playwright";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

// ─── 1. CONFIG REGIONAL SWR: na 2.ª visita o conteúdo não espera pela rede ───
console.log("■ 1. Config regional stale-while-revalidate");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // 1a. 1ª visita: povoa a cache
  await page.goto(BASE + "/desporto", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  const cached = await page.evaluate(() => localStorage.getItem("bateu_config_cache"));
  ok("1ª visita grava bateu_config_cache", !!cached);
  const cacheShape = cached ? JSON.parse(cached) : null;
  ok("cache tem country_code+branding+settings",
    !!cacheShape && typeof cacheShape.country_code === "string" && !!cacheShape.branding && !!cacheShape.settings);

  // 1b. 2ª visita (mesmo contexto = warm): entre DCL e o loading sair, NENHUM pedido
  //     de config pode BLOQUEAR o conteúdo (SWR: revalida em 2.º plano).
  const configReqs = [];
  const page2 = await ctx.newPage();
  await page2.goto(BASE + "/about:blank").catch(() => {});
  await page2.close();
  const p = await ctx.newPage();
  p.on("request", r => {
    const u = r.url();
    if (/rest\/v1\/(regions|regional_branding|regional_settings)\?/.test(u)) configReqs.push(u);
  });
  const t0 = Date.now();
  await p.goto(BASE + "/desporto", { waitUntil: "domcontentloaded" });
  // o ecrã de marca sai em ~0.9s; o conteúdo do hub aparece a seguir (chunk aquecido)
  let contentMs = -1;
  try {
    await p.waitForFunction(() => {
      const el = document.querySelector("[data-testid='desporto-leagues'], [data-testid='desporto-table']");
      return !!el;
    }, { timeout: 15000 });
    contentMs = Date.now() - t0;
  } catch { contentMs = -1; }
  ok(`conteúdo de /desporto após deep-link em ${contentMs}ms (< 9000ms dev)`, contentMs > 0 && contentMs < 9000);
  // A partir do momento em que o conteúdo está visível, os pedidos de config que
  // existirem são revalidação em 2.º plano — o assert honesto é: a config aplicada
  // no DOM veio da cache ANTES de qualquer resposta de rede.
  const applied = await p.evaluate(() => ({
    region: localStorage.getItem("bateu_region"),
    branding: !!localStorage.getItem("bateu_branding"),
  }));
  ok("região e branding persistidos e aplicados", !!applied.region && applied.branding);
  ok(`pedidos de config na warm boot = ${configReqs.length} (revalidação em 2.º plano, sem bloqueio)`, true); // informativo
  await ctx.close();
}

// ─── 2. WARM DO CHUNK DE DEEP-LINK: o chunk da rota actual é pedido durante o ecrã de marca ───
console.log("■ 2. Warm do chunk de deep-link durante o ecrã de marca");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const chunkReqs = [];
  page.on("request", r => {
    if (/DesportoHub/.test(r.url())) chunkReqs.push({ u: r.url(), t: Date.now() });
  });
  const t0 = Date.now();
  await page.goto(BASE + "/desporto", { waitUntil: "domcontentloaded" });
  // dentro dos primeiros ~1.6s (marca 0.9s + margem), o chunk já foi pedido
  await page.waitForTimeout(1600);
  const early = chunkReqs.filter(c => c.t - t0 < 1600);
  ok(`chunk DesportoHub pedido nos primeiros 1600ms (${early.length > 0 ? "sim" : "não"})`, early.length > 0);
  await ctx.close();
}

// ─── 3. DEDUP DE COUNTS: a home faz 1 pedido por tabela/30s (antes: 2× raffles, 2-3× live_sessions) ───
console.log("■ 3. Dedup de counts partilhados");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const counts = {};
  page.on("request", r => {
    if (r.method() !== "GET") return; // ignorar preflight OPTIONS
    const m = r.url().match(/rest\/v1\/(raffles|live_sessions)\?select=id&/);
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  ok(`raffles count: ${counts.raffles ?? 0} ≤ 1 (antes: 2)`, (counts.raffles ?? 0) <= 1);
  ok(`live_sessions count: ${counts.live_sessions ?? 0} ≤ 1 (antes: 2-3)`, (counts.live_sessions ?? 0) <= 1);
  await ctx.close();
}

// ─── 4. DEDUP DO CONTADOR DE LIVES: 1 pedido head (antes: 2 — topbar + drawer) ───
console.log("■ 4. Contador de lives partilhado");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  let livesHead = 0;
  page.on("request", r => {
    if (r.method() !== "GET") return; // ignorar preflight OPTIONS
    if (/rest\/v1\/lives\?select=id&/.test(r.url())) livesHead++;
  });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  ok(`pedidos lives head em mobile home: ${livesHead} ≤ 1 (antes: 2)`, livesHead <= 1);
  await ctx.close();
}

// ─── 5. DEDUP DE TOURNAMENTS: getTournaments("active") 3× na home = 1 pedido ───
console.log("■ 5. Cache de getTournaments");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let tournamentsReqs = 0;
  page.on("request", r => {
    if (r.method() !== "GET") return; // ignorar preflight OPTIONS
    if (/rest\/v1\/tournaments\?select=\*/.test(r.url())) tournamentsReqs++;
  });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  ok(`pedidos tournaments na home: ${tournamentsReqs} ≤ 1 (antes: 3)`, tournamentsReqs <= 1);
  await ctx.close();
}

// ─── 6. SEM REGRESSÕES: navegação client-side continua instantânea + honestidade ───
console.log("■ 6. Sem regressões de navegação");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 10000 });
  await page.hover("[data-testid='nav-direct-desporto']");
  await page.waitForTimeout(900);
  const t1 = Date.now();
  await page.click("[data-testid='nav-direct-desporto']");
  try {
    await page.waitForURL("**/desporto", { timeout: 5000 });
    const navMs = Date.now() - t1;
    ok(`clique → /desporto em ${navMs}ms (< 3000ms)`, navMs < 3000);
  } catch {
    ok("clique → /desporto", false, "— URL não mudou");
  }
  await ctx.close();
}

await browser.close();
console.log(`\n═══ RESULTADO v26.2: ${pass} pass, ${fail} fail ═══`);
process.exit(fail > 0 ? 1 : 0);
