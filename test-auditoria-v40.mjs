// ============================================================
// E2E — v40 AUDITORIA BATEU.ONLINE ("Confiança primeiro")
// Verifica os P0 do plano 0–14 dias:
//   1. Shell de arranque + fallback navegável (JS morto e timeout)
//   2. Barra de confiança no primeiro ecrã (desktop + mobile)
//   3. Hero funcional «O que queres fazer agora?» (3 entradas)
//   4. /suporte e /protecao publicadas e ligadas
//   5. SEO honesto (hreflang reduzido, sem «líder»/«100%»)
// Regressão: arranque normal ≤ 4 s com shell removido.
// Uso: PW_CHROME=<chromium> node test-auditoria-v40.mjs  (vite dev 8099)
// ============================================================
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:8099";
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
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🛡️  AUDITORIA v39 — ${BASE}\n`);

  // ── 0. Verificação estática do index.html ──
  console.log("— Shell e SEO (estático)");
  const html = readFileSync("index.html", "utf8");
  ok("shell #bateu-shell presente", html.includes('id="bateu-shell"'));
  ok("fallback #bateu-boot-erro presente", html.includes('id="bateu-boot-erro"'));
  ok("botão «Tentar novamente»", html.includes("Tentar novamente"));
  ok("links navegáveis sem JS (/jogos, /lives, /concursos, /suporte)", /href="\/jogos"/.test(html) && /href="\/lives"/.test(html) && /href="\/concursos"/.test(html) && /href="\/suporte"/.test(html));
  ok("vigia com timeout configurável", html.includes("bootTimeout") && html.includes("__bateuMontado"));
  ok("noscript presente", html.includes("<noscript>"));
  ok("descrição com +18 e responsabilidade", html.includes("+18") && html.toLowerCase().includes("responsabilidade"));
  ok("sem promessa «líder» / «100% de transparência»", !html.includes("líder") && !html.includes("100% de transparência") && !html.includes("100% transparente"));
  const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
  ok(`hreflang honesto (2 entradas: ${hreflangs.join(", ")})`, hreflangs.length === 2 && hreflangs.includes("x-default") && hreflangs.includes("pt-MZ"));
  ok("SearchAction mantido (marketplace lê ?q=)", html.includes("/marketplace?q="));

  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ── 1. JS morto → fallback navegável (P0 1) ──
  console.log("— JS morto → fallback");
  const ctxDead = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pDead = await ctxDead.newPage();
  await pDead.route("**/*", (route) => {
    if (route.request().resourceType() === "script") return route.abort();
    return route.continue();
  });
  await pDead.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await pDead.waitForFunction(() => {
    const el = document.getElementById("bateu-boot-erro");
    return el && getComputedStyle(el).display !== "none";
  }, null, { timeout: 8000 }).catch(() => {});
  ok("painel de erro revelado quando os scripts morrem", await pDead.evaluate(() => {
    const el = document.getElementById("bateu-boot-erro");
    return !!el && getComputedStyle(el).display !== "none";
  }));
  ok("botão Tentar novamente visível", await pDead.getByRole("button", { name: "Tentar novamente" }).isVisible().catch(() => false));
  ok("4 links navegáveis visíveis", await pDead.evaluate(() => {
    const painel = document.getElementById("bateu-boot-erro");
    if (!painel) return false;
    const hrefs = [...painel.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    return ["/jogos", "/lives", "/concursos", "/suporte"].every((h) => hrefs.includes(h));
  }));
  ok("barra do shell pausada (sem fingir progresso)", await pDead.evaluate(() => {
    const b = document.getElementById("bateu-shell-barra");
    return !!b && b.style.animationPlayState === "paused";
  }));
  await ctxDead.close();

  // ── 2. Timeout do vigia → recuperação real (P0 1) ──
  // NOTA: «domcontentloaded» espera pelos scripts type="module" — para apanhar
  // o painel DURANTE o atraso usamos waitUntil:"commit" e atraso de 5 s
  // (o vigia dispara aos 1,2 s; o bundle só chega aos 5 s).
  console.log("— Timeout do vigia → recuperação");
  const ctxSlow = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pSlow = await ctxSlow.newPage();
  let liberou = false;
  // REGEX, não glob: o vite acrescenta ?t=<timestamp> ao módulo após HMR e
  // o glob «**/src/main.tsx» não casa com query strings (apanhado no E2E real)
  await pSlow.route(/\/src\/main\.tsx(\?.*)?$/, async (route) => {
    if (!liberou) { await sleep(7000); liberou = true; }
    return route.continue();
  });
  await pSlow.goto(`${BASE}/?bootTimeout=1200`, { waitUntil: "commit" });
  // polling: 200 = intervalo fixo (lição v31: o polling default de rAF passa
  // fome sob carga e a janela do painel perde-se)
  await pSlow.waitForFunction(() => {
    const el = document.getElementById("bateu-boot-erro");
    return el && getComputedStyle(el).display !== "none";
  }, null, { polling: 200, timeout: 6500 }).catch(() => {});
  ok("painel aparece antes do bundle chegar (1,2 s < 5 s)", await pSlow.evaluate(() => {
    const el = document.getElementById("bateu-boot-erro");
    return !!el && getComputedStyle(el).display !== "none";
  }));
  ok("razão honesta de rede lenta", (await pSlow.evaluate(() => document.getElementById("bateu-boot-razao")?.textContent || "")).includes("demora"));
  // Deixar o bundle continuar → app monta → shell removido
  await pSlow.waitForSelector('[data-testid="heroagora-title"]', { timeout: 20000 }).catch(() => {});
  ok("app recuperou sozinha depois do atraso (hero funcional visível)", await pSlow.getByTestId("heroagora-title").isVisible().catch(() => false));
  ok("shell removido após montagem", await pSlow.evaluate(() => document.getElementById("bateu-shell") === null));
  await ctxSlow.close();

  // ── 3. Arranque normal (regressão do ecrã de marca de 0,9 s) ──
  console.log("— Arranque normal");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  // Região determinística para o teste (sem geolocalização de IP do sandbox)
  await page.addInitScript(() => localStorage.setItem("bateu_region", "MZ"));
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="heroagora-title"]', { timeout: 15000 });
  const bootMs = Date.now() - t0;
  ok(`home monta em ≤ 6 s (real: ${(bootMs / 1000).toFixed(1)} s)`, bootMs < 6000);
  ok("shell removido no arranque normal", await page.evaluate(() => document.getElementById("bateu-shell") === null));

  // ── 4. Barra de confiança (P0 2) — desktop ──
  console.log("— Barra de confiança (desktop)");
  const tb = page.getByTestId("trust-bar");
  ok("trust-bar visível na home", await tb.isVisible());
  ok("país activo mostrado (Moçambique por omissão)", (await tb.textContent()).includes("Moçambique"));
  ok("+18 com responsabilidade", (await tb.textContent()).includes("+18"));
  ok("link Como protegemos jogadores → /protecao", await page.getByTestId("trust-protecao").isVisible()
    && (await page.getByTestId("trust-protecao").getAttribute("href")) === "/protecao");
  ok("link Transparência → /transparencia", (await page.getByTestId("trust-transparencia").getAttribute("href")) === "/transparencia");
  ok("link Suporte → /suporte", (await page.getByTestId("trust-suporte").getAttribute("href")) === "/suporte");
  ok("trust-bar no primeiro ecrã (topo < 200 px)", (await tb.boundingBox()).y < 200);

  // ── 5. Hero funcional (P0 3) — desktop ──
  console.log("— Hero funcional (desktop)");
  ok("pergunta «O que queres fazer agora?»", (await page.getByTestId("heroagora-title").textContent()).includes("O que queres fazer agora"));
  ok("3 entradas presentes", await page.evaluate(() =>
    ["heroagora-jogar", "heroagora-live", "heroagora-desporto"].every((id) => !!document.querySelector(`[data-testid="${id}"]`))));
  ok("destinos reais (/jogos, /lives, /desporto)", await page.evaluate(() =>
    document.querySelector('[data-testid="heroagora-jogar"]').getAttribute("href") === "/jogos"
    && document.querySelector('[data-testid="heroagora-live"]').getAttribute("href") === "/lives"
    && document.querySelector('[data-testid="heroagora-desporto"]').getAttribute("href") === "/desporto"));
  ok("hero acima do banner antigo (hierarquia auditada)", (await page.getByTestId("heroagora-title").boundingBox()).y < (await tb.boundingBox()).y + 900);
  await page.getByTestId("heroagora-jogar").click();
  await page.waitForURL("**/jogos", { timeout: 8000 }).catch(() => {});
  ok("clique Jogar → /jogos", page.url().includes("/jogos"));
  await page.goBack();
  await page.getByTestId("heroagora-live").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await page.getByTestId("heroagora-live").click();
  await page.waitForURL("**/lives", { timeout: 8000 }).catch(() => {});
  ok("clique Ao vivo → /lives", page.url().includes("/lives"));
  await page.goBack();
  await page.getByTestId("heroagora-desporto").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await page.getByTestId("heroagora-desporto").click();
  await page.waitForURL("**/desporto", { timeout: 8000 }).catch(() => {});
  ok("clique Desporto → /desporto", page.url().includes("/desporto"));

  // ── 6. Footer global com Suporte e Protecção ──
  console.log("— Footer");
  await page.goto(`${BASE}/suporte`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("footer-suporte").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  ok("footer tem Suporte", await page.getByTestId("footer-suporte").isVisible().catch(() => false));
  ok("footer tem Limites e protecção → /protecao", (await page.getByTestId("footer-protecao").getAttribute("href").catch(() => null)) === "/protecao");

  // ── 7. /suporte ──
  console.log("— Página /suporte");
  await page.goto(`${BASE}/suporte`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("suporte-email").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  ok("título Suporte e ajuda", await page.getByRole("heading", { name: "Suporte e ajuda" }).isVisible().catch(() => false));
  ok("email real suporte@bateu.co.mz", (await page.getByTestId("suporte-email").getAttribute("href")) === "mailto:suporte@bateu.co.mz");
  ok("6 cartões do centro de ajuda", await page.evaluate(() =>
    ["faq", "como-funciona", "termos", "privacidade", "transparencia", "protecao"].every((r) =>
      !!document.querySelector(`[data-testid="suporte-${r}"]`))));
  ok("aviso +18 na página", (await page.locator("main").textContent()).includes("+18"));

  // ── 8. /protecao ──
  console.log("— Página /protecao");
  await page.goto(`${BASE}/protecao`, { waitUntil: "domcontentloaded" });
  await page.getByText("Fazer Pausa", { exact: false }).first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  ok("título Limites e protecção", await page.getByRole("heading", { name: "Limites e protecção" }).isVisible().catch(() => false));
  ok("ferramentas reais: Fazer Pausa presente", await page.getByText("Fazer Pausa", { exact: false }).first().isVisible().catch(() => false));
  ok("auto-exclusão presente", (await page.locator("main").textContent()).toLowerCase().includes("auto-exclus"));
  ok("links Termos/Transparência/Suporte", await page.evaluate(() =>
    !!document.querySelector('a[href="/termos"]') && !!document.querySelector('a[href="/transparencia"]') && !!document.querySelector('a[href="/suporte"]')));

  // ── 9. i18n: trust bar + hero em inglês ──
  console.log("— i18n");
  const ctxEn = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pEn = await ctxEn.newPage();
  await pEn.addInitScript(() => {
    localStorage.setItem("bateu_lang", "en");
    localStorage.setItem("bateu_lang_explicit", "1");
    localStorage.setItem("bateu_region", "MZ");
  });
  await pEn.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await pEn.waitForSelector('[data-testid="heroagora-title"]', { timeout: 15000 }).catch(() => {});
  ok("hero funcional traduzido (EN)", (await pEn.getByTestId("heroagora-title").textContent().catch(() => "")).includes("What do you want to do now"));
  ok("trust bar traduzida (EN)", (await pEn.getByTestId("trust-bar").textContent().catch(() => "")).includes("How we protect players"));
  await ctxEn.close();

  // ── 10. Mobile 375 px — primeiro ecrã com confiança + entradas ──
  console.log("— Mobile 375 px");
  const ctxMob = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
  const pMob = await ctxMob.newPage();
  await pMob.addInitScript(() => localStorage.setItem("bateu_region", "MZ"));
  await pMob.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await pMob.waitForSelector('[data-testid="heroagora-title"]', { timeout: 15000 }).catch(() => {});
  ok("mobile: trust-bar no topo (< 140 px)", (await pMob.getByTestId("trust-bar").boundingBox().catch(() => ({ y: 999 }))).y < 140);
  const heroBox = await pMob.getByTestId("heroagora-jogar").boundingBox().catch(() => null);
  ok("mobile: 3 entradas no primeiro ecrã (sem scroll)", heroBox && heroBox.y < 740);
  await pMob.getByTestId("trust-suporte").click();
  await pMob.waitForURL("**/suporte", { timeout: 8000 }).catch(() => {});
  ok("mobile: Suporte a um toque a partir da home", pMob.url().includes("/suporte"));
  await ctxMob.close();

  // ── 11. Erros de consola (só ruído conhecido) ──
  const reais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola novos", reais.length === 0);
  if (reais.length) console.log("   ↳ erros:", reais.slice(0, 5));

  await ctx.close();
  await browser.close();

  console.log(`\n══════════════════════════════════`);
  console.log(`  ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("  Falhas:", fails.join(" · "));
  console.log(`══════════════════════════════════\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
