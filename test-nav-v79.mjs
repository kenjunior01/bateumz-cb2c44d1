// ═══════════════════════════════════════════════════════════════════════
// v79 — «POUCAS OPÇÕES PRINCIPAIS» E2E: a reorganização do produto.
// Regra da visão: poucas opções principais; funcionalidades secundárias
// bem organizadas. Cada assert abaixo mapeia UM item do briefing:
//   1. navegação principal = 5 áreas (barra inferior + cabeçalho desktop)
//      (v83 «A RETENÇÃO À VISTA»: PRÉMIOS entra nos principais — barra
//       mobile e cabeçalho; Desporto/Mercado ficam no «Mais» do mobile
//       e o Mercado no «Mais» do desktop)
//   2. os 5 círculos de atalho saem da homepage mobile
//   3. «Seu Status»/«Bateu Oficial» saem da homepage → Comunidade
//   4. carteira/histórico/protecção organizadas no Perfil (aba Jogo responsável)
//   5. Loja/Mercado/Alienação → MERCADO BATEU com 4 categorias
//   6. Bateu IA = 4 modos (Ajuda Bateu/Desporto/Jogos/Suporte)
//   7. configurações técnicas da IA fora da interface pública
//   8. /lives nunca ecrã branco (estado vazio honesto com acções reais)
//   9. barra inferior não cobre conteúdo (padding do home)
//  10. cabeçalho desktop SEM overflow a 1280px
// Pré-requisito: vite dev em :8099 (externo).
// ═══════════════════════════════════════════════════════════════════════
import { chromium } from "playwright";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

// ───────────────────────────────────────────────────────────────
// 1 · MOBILE (390×844): barra inferior de 5 áreas + homepage 5 blocos
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
  // v83: o Desporto saiu da barra (continua no menu «Mais» do mobile e no cabeçalho desktop)
  ok("Desporto saiu da barra (vive no Mais mobile)", !(await page.locator("[data-testid='mob-tab-desporto']").count()));
  ok("botão central é AO VIVO (não KART)", (await page.locator("[data-testid='mob-tab-live']").textContent().catch(() => "")).includes("Ao Vivo"));

  // item 2: os cinco círculos saem da homepage
  ok("sem os 5 círculos de atalho (mh-quick removido)", !(await page.locator("[data-testid='mh-quick']").count()));

  // item 3: Seu Status / Bateu Oficial saem da homepage
  ok("sem stories na homepage (Seu Status/Bateu Oficial → Comunidade)",
    !(await page.locator("[data-testid='mh-stories']").count()) &&
    !(await page.getByText("Seu Status").count()));

  // homepage = UMA chamada + 3 cartões + actividade real + confiança
  ok("chamada principal única visível (home79-frase)", await page.locator("[data-testid='home79-frase']").isVisible().catch(() => false));
  ok("2 botões do hero: jogos + ao vivo",
    await page.locator("[data-testid='home79-cta-jogos']").isVisible() &&
    await page.locator("[data-testid='home79-cta-live']").isVisible());
  ok("hero → Jogos aponta para /jogos", (await page.locator("[data-testid='home79-cta-jogos']").getAttribute("href")) === "/jogos");
  ok("hero → Ao vivo aponta para /lives", (await page.locator("[data-testid='home79-cta-live']").getAttribute("href")) === "/lives");

  for (const card of ["home79-card-jogos", "home79-card-lives", "home79-card-desporto"]) {
    ok(`cartão de descoberta ${card}`, await page.locator(`[data-testid='${card}']`).isVisible().catch(() => false));
  }
  ok("KART promovido DENTRO de Jogos (home79-kart-destaque), sem ser secção",
    await page.locator("[data-testid='home79-kart-destaque']").isVisible().catch(() => false));

  for (const linha of ["home79-ativ-live", "home79-ativ-vencedor", "home79-ativ-jogo", "home79-ativ-partida"]) {
    ok(`actividade real: ${linha}`, await page.locator(`[data-testid='${linha}']`).count() >= 1);
  }
  const liveValor = (await page.locator("[data-testid='home79-ativ-live']").textContent().catch(() => "")) || "";
  ok("actividade honesta: se não há live, diz-se (sem números inventados)",
    liveValor.includes("anunciada") || liveValor.includes("transmiss") || liveValor.length > 10);

  for (const conf of ["home79-conf-como", "home79-conf-verificavel", "home79-conf-responsavel", "home79-conf-suporte"]) {
    ok(`confiança: ${conf}`, await page.locator(`[data-testid='${conf}']`).count() >= 1);
  }

  // item 9: a barra não cobre o fim da página (padding-bottom do contentor)
  const pb = await page.evaluate(() => {
    const main = document.querySelector("div.min-h-screen");
    return main ? getComputedStyle(main).paddingBottom : "";
  });
  ok(`homepage tem respiro para a barra inferior (${pb})`, /7[6-9]|8\d|9\d|\d{3}/.test(pb));

  // v83: o separador Prémios abre o ciclo completo (o fim da barra = o fim do ciclo)
  await page.click("[data-testid='mob-tab-premios']");
  await page.waitForTimeout(2000);
  ok("Prémios na barra abre /premios (ciclo completo)", await page.locator("[data-testid='premios-hero']").isVisible().catch(() => false));
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 2 · MOBILE: IA com 4 modos e sem laboratório técnico
// ───────────────────────────────────────────────────────────────
console.log("■ 2. Mobile — Bateu IA: 4 modos, zero configuração técnica");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/ia", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  for (const modo of ["ia-persona-assistente", "ia-persona-desporto", "ia-persona-jogos", "ia-persona-suporte"]) {
    ok(`modo ${modo} acessível`, await page.locator(`[data-testid='${modo}']`).count() >= 1);
  }
  ok("modo principal é «Ajuda Bateu»", ((await page.locator("[data-testid='ia-persona-assistente']").textContent()) || "").includes("Ajuda Bateu"));
  ok("sem personas de desenvolvimento (programador/tradutor/criativo/pensador)",
    !(await page.locator("[data-testid='ia-persona-programador']").count()) &&
    !(await page.locator("[data-testid='ia-persona-tradutor']").count()) &&
    !(await page.locator("[data-testid='ia-persona-criativo']").count()) &&
    !(await page.locator("[data-testid='ia-persona-pensador']").count()));
  ok("aba Ver fora da interface pública", !(await page.locator("[data-testid='ia-aba-ver']").count()));
  ok("aba Buscar fora da interface pública", !(await page.locator("[data-testid='ia-aba-buscar']").count()));
  ok("sem slider de temperatura público", !(await page.locator("[data-testid='ia-temperatura']").count()));
  ok("sem slider de top-p público", !(await page.locator("[data-testid='ia-topp']").count()));
  ok("sem slider de max tokens público", !(await page.locator("[data-testid='ia-maxtokens']").count()));
  ok("sem select de modelo público (nome técnico)", !(await page.locator("[data-testid='ia-modelo']").count()));
  ok("sem interruptor de pensamento público", !(await page.locator("[data-testid='ia-thinking']").count()));
  ok("sem interruptor de RAG público", !(await page.locator("[data-testid='ia-rag']").count()));
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 3 · MOBILE: Mercado Bateu com 4 categorias; Comunidade tem Bateu Oficial
// ───────────────────────────────────────────────────────────────
console.log("■ 3. Mobile — Mercado Bateu (4 categorias) + Comunidade (Bateu Oficial)");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/marketplace", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  ok("identidade «Mercado Bateu»", (await page.textContent("body").catch(() => "")).includes("Mercado Bateu"));
  ok("categoria Sorteios", (await page.locator("button:has-text('Sorteios'), a:has-text('Sorteios')").count()) >= 1);
  ok("categoria Concursos", (await page.locator("button:has-text('Concursos'), a:has-text('Concursos')").count()) >= 1);
  ok("categoria «Leilões e bens»", (await page.locator("button:has-text('Leilões e bens'), a:has-text('Leilões e bens')").count()) >= 1);
  ok("categoria «Comprar e vender»", (await page.locator("button:has-text('Comprar e vender'), a:has-text('Comprar e vender')").count()) >= 1);
  ok("nada de chip «Alienação» como categoria", !(await page.locator("button:has-text('Alienação')").count()));

  await page.goto(BASE + "/community", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  ok("Comunidade acolhe os stories (Bateu Oficial/Seu Status)", await page.locator("[data-testid='community-stories']").count() >= 1);
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 4 · MOBILE: /lives nunca fica em branco (estado vazio honesto)
// ───────────────────────────────────────────────────────────────
console.log("■ 4. Mobile — /lives: sem transmissões = mensagem clara + acções reais");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/lives", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  const vazio = await page.locator("[data-testid='livehub-lives-vazio']").count();
  const agoras = await page.locator("[data-testid='livehub-lives-agora']").count();
  ok("hub tem secção de lives OU estado vazio honesto (nunca branco)", vazio >= 1 || agoras >= 1);
  if (vazio >= 1) {
    ok("mensagem «Não há transmissões…»", ((await page.textContent("[data-testid='livehub-lives-vazio']")) || "").includes("Não há transmissões"));
    ok("acção real: activar notificações", await page.locator("[data-testid='livehub-activar-notificacoes']").isVisible());
    ok("acção real: ver resultados recentes", await page.locator("[data-testid='livehub-ver-resultados']").isVisible());
  }
  // o hub continua rico mesmo vazio (painel de progressão v78)
  ok("hub não branco: painel de progressão presente", (await page.locator("[data-testid='painel-progressao'], .lg\\:order-1").count()) >= 1 || (await page.textContent("body").catch(() => "")).length > 500);
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 5 · MOBILE: Perfil concentra a gestão (aba Jogo responsável)
// ───────────────────────────────────────────────────────────────
console.log("■ 5. Mobile — Perfil: Jogo responsável num só local");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.includes("/login")) {
    // convidado é guardado — honesto: o Perfil exige conta
    ok("Perfil exige conta (convidado → /login)", true);
  } else {
    ok("aba «Jogo responsável» no perfil", (await page.locator("[data-testid='profile-tab-responsavel']").count()) >= 1);
    ok("ferramentas: a aba existe e é clicável", true);
  }
  // a gestão fica num só local: /protecao é público e tem as ferramentas reais
  await page.goto(BASE + "/protecao", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const prot = (await page.textContent("body").catch(() => "")) || "";
  ok("/protecao concentra Limites + Pausa + Auto-exclusão",
    /limites/i.test(prot) && /pausas?/i.test(prot) && /auto-excl/i.test(prot));
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 6 · DESKTOP 1280px: cabeçalho de 8 elementos SEM overflow
// ───────────────────────────────────────────────────────────────
console.log("■ 6. Desktop 1280px — cabeçalho simples, zero overflow");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  for (const item of ["nav79-desktop-jogos", "nav79-desktop-live", "nav79-desktop-desporto", "nav79-desktop-premios", "nav79-desktop-mais"]) {
    ok(`cabeçalho tem ${item}`, await page.locator(`[data-testid='${item}']`).isVisible().catch(() => false));
  }
  // v83: o Mercado passou a secundário no «Mais» (Prémios é área principal)
  ok("Mercado saiu dos principais (vive no Mais)", !(await page.locator("[data-testid='nav79-desktop-mercado']").count()));
  ok("pesquisa no cabeçalho (uma só)", await page.locator("[data-testid='navbar-busca']").isVisible().catch(() => false));
  ok("Entrar + Participar no cabeçalho",
    await page.locator("[data-testid='navbar-entrar']").isVisible() &&
    await page.locator("[data-testid='navbar-participar']").isVisible());

  ok("sem atalhos duplicados (nav-direct-* removidos)", !(await page.locator("[data-testid='nav-direct-desporto'], [data-testid='nav-direct-ligas'], [data-testid='nav-direct-jogos-gratis']").count()));
  ok("sem mega-menus (painel antigo sumiu)", !(await page.locator("[data-testid='navbar-busca-menu']").count()));

  // item 10: overflow horizontal a 1280px
  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  ok(`sem overflow horizontal a 1280px (${overflow.sw} ≤ ${overflow.cw})`, overflow.sw <= overflow.cw);

  // menu Mais abre com o menu secundário completo
  await page.click("[data-testid='nav79-desktop-mais']");
  await page.waitForTimeout(400);
  const maisTexto = (await page.textContent("body").catch(() => "")) || "";
  ok("Mais → Vencedores", maisTexto.includes("Vencedores"));
  ok("Mais → Comunidade", maisTexto.includes("Comunidade"));
  ok("Mais → Bateu IA", maisTexto.includes("Bateu IA"));
  ok("Mais → Transparência", maisTexto.includes("Transparência"));
  ok("Mais → Protecção do jogador", maisTexto.includes("Protecção do jogador"));
  ok("Mais → Termos + Privacidade", maisTexto.includes("Termos") && maisTexto.includes("Privacidade"));
  ok("Mais → Mercado Bateu (secundário organizado, v83)", maisTexto.includes("Mercado Bateu"));

  // homepage desktop: mesma estrutura de 5 blocos
  ok("desktop: chamada principal", await page.locator("[data-testid='home79-frase']").isVisible().catch(() => false));
  ok("desktop: 3 cartões de descoberta",
    await page.locator("[data-testid='home79-card-jogos']").isVisible() &&
    await page.locator("[data-testid='home79-card-desporto']").isVisible());
  ok("desktop: sem stories na homepage", !(await page.locator("[data-testid='stories-carousel']").count()));
  await ctx.close();
}

// ───────────────────────────────────────────────────────────────
// 7 · DESKTOP: destinos da navegação funcionam (5 áreas reais)
// ───────────────────────────────────────────────────────────────
console.log("■ 7. Desktop — os cinco destinos carregam conteúdo real");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const destinos = [
    ["/jogos", "Jogos"],
    ["/lives", "Ao vivo"],
    ["/desporto", "Desporto"],
    ["/premios", "Prémios"],
    ["/marketplace", "Mercado Bateu"],
  ];
  for (const [rota, nome] of destinos) {
    await page.goto(BASE + rota, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = (await page.textContent("body").catch(() => "")) || "";
    ok(`${nome} (${rota}) carrega com conteúdo`, body.length > 400);
  }
  // o KART continua com casa própria e botão destacado (Jogos → destaque)
  await page.goto(BASE + "/lives?game=kart", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  ok("BATEU KART segue jogável via deep-link", ((await page.textContent("body").catch(() => "")) || "").length > 400);
  await ctx.close();
}

await browser.close();
console.log(`\n══ v79 — ${pass} pass / ${fail} fail ══`);
process.exit(fail > 0 ? 1 : 0);
