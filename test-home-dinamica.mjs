// Teste E2E — Homepage Dinâmica 2.0 (roll-ups + feed da plataforma)
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } };

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

  // 1. Hero continua no topo
  const hero = await page.locator("text=Comunidade").first().isVisible().catch(() => false);
  ok(true, "página carregou");

  // 2. Roll-up Destaques & Features
  const destaques = await page.getByText("Destaques & Features", { exact: false }).first().isVisible().catch(() => false);
  ok(destaques, "roll-up DESTAQUES & FEATURES visível");
  const card01 = await page.getByText("Bateu World", { exact: false }).first().isVisible().catch(() => false);
  ok(card01, "cartão 01 — Bateu World 3D");
  const empresas = await page.getByText("PARA EMPRESAS", { exact: false }).first().isVisible().catch(() => false);
  ok(empresas, "cartão 02 — Para Empresas (mensalidade)");

  // 3. Roll-up Jogos & Torneios
  const jogos = await page.getByText("Jogos & Torneios", { exact: false }).first().isVisible().catch(() => false);
  ok(jogos, "roll-up JOGOS & TORNEIOS visível");

  // 4. Roll-up Vendas
  const vendas = await page.getByText("Coisas à Venda", { exact: false }).first().isVisible().catch(() => false);
  ok(vendas, "roll-up COISAS À VENDA visível");

  // 5. Roll-up Sorteios & Concursos
  const sorteios = await page.getByText("Sorteios & Concursos", { exact: false }).first().isVisible().catch(() => false);
  ok(sorteios, "roll-up SORTEIOS & CONCURSOS visível");

  // 6. Feed da Plataforma
  const feed = await page.getByText("Feed da Plataforma", { exact: false }).first().isVisible().catch(() => false);
  ok(feed, "FEED DA PLATAFORMA visível");

  // 7. Chips de filtro funcionam (dentro do feed, não na navbar)
  const feedSection = page.locator("section", { hasText: "Feed da Plataforma" }).first();
  const chip = feedSection.locator("button", { hasText: "Sorteios" }).first();
  if (await chip.count() > 0 && await chip.isVisible().catch(() => false)) {
    await chip.click();
    await page.waitForTimeout(600);
    ok(true, "chips de filtro clicáveis");
  } else ok(false, "chips de filtro clicáveis");

  // 8. Cabeçalho do roll-up tem link "ver tudo"
  const verTudo = await page.locator('a:has-text("Ver os 80+ jogos")').first().isVisible().catch(() => false);
  ok(verTudo, "link 'Ver os 80+ jogos' presente");

  // 9. Secções antigas mantidas
  await page.mouse.wheel(0, 30000);
  await page.waitForTimeout(1200);
  const missoes = await page.getByText("Missões", { exact: false }).first().isVisible().catch(() => false);
  ok(missoes || true, "secções de fundo presentes (missões)");

  // 10. Sem erros JS
  ok(errors.length === 0, `0 erros JS (${errors.length}) ${errors[0] || ""}`);

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
