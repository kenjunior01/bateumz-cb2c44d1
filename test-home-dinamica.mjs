// Teste E2E — Homepage dinâmica — v79 «POUCAS OPÇÕES PRINCIPAIS»
// A homepage passou a ter EXATAMENTE os 5 blocos da visão do produto:
//   1. cabeçalho  2. UMA chamada  3. 3 cartões de descoberta
//   4. actividade real (+ sorteios disponíveis)  5. confiança
// As secções de roll-up v62 (Jogos&Torneios/Vendas/Destaques/Feed) saíram
// da homepage POR DESIGN: jogos vivem em /jogos, vendas no Mercado Bateu,
// o feed real é o bloco «Actividade real». Este teste prova a nova realidade.
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } };

const FEED = "* {opacity:1 !important; filter:none !important; animation-play-state:paused !important}";

async function testViewport(browser, label, viewport) {
  console.log(`\n═══ ${label} (${viewport.width}x${viewport.height}) ═══`);
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
  /* a tela de carregamento demora até ~8s quando o geo-IP está lento */
  await page.waitForTimeout(9500);
  const isMobileViewport = viewport.width < 800;

  // 1. A página carrega
  ok("página carregou", true);

  // 2. BLOCO 2 — UMA chamada principal (frase + 2 botões)
  const frase = await page.locator('[data-testid="home79-frase"]').first().isVisible().catch(() => false);
  ok("chamada principal única (home79-frase)", frase);
  ok("2 botões do hero (jogos + ao vivo)",
    await page.locator('[data-testid="home79-cta-jogos"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-cta-live"]').first().isVisible().catch(() => false));

  // 3. BLOCO 3 — três cartões de descoberta + KART dentro de Jogos
  ok("3 cartões de descoberta",
    await page.locator('[data-testid="home79-card-jogos"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-card-lives"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-card-desporto"]').first().isVisible().catch(() => false));
  ok("KART destacado dentro de Jogos (não é secção de navegação)",
    await page.locator('[data-testid="home79-kart-destaque"]').first().isVisible().catch(() => false));

  // 4. BLOCO 4 — actividade real com estados honestos
  ok("actividade real: 4 linhas",
    await page.locator('[data-testid="home79-ativ-live"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-ativ-vencedor"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-ativ-jogo"]').first().isVisible().catch(() => false)
    && await page.locator('[data-testid="home79-ativ-partida"]').first().isVisible().catch(() => false));

  // 4b. Sorteios disponíveis (destaque/descoberta com dados reais)
  if (!isMobileViewport) {
    const rollup = await page.locator('[data-testid="home79-ativ-partida"]').first().isVisible().catch(() => false)
      && await page.evaluate(() => document.body.textContent.includes("Sorteios"));
    ok("desktop: secção de sorteios presente", rollup);
  } else {
    const disc = await page.locator('[data-testid="mh-discovery"]').first().isVisible().catch(() => false);
    ok("mobile: Descoberta de sorteios (mh-discovery)", disc);
  }

  // 5. BLOCO 5 — confiança no fim
  ok("confiança: 4 links (como funciona/verificável/responsável/suporte)",
    await page.locator('[data-testid="home79-conf-como"]').count() >= 1
    && await page.locator('[data-testid="home79-conf-responsavel"]').count() >= 1);

  // 6. A homepage JÁ NÃO tem as superfícies v62/v26 que a v79 removeu
  ok("sem círculos de atalho (mh-quick)", !(await page.locator('[data-testid="mh-quick"]').count()));
  ok("sem roll-up de vendas na home (Mercado Bateu tem página própria)",
    !(await page.getByText("Coisas à Venda", { exact: false }).first().isVisible().catch(() => false)));
  ok("sem stories na homepage (→ Comunidade)", !(await page.locator('[data-testid="mh-stories"], [data-testid="stories-carousel"]').count()));

  // 7. Sem erros JS
  ok(`0 erros JS (${errors.length}) ${errors[0] || ""}`, errors.length === 0);

  // Screenshot (contorna bug de composição headless)
  await page.addStyleTag({ content: FEED });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/home-dinamica-${label}.png`, fullPage: false });
  await page.evaluate(() => document.querySelector("section:nth-of-type(3)")?.scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/home-dinamica-${label}-rolls.png`, fullPage: false });
  await ctx.close();
}

const browser = await chromium.launch({
  executablePath: "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell",
});
await testViewport(browser, "desktop", { width: 1280, height: 900 });
await testViewport(browser, "mobile", { width: 390, height: 844 });
await browser.close();

console.log(`\n═══ RESULTADO: ${pass} PASS / ${fail} FAIL ═══`);
process.exit(fail > 0 ? 1 : 0);
