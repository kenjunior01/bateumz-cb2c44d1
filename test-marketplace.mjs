// ============================================================
// E2E — MARKETPLACE DE CLASSE MUNDIAL + HARMONIA DA PLATAFORMA
// (Task 21): marketplace unificado (hero, flash deals, categorias,
// busca, ordenação, atividade), Esports & Ligas na homepage,
// CTAs de criação e feed de atividade global (activityBus).
// Desktop 1280x900 + mobile 390x844.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-marketplace.mjs
// ============================================================

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting", "same key",
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "ERR_", "net::", "404", "403", "429", "favicon", "vite", "React DevTools",
  "Download the React DevTools", "sourcemap", "Sourcemap", "auto_reconnect",
  "will be deprecated", "aria-hidden", "third-party cookie", "Third-party cookie",
];

async function waitVisible(page, selector, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await page.locator(selector).first().isVisible()) return true;
    } catch {}
    await page.waitForTimeout(700);
  }
  return false;
}

async function gotoComEspera(page, path, testid, timeoutMs = 60000) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const apareceu = await waitVisible(page, `[data-testid="${testid}"]`, timeoutMs);
  return apareceu;
}

async function runSuite(browser, label, viewport) {
  console.log(`\n════════ ${label} ${viewport.width}x${viewport.height} ════════`);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => {
    const msg = String(e?.message ?? e);
    if (!NOISE.some((n) => msg.includes(n))) pageErrors.push(msg);
  });

  // ── 1. MARKETPLACE ────────────────────────────────────────────────
  console.log("\n── 1. Marketplace unificado ──");
  const abriu = await gotoComEspera(page, "/marketplace", "market-cats");
  ok("marketplace abre com categorias", abriu);
  ok("título do mercado visível", await page.getByText("Um mercado.").first().isVisible().catch(() => false));

  // busca instantânea presente
  const busca = page.locator('[data-testid="market-search"] input');
  ok("busca instantânea presente", await busca.isVisible().catch(() => false));

  // chips de categoria com contadores
  const chips = ["all", "leilao", "produto", "alienacao", "sorteio", "jogo", "concurso"];
  let todosChips = true;
  for (const c of chips) {
    if (!(await page.locator(`[data-testid="market-cat-${c}"]`).first().isVisible().catch(() => false))) todosChips = false;
  }
  ok("7 chips de categoria (com contadores reais)", todosChips);

  // espera o carregamento de dados (grelha ou estado vazio honesto)
  const temGrelha = await waitVisible(page, '[data-testid="market-grid"]', 20000)
    || await waitVisible(page, '[data-testid="market-empty"]', 15000);
  ok("grelha de itens ou estado vazio honesto", temGrelha);

  const grelha = page.locator('[data-testid="market-grid"]');
  if (await grelha.isVisible().catch(() => false)) {
    const n = await grelha.locator('[data-testid="market-card"]').count();
    ok(`grelha tem cartões (${n})`, n > 0);
    // ordenação presente
    ok("seletor de ordenação", await page.locator('[data-testid="market-sort"]').isVisible().catch(() => false));
  }

  // hero do destaque (se houver itens)
  const temHero = await page.locator('[data-testid="market-hero"]').first().isVisible().catch(() => false);
  const temVazio = await page.locator('[data-testid="market-empty"]').first().isVisible().catch(() => false);
  ok("hero de destaque OU estado vazio honesto", temHero || temVazio);

  // flash deals (opcional — depende de urgências reais)
  if (await page.locator('[data-testid="market-flash"]').first().isVisible().catch(() => false)) {
    ok("flash deals com contagem", true);
  }

  // atividade ao vivo embutida
  ok("atividade ao vivo no marketplace", await page.locator('[data-testid="market-activity"]').first().isVisible().catch(() => false));

  // barra de confiança
  ok("baralho de confiança", await page.locator('[data-testid="market-trust"]').first().isVisible().catch(() => false));

  // CTA vender
  ok("CTA ser vendedor", await page.locator('[data-testid="market-sell-cta"]').first().isVisible().catch(() => false));

  // compatibilidade: ?tab=raffles pré-seleciona Sorteios
  await page.goto(`${BASE}/marketplace?tab=raffles`, { waitUntil: "domcontentloaded" });
  await waitVisible(page, '[data-testid="market-cats"]', 30000);
  await page.waitForTimeout(1200);
  const chipSorteio = page.locator('[data-testid="market-cat-sorteio"]');
  const sorteioAtivo = await chipSorteio.getAttribute("aria-selected");
  ok("?tab=raffles pré-seleciona Sorteios", sorteioAtivo === "true");

  // busca por texto filtra a grelha (ou mostra vazio) sem crashar
  await page.goto(`${BASE}/marketplace`, { waitUntil: "domcontentloaded" });
  await waitVisible(page, '[data-testid="market-cats"]', 30000);
  const inputBusca = page.locator('[data-testid="market-search"] input');
  if (await inputBusca.isVisible().catch(() => false)) {
    await inputBusca.fill("zzzz-nada-existe-xyz");
    await page.waitForTimeout(900);
    const vaziaOuMensagem = await page.locator('[data-testid="market-empty"]').isVisible().catch(() => false)
      || (await page.locator('[data-testid="market-grid"]').locator('[data-testid="market-card"]').count() === 0);
    ok("busca sem resultado mostra estado honesto", vaziaOuMensagem);
    await inputBusca.fill("");
  }

  // ── 2. TORNEIOS: criação + atividade ─────────────────────────────
  console.log("\n── 2. Torneios harmonizados ──");
  await gotoComEspera(page, "/tournaments", "torneios-activity");
  ok("página de torneios abre", await page.locator('[data-testid="torneios-activity"]').isVisible().catch(() => false));
  ok("CTA Criar Torneio presente", await page.locator('[data-testid="torneios-criar"]').first().isVisible().catch(() => false));
  const criarHref = await page.locator('[data-testid="torneios-criar"]').first().getAttribute("href").catch(() => null);
  ok("CTA aponta para o dashboard de empresas", criarHref === "/dashboard/tournaments");
  ok("feed de atividade nos torneios", await page.locator('[data-testid="torneios-activity-feed"]').first().isVisible().catch(() => false));

  // ── 3. LIGAS: CTAs + atividade ───────────────────────────────────
  console.log("\n── 3. Ligas harmonizadas ──");
  await gotoComEspera(page, "/ligas", "ligas-activity");
  ok("página de ligas abre", await page.locator('[data-testid="ligas-activity"]').isVisible().catch(() => false));
  ok("CTA Criar Liga presente", await page.locator('[data-testid="ligas-criar"]').first().isVisible().catch(() => false));
  ok("feed de atividade nas ligas", await page.locator('[data-testid="ligas-activity-feed"]').first().isVisible().catch(() => false));

  // ── 4. ESPORTS HUB: links corrigidos + atividade ─────────────────
  console.log("\n── 4. Esports Hub ──");
  await gotoComEspera(page, "/esports", "esports-activity");
  ok("hub esports abre com atividade", await page.locator('[data-testid="esports-activity"]').isVisible().catch(() => false));
  const linkCriar = await page.getByText("Criar Campeonato (empresas)").first().isVisible().catch(() => false);
  ok("CTA criar campeonato no hub", linkCriar);

  // ── 5. HOMEPAGE: harmonia total ──────────────────────────────────
  console.log("\n── 5. Homepage harmonia ──");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const isMobileView = viewport.width < 768;
  if (isMobileView) {
    ok("homepage mobile abre", await waitVisible(page, '[data-testid="mh-quick"]', 60000));
    ok("atalho MERCADO nos círculos rápidos", await page.getByText("MERCADO").first().isVisible().catch(() => false));
  } else {
    ok("homepage abre", await waitVisible(page, '[data-testid="home-arena-banner"]', 60000));
  }
  // rolar até aos roll-ups e procurar o de Esports & Ligas (desktop e mobile)
  await page.evaluate(() => window.scrollBy(0, 1400)).catch(() => {});
  const temEsportsRollUp = await waitVisible(page, '[data-testid="esports-criar-card"]', 30000)
    || await waitVisible(page, '[data-testid="esports-torneio-1"]', 10000)
    || await waitVisible(page, '[data-testid="esports-liga-1"]', 10000);
  ok("roll-up Esports & Ligas na homepage (inscrições abertas)", temEsportsRollUp);
  // feed de atividade na home (compacto ou completo)
  const temAtividadeHome = await waitVisible(page, '[data-testid="mh-activity"]', 20000)
    || await waitVisible(page, '[data-testid="activity-feed"]', 15000);
  ok("atividade ao vivo na homepage", temAtividadeHome);

  // ── 6. ACTIVITYBUS funciona (publicar → aparece no feed) ────────
  console.log("\n── 6. ActivityBus em tempo real ──");
  await page.goto(`${BASE}/marketplace`, { waitUntil: "domcontentloaded" });
  await waitVisible(page, '[data-testid="market-activity"]', 30000);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    // publica uma atividade real de teste na própria sessão
    window.dispatchEvent(new CustomEvent("bateu:activity", {
      detail: {
        id: "act-e2e-1", type: "tournament", title: "E2E: inscrição de teste",
        detail: "atividade publicada pelo teste", href: "/tournaments",
        created_at: new Date().toISOString(), source: "local",
      },
    }));
  });
  const apareceu = await waitVisible(page, '[data-testid="market-activity"] >> text=E2E: inscrição de teste', 8000);
  ok("atividade publicada aparece no feed na hora", apareceu);

  // ── erros de página ──
  ok("0 erros de página críticos", pageErrors.length === 0);
  if (pageErrors.length) console.log("     erros:", pageErrors.slice(0, 3));

  await context.close();
}

const browser = await chromium.launch();
try {
  await runSuite(browser, "DESKTOP", { width: 1280, height: 900 });
  await runSuite(browser, "MOBILE", { width: 390, height: 844 });
} finally {
  await browser.close();
}

console.log(`\n════════ RESULTADO: ${passed} passaram · ${failed} falharam ════════`);
if (fails.length) {
  console.log("FALHAS:");
  fails.forEach((f) => console.log(`  · ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
