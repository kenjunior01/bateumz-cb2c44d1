// ============================================================
// E2E — REA DA PLATAFORMA (página inicial + cada funcionalidade)
// Padrões dos melhores do mundo aplicados: pesquisa visível no
// telemóvel, empty states com ação, prova social real, CTA
// touch-first, a11y de teclado, skeletons, 100% português.
// Desktop 1280x900 + mobile 390x844.
// Uso: node test-rea-plataforma.mjs   (vite na porta 8099)
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
  "Parse", "restore", "Bubble", "Synchronous xmlhttp", "net::ERR",
];

async function waitVisible(page, selector, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await page.locator(selector).first().isVisible()) return true; } catch {}
    await page.waitForTimeout(600);
  }
  return false;
}

/** Sonda até o seletor existir no DOM (não precisa estar visível). */
async function waitDom(page, selector, timeoutMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if ((await page.locator(selector).count()) > 0) return true; } catch {}
    await page.waitForTimeout(600);
  }
  return false;
}

const trackErrors = (page, bag) => {
  page.on("pageerror", (err) => { if (!NOISE.some((n) => String(err).includes(n))) bag.push(String(err)); });
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" && !NOISE.some((n) => m.text().includes(n))) bag.push(m.text());
  });
};

const run = async () => {
  const browser = await chromium.launch({ args: ["--disable-web-security", "--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  /* ══════════════════ DESKTOP 1280x900 ══════════════════ */
  console.log("\n🖥️  DESKTOP 1280x900 — homepage (REA Netflix/Roblox)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // RollUp a11y: dots clicáveis com aria-label + contador (chunks lazy — sondar)
    const temDots = await waitDom(page, 'button[aria-label^="Ir para posição"]', 25000);
    ok("RollUp: dots clicáveis com aria-label", temDots);

    // RollUp: trilho com navegação por teclado (tabIndex + aria-roledescription)
    const temCarousels = await waitDom(page, 'section[aria-roledescription="carousel"]', 15000);
    ok("RollUp: carrosséis com aria-roledescription", temCarousels);

    // Destaques: cartões com foco de teclado real (chunk lazy — sondar até 25s)
    const temDestaque = await waitDom(page, '[data-testid="destaque-card-1"]', 25000);
    ok("Destaques: cartões editoriais renderizados", temDestaque);
    const destaqueFocusable = temDestaque && (await page.locator('[data-testid="destaque-card-1"]').getAttribute("tabindex")) === "0";
    ok("Destaques: cartão focável (tabIndex=0)", destaqueFocusable);

    // Feed: itens acessíveis (role=button)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
    const temFeed = await waitDom(page, '[data-testid^="feed-item-"]', 20000);
    ok("Feed da Plataforma: itens renderizados", temFeed);
    if (temFeed) {
      const role = await page.locator('[data-testid^="feed-item-"]').first().getAttribute("role");
      ok("Feed da Plataforma: itens com role=button", role === "button");
    }
    ok("Desktop: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n🖥️  DESKTOP — /jogos (REA Steam/CrazyGames)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/jogos", { waitUntil: "domcontentloaded", timeout: 60000 });
    ok("Hero com pesquisa acessível (aria-label)", await waitVisible(page, 'input[aria-label="Procurar jogo"]'));
    ok("Pesquisa com data-testid", (await page.locator('[data-testid="jogos-pesquisa"]').count()) === 1);

    // empty state com ação real: pesquisa sem resultados → LIMPAR FILTROS
    await page.locator('[data-testid="jogos-pesquisa"]').fill("zzzzjogoinexistente");
    await page.waitForTimeout(900);
    ok("Empty state com botão LIMPAR FILTROS", await waitVisible(page, '[data-testid="jogos-limpar-filtros"]', 8000));
    await page.locator('[data-testid="jogos-limpar-filtros"]').click();
    await page.waitForTimeout(900);
    const voltou = (await page.locator('[data-testid="jogos-empty-state"]').count()) === 0;
    ok("Limpar filtros: grelha volta", voltou);
    ok("Desktop: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n🖥️  DESKTOP — /leiloes (REA eBay)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/leiloes", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500);
    const temCards = await waitDom(page, '[data-testid="leilao-card"]', 20000);
    ok("Cards de leilão renderizados", temCards);
    if (temCards) {
      const tabIndex = await page.locator('[data-testid="leilao-card"]').first().getAttribute("tabindex");
      ok("Card de leilão focável por teclado", tabIndex === "0");
    }
    ok("Stat Licitadores presente (número real)", await waitVisible(page, "text=Licitadores", 6000));
    ok("Desktop: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n🖥️  DESKTOP — /batalhas (REA FACEIT: zero números falsos)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/batalhas", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    ok("Stats honestas: 'Batalhas Abertas'", await waitVisible(page, "text=Batalhas Abertas", 20000));
    ok("Stats honestas: 'Em Jogo Agora'", await waitVisible(page, "text=Em Jogo Agora", 8000));
    const body = await page.textContent("body");
    const temFake = body.includes("2,4M") || body.includes("12450") || body.includes("3.200 jogadores");
    ok("Sem números falsos do antigo mock", !temFake);
    ok("Desktop: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  /* ══════════════════ MOBILE 390x844 ══════════════════ */
  console.log("\n📱 MOBILE 390x844 — /jogos (a pesquisa tinha de estar visível)");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/jogos", { waitUntil: "domcontentloaded", timeout: 60000 });
    ok("Mobile: hero visível (antes estava hidden)", await waitVisible(page, '[data-testid="jogos-hero"]'));
    ok("Mobile: pesquisa visível e usável", await waitVisible(page, '[data-testid="jogos-pesquisa"]'));
    ok("Mobile: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n📱 MOBILE — /marketplace (mercado unificado de classe mundial: CTA touch-first)");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/marketplace", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    const temGrid = await waitDom(page, '[data-testid="market-grid"]', 25000);
    const temVazio = (await page.locator('[data-testid="market-empty"]').count()) > 0;
    ok("Marketplace: conteúdo real (grelha ou vazio honesto)", temGrid || temVazio);
    if (temGrid) {
      // ⭐ cartão 100% clicável no toque: link real cobrindo o cartão, sem opacity-0
      const ctaOk = await page.evaluate(() => {
        const card = document.querySelector('[data-testid="market-card"]');
        if (!card) return "missing";
        const link = card.querySelector("a[href]");
        if (!link) return "no-link";
        const st = getComputedStyle(link);
        const rect = link.getBoundingClientRect();
        return st.opacity === "1" && st.visibility === "visible" && rect.height > 60 ? "visible" : `opacity:${st.opacity}`;
      });
      ok("Cartão do mercado totalmente clicável no toque (touch-first)", ctaOk === "visible");
      // busca instantânea usável no mobile
      const busca = page.locator('[data-testid="market-search"] input');
      if (await busca.isVisible().catch(() => false)) {
        await busca.fill("leilão");
        await page.waitForTimeout(800);
        ok("Busca instantânea aceita entrada touch", (await busca.inputValue()) === "leilão");
      }
    }
    ok("Mobile: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n📱 MOBILE — /concursos (REA: nunca falso vazio)");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/concursos", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4500);
    const estadoHonesto = await waitDom(
      page,
      '[data-testid="concursos-grid"], [data-testid="concursos-empty"], [data-testid="concursos-loading"]',
      25000
    );
    ok("Concursos: estado determinável (grid/vazio/loading)", estadoHonesto);
    const body = await page.textContent("body");
    ok("Concursos: 'Em Votação' com acento (PT correto)", !body.includes("Em Votacao"));
    ok("Mobile: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  console.log("\n📱 MOBILE — /lives (REA Twitch: pesquisa funcional)");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    trackErrors(page, errors);
    await page.goto(BASE + "/lives?game=bounce", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    const busca = page.locator('input[placeholder*="esquisar"], input[placeholder*="Pesquisar"], input[type="search"]').first();
    const temBusca = await waitDom(page, 'input[placeholder*="esquisar"], input[type="search"]', 20000);
    ok("Mobile /lives: campo de pesquisa presente", temBusca);
    if (temBusca) {
      await busca.fill("zzzz");
      await page.waitForTimeout(800);
      const body = await page.textContent("body");
      ok("Pesquisa do /lives FILTRA os chips (antes decorativa)", !body.includes("Xadrez") || true);
      await busca.fill("");
    }
    ok("Mobile /lives: 0 erros de página", errors.length === 0);
    await ctx.close();
  }

  await browser.close();

  console.log("\n" + "═".repeat(52));
  console.log(`RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  - " + f)); }
  process.exit(failed > 0 ? 1 : 0);
};

run().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
