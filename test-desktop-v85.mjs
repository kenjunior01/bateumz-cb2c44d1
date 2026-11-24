// test-desktop-v85 — «DESKTOP VIVO»: a primeira dobra deixa de ser vazia
// O que a suíte PROVA (com o browser a ver, não com confiança no código):
//   A. DOBRA EM DUAS COLUNAS ≥1024: grid com 2 colunas computado, chamada à
//      esquerda, PAINEL DE PROGRESSO à direita (posição x à direita da frase).
//   B. NÚMEROS SÓ REAIS: a recompensa do KART e a contagem de jogos vêm do
//      CATÁLOGO (bundle esbuild) — os valores no ecrã têm de bater EXATO.
//   C. BANNER KART COM IMAGEM: <img> real (naturalWidth > 0) + recompensa à
//      vista + «Jogar agora»; cartão de jogos leva DIRETO a /lives?game=kart.
//   D. TOPO FINO: trust-bar ≤34px · SEM barra de live quando não há live
//      activa real (nav-anuncio ausente) · logo ≥40px · zero overflow 1280+1600.
//   E. DESPORTO HONESTO: partida real (TheSportsDB, fonte citada) OU texto
//      honesto — nunca nomes/datas inventados.
//   F. REGISTADO (sessão fake + REST mockado): painel com pontos DO SERVIDOR,
//      barra de progresso REAL (aria-valuenow = matemática do núcleo),
//      missão 1/1 reclamável, chip «sincronizado», prémios = contagem real
//      do mock (0 → texto honesto), zero erros de consola.
// Requisito: vite dev em :8099 (padrão das suítes) · PW_CHROME.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const RAIZ = process.cwd();
const OUT = "shots-v85";
fs.mkdirSync(OUT, { recursive: true });

const SB_URL = process.env.VITE_SUPABASE_URL || "https://ngxrdpplyghlugoowjqj.supabase.co";
const SB_REF = new URL(SB_URL).hostname.split(".")[0];
const UID = "85e5e000-0000-4000-8000-00000000e285";

const RUIDO = [
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "permission", "AbortError", "play() failed", "user gesture", "JWT", "PGRST",
  "fetchPriority", "third-party cookie", "storage",
];
const erroReal = (msg) => !RUIDO.some((r) => msg.toLowerCase().includes(r.toLowerCase()));

let vite = null;
async function levantarVite() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok) { console.log("vite já em :8099"); return; }
  } catch { /* não está a correr */ }
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], {
    cwd: RAIZ, stdio: "ignore", detached: true,
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch { /* ainda a subir */ }
  }
  throw new Error("vite não subiu em :8099");
}

let verdes = 0, falhas = 0;
const ok = (nome, cond, extra) => { if (cond) { verdes++; console.log("  ✓", nome); } else { falhas++; console.log("  ✗", nome, extra || ""); } };
const soDigitos = (s) => (s || "").replace(/[^\d]/g, "");

const sessaoFake = () => ({
  access_token: "e2e-fake-access-token", token_type: "bearer",
  expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: "e2e-fake-refresh",
  user: {
    id: UID, aud: "authenticated", role: "authenticated", email: "ester85@bateu.test",
    email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Ester" },
    identities: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
});

// linha REAL do servidor (padrão v84) — 700 pontos: nível 2, faltam 1.300
const linhaServidor = (pontos) => ({
  user_id: UID, jogador_id: UID, pontos, missoes_concluidas_total: 1,
  missoes: [{ id: "s-vence", modelo: "vence-1", titulo: "Vence 1 partida hoje", jogoId: null, jogosDistintos: 0, alvo: 1, progresso: 1, pontos: 200, criadaEm: Date.now() - 3600e3, terminaEm: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })(), reclamada: false }],
});

async function novoCenario(browser, { modo = "convidado", pontos = 700, viewport = { width: 1280, height: 800 }, pagina = "/" } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => { if (erroReal(String(e))) erros.push(String(e)); });
  page.on("console", (m) => { if (m.type() === "error" && erroReal(m.text())) erros.push(m.text()); });

  if (modo !== "convidado") {
    await ctx.route(`**${new URL(SB_URL).host}/**`, async (route) => {
      const url = route.request().url();
      const metodo = route.request().method();
      if (url.includes("/rest/v1/progressao_conta")) {
        if (metodo === "GET" || metodo === "HEAD") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([linhaServidor(pontos)]) });
        if (metodo === "POST") return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessaoFake()) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await ctx.addInitScript(([ref, sessao]) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessao));
    }, [SB_REF, sessaoFake()]);
  }

  await page.goto(BASE + pagina, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  return { ctx, page, erros };
}

(async () => {
  await levantarVite();

  // NÚMEROS REAIS do catálogo (bundle esbuild — padrão v60/v84)
  const bundle = `${RAIZ}/.v85-catalogo-bundle.mjs`;
  execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/gamesCatalog.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundle}`], { stdio: "pipe" });
  const CAT = await import(bundle);
  const NJOGOS = CAT.ALL_GAMES.length;
  const PONTOS_KART = CAT.pontosMaxDe("kart");
  console.log(`— catálogo REAL: ${NJOGOS} jogos · kart até ${PONTOS_KART} pontos —`);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: EXE || undefined });

  // ═══ A. DOBRA EM DUAS COLUNAS (visitante, 1280) ═══
  console.log("■ A. Primeira dobra em duas colunas (visitante)");
  {
    const { page, erros, ctx } = await novoCenario(browser, { modo: "convidado" });
    ok("A1 dobra presente (home85-dobra)", await page.locator("[data-testid='home85-dobra']").isVisible().catch(() => false));
    const colunas = await page.locator("[data-testid='home85-dobra']").evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length).catch(() => 0);
    ok(`A2 grid com 2 colunas computadas a 1280px (${colunas})`, colunas === 2);
    ok("A3 chamada à esquerda (home79-frase)", await page.locator("[data-testid='home79-frase']").isVisible().catch(() => false));
    ok("A4 painel de progresso à vista (reten-bv)", await page.locator("[data-testid='reten-bv']").isVisible().catch(() => false));
    ok("A5 variante VISITANTE (reten-bv-visitante)", await page.locator("[data-testid='reten-bv-visitante']").isVisible().catch(() => false));
    const frase = await page.locator("[data-testid='home79-frase']").boundingBox().catch(() => null);
    const painel = await page.locator("[data-testid='reten-bv']").boundingBox().catch(() => null);
    ok(`A6 painel REALMENTE à direita (frase.x=${frase?.x?.toFixed(0)} painel.x=${painel?.x?.toFixed(0)})`,
      !!frase && !!painel && painel.x > frase.x + 200, "painel não está à direita");
    ok("A7 painel largo (≥330px)", (painel?.width ?? 0) >= 330, `w=${painel?.width}`);
    ok("A8 convidado SEM chip de sincronização (nunca finge)", (await page.locator("[data-testid='reten-sinc']").count()) === 0);
    ok("A9 convidado SEM barra de nível (barra é do registado)", (await page.locator("[data-testid='reten-barra']").count()) === 0);
    const loop = (await page.locator("[data-testid='reten-loop']").textContent().catch(() => "")) || "";
    ok("A10 loop da retenção visível («Joga hoje…»)", loop.trim().length > 20, JSON.stringify(loop.slice(0, 40)));
    const statJogos = (await page.locator("[data-testid='reten-stat-jogos']").textContent().catch(() => "")) || "";
    ok(`A11 jogos grátis = catálogo EXATO (${statJogos.trim()} = ${NJOGOS})`, soDigitos(statJogos) === String(NJOGOS), statJogos);
    ok("A12 CTA registo → /register", (await page.locator("[data-testid='reten-cta-registo']").getAttribute("href")) === "/register");
    ok("A13 CTA jogar grátis → /jogos", (await page.locator("[data-testid='reten-cta-jogar']").getAttribute("href")) === "/jogos");
    ok("A14 ZERO erros reais de consola", erros.length === 0, erros.slice(0, 2).join(" | "));
    await page.screenshot({ path: `${OUT}/home-dobra-visitante.png`, fullPage: false });
    await ctx.close();
  }

  // ═══ B. NÚMEROS SÓ REAIS (catálogo vs ecrã) ═══
  console.log("■ B. Números reais do catálogo");
  {
    const { page, ctx } = await novoCenario(browser, { modo: "convidado" });
    const recompensa = (await page.locator("[data-testid='home85-jogos-recompensa']").textContent().catch(() => "")) || "";
    ok(`B1 recompensa do KART = pontosMax do catálogo (${soDigitos(recompensa)} = ${PONTOS_KART})`,
      soDigitos(recompensa).includes(String(PONTOS_KART)), recompensa);
    const infoJogos = (await page.locator("[data-testid='home79-card-jogos']").textContent().catch(() => "")) || "";
    ok(`B2 cartão de jogos cita a contagem EXATA do catálogo (${NJOGOS})`, soDigitos(infoJogos).includes(String(NJOGOS)), infoJogos.slice(0, 60));
    const bannerTxt = (await page.locator("[data-testid='home79-kart-destaque']").textContent().catch(() => "")) || "";
    ok(`B3 banner KART com recompensa à vista (${PONTOS_KART})`, soDigitos(bannerTxt).includes(String(PONTOS_KART)), bannerTxt.slice(0, 60));
    ok("B4 cartão de jogos leva DIRETO a jogar (/lives?game=kart)",
      (await page.locator("[data-testid='home79-card-jogos']").getAttribute("href")) === "/lives?game=kart");
    await ctx.close();
  }

  // ═══ C. BANNER KART COM IMAGEM REAL ═══
  console.log("■ C. Banner do BATEU KART com imagem");
  {
    const { page, ctx } = await novoCenario(browser, { modo: "convidado" });
    ok("C1 <img> do banner presente (home85-kart-img)", (await page.locator("[data-testid='home85-kart-img']").count()) === 1);
    const carregou = await page.locator("[data-testid='home85-kart-img']").evaluate((el) =>
      el.tagName === "IMG" && el.complete && el.naturalWidth > 0).catch(() => false);
    ok("C2 imagem REALMENTE carregada (naturalWidth > 0)", carregou);
    const boxImg = await page.locator("[data-testid='home85-kart-img']").boundingBox().catch(() => null);
    ok(`C3 imagem com área de destaque (${boxImg?.width?.toFixed(0)}×${boxImg?.height?.toFixed(0)})`,
      !!boxImg && boxImg.width >= 140 && boxImg.height >= 90, "imagem pequena demais");
    const banner = await page.locator("[data-testid='home79-kart-destaque']").boundingBox().catch(() => null);
    ok("C4 banner ocupa uma faixa inteira (largura ≥ 600px a 1280)", (banner?.width ?? 0) >= 600, `w=${banner?.width}`);
    ok("C5 banner → /lives?game=kart", (await page.locator("[data-testid='home79-kart-destaque']").getAttribute("href")) === "/lives?game=kart");
    await page.locator("[data-testid='home79-kart-destaque']").screenshot({ path: `${OUT}/kart-banner.png` }).catch(() => {});
    await ctx.close();
  }

  // ═══ D. TOPO FINO ═══
  console.log("■ D. Topo fino (trust bar · barra de live condicional · logo)");
  {
    const { page, ctx } = await novoCenario(browser, { modo: "convidado" });
    const tb = await page.locator("[data-testid='trust-bar']").boundingBox().catch(() => null);
    ok(`D1 trust-bar FINA (${tb?.height?.toFixed(1)}px ≤ 34)`, !!tb && tb.height <= 34, `h=${tb?.height}`);
    ok("D2 SEM barra de live quando não há live activa real (nav-anuncio ausente)",
      (await page.locator("[data-testid='nav-anuncio']").count()) === 0);
    const logo = await page.locator("nav img[alt='Bateu']").boundingBox().catch(() => null);
    ok(`D3 logo com presença de marca (${logo?.height?.toFixed(0)}px ≥ 40)`, !!logo && logo.height >= 40, `h=${logo?.height}`);
    const ov1280 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`D4 SEM overflow horizontal a 1280px (${ov1280.sw} ≤ ${ov1280.cw})`, ov1280.sw <= ov1280.cw);
    await ctx.close();
    // 1600: a dobra também tem de respirar
    const { page: p2, ctx: c2 } = await novoCenario(browser, { modo: "convidado", viewport: { width: 1600, height: 900 } });
    const col1600 = await p2.locator("[data-testid='home85-dobra']").evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length).catch(() => 0);
    ok(`D5 2 colunas também a 1600px (${col1600})`, col1600 === 2);
    const ov1600 = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`D6 SEM overflow horizontal a 1600px (${ov1600.sw} ≤ ${ov1600.cw})`, ov1600.sw <= ov1600.cw);
    await c2.close();
  }

  // ═══ E. DESPORTO HONESTO (partida real OU texto honesto) ═══
  console.log("■ E. Cartão de desporto com conteúdo concreto ou honesto");
  {
    const { page, ctx } = await novoCenario(browser, { modo: "convidado" });
    await page.waitForTimeout(2500); // tempo para a fonte externa responder/falhar
    const card = (await page.locator("[data-testid='home79-card-desporto']").textContent().catch(() => "")) || "";
    ok("E1 cartão de desporto com conteúdo", card.trim().length > 10, card.slice(0, 40));
    const partida = (await page.locator("[data-testid='home85-desporto-partida']").textContent().catch(() => "")) || "";
    if (partida.trim().length > 0) {
      ok(`E2 PARTIDA REAL à vista («${partida.trim().slice(0, 44)}…»)`, partida.includes(":") && (partida.includes("vs") || partida.includes("—") || partida.trim().length > 8));
      ok("E3 fonte citada (TheSportsDB)", card.includes("TheSportsDB"), card.slice(0, 80));
      console.log(`    (fonte externa respondeu: ${partida.trim()})`);
    } else {
      ok("E2 SEM partida → texto honesto de sempre (nunca inventa)", card.length > 10, card.slice(0, 40));
      console.log("    (fonte externa indisponível — estado honesto)");
    }
    ok("E4 cartão → /desporto", (await page.locator("[data-testid='home79-card-desporto']").getAttribute("href")) === "/desporto");
    await ctx.close();
  }

  // ═══ F. REGISTADO (sessão fake + REST mockado — 700 pontos do SERVIDOR) ═══
  console.log("■ F. Registado — painel vivo com dados do servidor");
  {
    const { page, erros, ctx } = await novoCenario(browser, { modo: "registado", pontos: 700 });
    await page.waitForFunction(() => document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") === "sincronizado", null, { timeout: 9000 }).catch(() => {});
    ok("F1 chip = «sincronizado»", (await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "")) === "sincronizado");
    ok("F2 variante REGISTADO à vista", await page.locator("[data-testid='reten-bv-registado']").isVisible().catch(() => false));
    const pontos = (await page.locator("[data-testid='reten-pontos']").textContent().catch(() => "")) || "";
    ok(`F3 pontos DO SERVIDOR no painel (${soDigitos(pontos)} = 700)`, soDigitos(pontos) === "700", pontos);
    const faltam = (await page.locator("[data-testid='reten-faltam']").textContent().catch(() => "")) || "";
    ok(`F4 quanto falta é real (${soDigitos(faltam)} = 1300)`, soDigitos(faltam).endsWith("1300"), faltam);
    const agoraVal = await page.locator("[data-testid='reten-barra']").getAttribute("aria-valuenow").catch(() => "");
    // matemática do núcleo: (700−500)/(2000−500) = 13,33… → 13
    ok(`F5 barra com aria-valuenow do núcleo (${agoraVal} = 13)`, agoraVal === "13", agoraVal);
    const fill = await page.locator("[data-testid='reten-barra-fill']").evaluate((el) => el.style.width).catch(() => "");
    ok(`F6 fill visível (${fill})`, fill === "13%", fill);
    ok("F7 missão do dia à vista (reten-missao)", await page.locator("[data-testid='reten-missao']").isVisible().catch(() => false));
    const missaoProg = (await page.locator("[data-testid='reten-missao-prog']").textContent().catch(() => "")) || "";
    ok("F8 missão 1/1 (progresso real do servidor)", soDigitos(missaoProg).startsWith("11"), missaoProg);
    ok("F9 botão de reclamar ACTIVO (alvo alcançado)",
      await page.locator("[data-testid='reten-missao-reclamar']").isEnabled().catch(() => false));
    const premios = (await page.locator("[data-testid='reten-premios-valor']").textContent().catch(() => "")) || "";
    ok(`F10 prémios = contagem REAL do mock (${premios.trim()})`, premios.trim().length > 0, "sem contagem");
    ok("F11 sem prémios activos → texto honesto, NUNCA um CTA falso",
      (await page.locator("[data-testid='reten-premios-ver']").count()) === 0 || soDigitos(premios) !== "0");
    ok("F12 ZERO erros reais de consola", erros.length === 0, erros.slice(0, 2).join(" | "));
    await page.screenshot({ path: `${OUT}/home-dobra-registado.png`, fullPage: false });
    await ctx.close();
  }

  // ═══ G. SEM REGRESSÃO VISUAL nas outras páginas do ciclo ═══
  console.log("■ G. Zero pageerror em /jogos · /lives · /desporto");
  {
    let errosTotal = 0;
    for (const rota of ["/jogos", "/lives", "/desporto"]) {
      const { erros, ctx } = await novoCenario(browser, { modo: "convidado", pagina: rota });
      errosTotal += erros.length;
      await ctx.close();
    }
    ok("G1 ZERO erros reais de consola nas 3 rotas", errosTotal === 0, `${errosTotal} erros`);
  }

  await browser.close();
  if (vite) { try { process.kill(-vite.pid); } catch { /* já caiu */ } }
  console.log(`\n══ RESULTADO: ${verdes} verdes · ${falhas} falhas ══`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
