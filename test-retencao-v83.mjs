// ═══════════════════════════════════════════════════════════════════════
// v83 — «A RETENÇÃO À VISTA» E2E (fatia 4 da visão de retenção)
// Visão: «Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios. Prémios dão motivo para regressar.»
// A v78 construiu o ciclo, a v79 tornou-o VISÍVEL no hub e na página
// Prémios — esta fatia traz o ciclo às SUPERFÍCIES DE ENTRADA:
//   1. barra mobile fecha o ciclo: Prémios é separador principal
//      (Desporto e Mercado continuam alcançáveis no «Mais» do mobile)
//   2. cabeçalho desktop: Prémios nos principais; Mercado no «Mais»
//   3. homepage mostra a PROGRESSÃO: visitante vê o que muda com a
//      conta (honesto, sem pressão); registado vê Olá + nível +
//      missão do dia + torneio + desbloqueios (BoasVindasRetencao)
//   4. o núcleo continua honesto: painel v78 com missões reais e as
//      4 carteiras SEPARADAS (Pontos ≠ Bilhetes ≠ Prémios ≠ Saldo)
// Regra da casa: ZERO números inventados — com estado novo, o ciclo
// mostra 0 pontos e «Faltam 500 para Explorador» (limiar REAL do
// núcleo), nunca contadores falsos.
// Pré-requisito: vite dev em :8099 (externo). Uso:
//   PW_CHROME=… node test-retencao-v83.mjs
// ═══════════════════════════════════════════════════════════════════════
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

// ───────────────────────────────────────────────────────────────
// 1 · MOBILE (390×844): a barra inferior fecha o ciclo
// ───────────────────────────────────────────────────────────────
console.log("■ 1. Mobile — barra inferior = Início | Jogos | [Ao vivo] | Prémios | Perfil");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  for (const tab of ["mob-tab-home", "mob-tab-jogos", "mob-tab-live", "mob-tab-premios", "mob-tab-profile"]) {
    ok(`barra inferior tem ${tab}`, await page.locator(`[data-testid='${tab}']`).isVisible().catch(() => false));
  }
  ok("Desporto saiu da barra (continua no Mais mobile + cabeçalho desktop)",
    !(await page.locator("[data-testid='mob-tab-desporto']").count()));

  // o «Mais» do mobile mantém Desporto e Mercado alcançáveis (fonte: drawer)
  const drawerFonte = readFileSync("src/components/mobile/MobileMenuDrawer.tsx", "utf-8");
  ok("drawer mobile mantém Desporto", drawerFonte.includes('"/desporto"'));
  ok("drawer mobile mantém Mercado", drawerFonte.includes('"/marketplace"'));
  ok("drawer mobile ganhou Prémios (v83)", drawerFonte.includes('"/premios"'));

  // o fim da barra é o fim do ciclo: Prémios abre a página do ciclo
  await page.click("[data-testid='mob-tab-premios']");
  await page.waitForTimeout(2000);
  ok("Prémios abre /premios (ciclo completo)", await page.locator("[data-testid='premios-hero']").isVisible().catch(() => false));
  ok("/premios mostra as 4 carteiras separadas", await page.locator("[data-testid='premios-carteiras']").isVisible().catch(() => false));
  ok("/premios mostra os 5 níveis (limiares reais)", (await page.locator("[data-testid='premios-niveis'] [data-testid^='premios-nivel-']").count()) === 5);
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 2 · MOBILE: homepage mostra a progressão — variante VISITANTE
// ───────────────────────────────────────────────────────────────
console.log("■ 2. Mobile — boas-vindas do VISITANTE (honesto, sem pressão)");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  ok("bloco de retenção presente (reten-bv)", await page.locator("[data-testid='reten-bv']").isVisible().catch(() => false));
  ok("visitante vê o que muda com a conta (reten-bv-visitante)",
    await page.locator("[data-testid='reten-bv-visitante']").isVisible().catch(() => false));
  ok("variante registada NÃO aparece a convidados",
    !(await page.locator("[data-testid='reten-bv-registado']").count()));
  ok("CTA de registo aponta para /register",
    (await page.locator("[data-testid='reten-cta-registo']").getAttribute("href")) === "/register");

  // a chamada principal e os 3 cartões continuam intactos (nada foi trocado por spam)
  ok("chamada principal continua (home79-frase)", await page.locator("[data-testid='home79-frase']").isVisible().catch(() => false));
  ok("3 cartões de descoberta intactos",
    await page.locator("[data-testid='home79-card-jogos']").isVisible() &&
    await page.locator("[data-testid='home79-card-lives']").isVisible() &&
    await page.locator("[data-testid='home79-card-desporto']").isVisible());
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 3 · DESKTOP (1280px): cabeçalho = Jogos · Ao vivo · Desporto · Prémios
// ───────────────────────────────────────────────────────────────
console.log("■ 3. Desktop — Prémios nos principais; Mercado no «Mais»");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  for (const item of ["nav79-desktop-jogos", "nav79-desktop-live", "nav79-desktop-desporto", "nav79-desktop-premios"]) {
    ok(`cabeçalho tem ${item}`, await page.locator(`[data-testid='${item}']`).isVisible().catch(() => false));
  }
  ok("Mercado saiu dos principais", !(await page.locator("[data-testid='nav79-desktop-mercado']").count()));

  // sem overflow (a troca não pode encher o cabeçalho)
  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  ok(`sem overflow horizontal a 1280px (${overflow.sw} ≤ ${overflow.cw})`, overflow.sw <= overflow.cw);

  // o principal Prémios abre o ciclo
  await page.click("[data-testid='nav79-desktop-premios']");
  await page.waitForTimeout(2000);
  ok("Prémios nos principais abre /premios", await page.locator("[data-testid='premios-hero']").isVisible().catch(() => false));

  // o «Mais» acolhe o Mercado (secundário organizado)
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.click("[data-testid='nav79-desktop-mais']");
  await page.waitForTimeout(400);
  const maisTexto = (await page.textContent("body").catch(() => "")) || "";
  ok("Mais → Mercado Bateu", maisTexto.includes("Mercado Bateu"));
  ok("Mais → Bateu IA", maisTexto.includes("Bateu IA"));
  ok("Mais → Transparência", maisTexto.includes("Transparência"));
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 4 · NÚCLEO HONESTO CONTINUA: painel v78 com missões reais + 4 carteiras
// ───────────────────────────────────────────────────────────────
console.log("■ 4. Hub — o núcleo da progressão segue à vista e honesto");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/lives", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  ok("painel de progressão presente (painel-progressao)", await page.locator("[data-testid='painel-progressao']").isVisible().catch(() => false));
  ok("missões do dia geradas pelo núcleo (progressao-missoes)",
    (await page.locator("[data-testid='progressao-missoes']").count()) >= 1);
  const prog = (await page.locator("[data-testid='progressao-missoes']").textContent().catch(() => "")) || "";
  ok("missão mostra progresso real (n/alvo)", /\d\/\d/.test(prog), prog.slice(0, 80));

  // estado NOVO = 0 pontos (nunca um número inventado)
  const pontos = (await page.locator("[data-testid='progressao-pontos']").textContent().catch(() => "")) || "";
  ok("estado novo mostra 0 pontos (zero números inventados)", pontos.trim().startsWith("0"), pontos);

  // 4 carteiras separadas, SEMPRE com valores de fonte própria
  const carteiras = (await page.locator("[data-testid='progressao-carteiras']").textContent().catch(() => "")) || "";
  ok("carteiras separadas: Pontos", carteiras.includes("Pontos"));
  ok("carteiras separadas: Bilhetes", carteiras.includes("Bilhetes"));
  ok("carteiras separadas: Prémios", carteiras.includes("Prémios"));
  ok("carteiras separadas: Saldo (MZN)", carteiras.includes("Saldo") && carteiras.includes("MZN"));

  // mensagem honesta ao convidado (o progresso fica no aparelho)
  ok("convidado: mensagem honesta do aparelho", (await page.locator("[data-testid='progressao-convidado']").count()) >= 1);
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 5 · PERFIL: gestão continua concentrada (convidado → /login honesto)
// ───────────────────────────────────────────────────────────────
console.log("■ 5. Perfil — a gestão exige conta; /protecao segue pública");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  ok("Perfil exige conta (convidado → /login)", page.url().includes("/login"));

  await page.goto(BASE + "/protecao", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const prot = (await page.textContent("body").catch(() => "")) || "";
  ok("/protecao continua com Limites + Pausa + Auto-exclusão",
    /limites/i.test(prot) && /pausas?/i.test(prot) && /auto-excl/i.test(prot));
  await ctx.close();
}

await browser.close();
console.log(`\n══ v83 — ${pass} pass / ${fail} fail ══`);
process.exit(fail > 0 ? 1 : 0);
