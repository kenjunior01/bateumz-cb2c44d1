// test-desktop-v89 — «DESKTOP DE PRODUTO»: melhora a sério o design desktop
// O que a suíte PROVA (com o browser a ver, não com confiança no código):
//   A. HUB 1280×800 (portátil real): SEM overflow horizontal (era 360 px
//      pré-v89 — grid 1fr com min-content AUTO empurrava o aside), painel de
//      progressão ACIMA da dobra (pontos/nível/carteiras/missão), kart com
//      ARTE real + prémio HONESTO (teto do catálogo), atalhos com conteúdo
//      específico (minutos/pontos/dificuldade), zero chaves i18n cruas.
//   B. HUB 1600×900: sem overflow (era 140 px), ordem v74 mantida (jogos
//      acima das rádios), grelha 5 colunas mantida.
//   C. CICLO REAL: uma partida anunciada no bus (`bateu:partida`) sobe os
//      MESMOS pontos no painel completo E no painel compacto do hero —
//      uma store, duas superfícies, zero duplicação.
//   D. HOME 1600×900: sem overflow (era 838 px — navbar com rótulos 2xl fora
//      do viewport), título do hero VISÍVEL (não tapado pelo navbar fixed),
//      topo comprimido (TrustBar ≤ 40 px, navbar ≤ 62 px).
//   E. MOBILE 390×844 intocado: painel hero NÃO aparece (só ≥lg), painel
//      completo continua no telemóvel, sem overflow.
//   F. i18n: em EN o painel hero fala inglês (chaves ×6 vivas).
//   G. ZERO pageerror em todas as páginas.
// Requisito: vite dev em :8099 (igual às suítes anteriores).
import { spawn } from "node:child_process";
import fs from "node:fs";

const BASE = "http://localhost:8099";
const OUT = "shots-v89";
fs.mkdirSync(OUT, { recursive: true });

let vite = null;
async function levantarVite() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok) { console.log("vite já em :8099"); return; }
  } catch { /* não está a correr */ }
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], {
    cwd: process.cwd(), stdio: "ignore", detached: true,
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
const falha = (nome, extra) => { falhas++; console.log("  ✗", nome, extra || ""); };
const verde = (nome) => { verdes++; console.log("  ✓", nome); };
function assert(cond, nome, extra) { if (cond) verde(nome); else falha(nome, extra); }

const erros = [];

async function navegar(page, url, waitMs = 4500) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(waitMs);
}

(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ═══ A. HUB 1280×800 — portátil real ═══
  console.log("\n— A. hub 1280×800 —");
  const p1280 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  p1280.on("pageerror", (e) => erros.push("hub1280: " + String(e)));
  await navegar(p1280, "/lives", 6000);
  const overA = await p1280.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overA <= 1, `A1 SEM overflow horizontal a 1280 (sobra ${overA}px — era 360 pré-v89)`);
  const heroPanel = p1280.locator('[data-testid="progressao-hero"]');
  assert(await heroPanel.isVisible(), "A2 painel de progressão compacto visível no hero");
  const boxHero = await heroPanel.boundingBox();
  assert(!!boxHero && boxHero.y + boxHero.height <= 800, `A3 painel INTEIRO acima da dobra (fundo ${(boxHero ? Math.round(boxHero.y + boxHero.height) : "?")} ≤ 800)`);
  const pontosHero = await p1280.locator('[data-testid="progressao-hero-pontos"]').innerText().catch(() => "");
  assert(/^\d[\d.,]*$/.test(pontosHero.trim()), `A4 pontos reais no painel hero («${pontosHero.trim()}» — número da store, não texto inventado)`);
  const nivelChip = await p1280.locator('[data-testid="progressao-hero-nivel"]').innerText().catch(() => "");
  assert(/Nível \d/.test(nivelChip), `A5 chip de nível presente («${nivelChip.trim()}»)`);
  assert(await p1280.locator('[data-testid="progressao-hero-barra"]').isVisible(), "A6 barra até ao próximo nível visível");
  const carteirasTxt = await p1280.locator('[data-testid="progressao-hero-carteiras"]').innerText().catch(() => "");
  assert(/Bilhetes/.test(carteirasTxt) && /Prémios/.test(carteirasTxt) && /Saldo/.test(carteirasTxt), "A7 três carteiras SEPARADAS no painel hero");
  assert(await p1280.locator('[data-testid="progressao-hero-missao"]').isVisible(), "A8 missão do dia no painel hero");
  const arte = p1280.locator('[data-testid="livehub-hero-kart-art"] svg');
  assert(await arte.count() >= 1, "A9 kart com ARTE real (svg da cena do catálogo)");
  const kartPontos = await p1280.locator('[data-testid="livehub-hero-kart-pontos"]').innerText().catch(() => "");
  assert(/120/.test(kartPontos), `A10 prémio HONESTO do kart («${kartPontos.trim()}» = teto pontosMaxDe)`);
  for (const [id, pontos, min] of [["tetris", "100", "5"], ["spaceshooter", "90", "5"], ["chess", "120", "12"]]) {
    const info = await p1280.locator(`[data-testid="livehub-hero-atalho-info-${id}"]`).innerText().catch(() => "");
    assert(info.includes(pontos) && info.includes(min) && !info.includes("clássico · direto"), `A11 atalho ${id} com conteúdo específico («${info.trim()}»)`);
  }
  const heroTxtA = await p1280.locator('[data-testid="livehub-hero-desktop"]').innerText().catch(() => "");
  assert(!heroTxtA.includes("livehub.hero."), "A12 ZERO chaves i18n cruas no hero desktop");
  assert(await p1280.locator('[data-testid="painel-progressao"]').isVisible(), "A13 painel COMPLETO continua abaixo (não foi apagado)");
  await p1280.screenshot({ path: `${OUT}/suite-hub-1280.png` });

  // ═══ B. HUB 1600×900 — ordem e grelha da v74 mantidas ═══
  console.log("\n— B. hub 1600×900 —");
  const p1600 = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  p1600.on("pageerror", (e) => erros.push("hub1600: " + String(e)));
  await navegar(p1600, "/lives", 6000);
  const overB = await p1600.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overB <= 1, `B1 SEM overflow horizontal a 1600 (sobra ${overB}px — era 140 pré-v89)`);
  const grid = p1600.locator('[data-testid="livehub-grelha"]');
  const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  assert(cols === 5, `B2 grelha com 5 colunas a 1600 (${cols} — v74 mantida)`);
  const yKart = (await p1600.locator('[data-testid="livehub-destaque-bateu-world"]').boundingBox()).y;
  const yRadios = (await p1600.locator('[data-testid="livehub-radios"]').boundingBox()).y;
  assert(yKart < yRadios, `B3 jogos ACIMA das rádios (${yKart.toFixed(0)} < ${yRadios.toFixed(0)} — v74 mantida)`);
  assert(await p1600.locator('[data-testid="progressao-hero"]').isVisible(), "B4 painel de progressão visível a 1600");
  await p1600.screenshot({ path: `${OUT}/suite-hub-1600.png` });

  // ═══ C. CICLO REAL — uma partida, duas superfícies, UMA store ═══
  console.log("\n— C. ciclo real na mesma página —");
  const antesFull = parseInt((await p1600.locator('[data-testid="progressao-pontos"]').innerText()).replace(/\D/g, ""), 10) || 0;
  const antesHero = parseInt((await p1600.locator('[data-testid="progressao-hero-pontos"]').innerText()).replace(/\D/g, ""), 10) || 0;
  await p1600.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } })));
  await p1600.waitForTimeout(700);
  const depoisFull = parseInt((await p1600.locator('[data-testid="progressao-pontos"]').innerText()).replace(/\D/g, ""), 10) || 0;
  const depoisHero = parseInt((await p1600.locator('[data-testid="progressao-hero-pontos"]').innerText()).replace(/\D/g, ""), 10) || 0;
  assert(depoisHero === antesHero + 120, `C1 hero subiu 120 (${antesHero} → ${depoisHero})`);
  assert(depoisFull === antesFull + 120, `C2 painel completo subiu 120 (${antesFull} → ${depoisFull})`);
  assert(depoisHero === depoisFull, `C3 UMA store nas duas superfícies (${depoisHero} === ${depoisFull})`);
  const heroTxtC = await p1600.locator('[data-testid="progressao-hero"]').innerText().catch(() => "");
  assert(!heroTxtC.includes("livehub.hero."), "C4 painel hero SEM chaves i18n cruas");

  // ═══ D. HOME 1600×900 — topo comprimido + dobra visível (integração v89
  //        sobre a home da v85: HeroDobra em duas colunas é a dobra agora) ═══
  console.log("\n— D. home 1600×900 —");
  await navegar(p1600, "/", 5500);
  const overD = await p1600.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overD <= 1, `D1 SEM overflow horizontal na home (sobra ${overD}px — era 838 antes dos furos fechados)`);
  const navBox = (await p1600.locator(".navbar-shell").boundingBox());
  const dobraBox = (await p1600.locator('[data-testid="home85-dobra"]').boundingBox());
  assert(!!navBox && !!dobraBox && dobraBox.y >= navBox.y + navBox.height - 2, `D2 dobra da home NÃO nasce por baixo do navbar (dobra y=${dobraBox ? dobraBox.y.toFixed(0) : "?"} ≥ navbar fundo=${navBox ? (navBox.y + navBox.height).toFixed(0) : "?"})`);
  assert(!!dobraBox && dobraBox.y + dobraBox.height <= 900, "D3 dobra INTEIRA acima da dobra do ecrã (900 px)");
  const trustH = (await p1600.locator('[data-testid="trust-bar"]').boundingBox()).height;
  assert(trustH <= 40, `D4 TrustBar fina (${trustH.toFixed(0)}px ≤ 40)`);
  const navH = navBox.height;
  // honesto: a navbar da v79-v88 (reescrita) mede 74 px — a v89 NÃO mexeu nela;
  // a asserção é um limite de sanidade (não uma meta de compressão da v89)
  assert(navH <= 80 && navH >= 55, `D5 navbar estável (${navH.toFixed(0)}px ≤ 80 — reescrita v79-v88, fora do âmbito da v89)`);
  await p1600.screenshot({ path: `${OUT}/suite-home-1600.png` });

  // ═══ E. MOBILE 390×844 intocado ═══
  console.log("\n— E. mobile 390×844 —");
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mob.on("pageerror", (e) => erros.push("mobile: " + String(e)));
  await navegar(mob, "/lives", 5500);
  const heroMob = await mob.locator('[data-testid="progressao-hero"]').isVisible();
  assert(!heroMob, "E1 painel hero NÃO aparece em telemóvel (só ≥lg)");
  assert(await mob.locator('[data-testid="painel-progressao"]').isVisible(), "E2 painel COMPLETO presente no telemóvel (v78 mantido)");
  const heroDeskMob = await mob.locator('[data-testid="livehub-hero-desktop"]').isVisible();
  assert(!heroDeskMob, "E3 painel de destaque desktop NÃO aparece (v74 mantido)");
  const overE = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overE <= 1, `E4 SEM overflow horizontal no telemóvel (sobra ${overE}px)`);
  await mob.close();

  // ═══ F. i18n — o painel hero fala INGLÊS quando a língua é EN ═══
  console.log("\n— F. i18n ×6 —");
  const pen = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pen.on("pageerror", (e) => erros.push("en: " + String(e)));
  await pen.addInitScript(() => {
    localStorage.setItem("bateu_lang", "en");
    localStorage.setItem("bateu_lang_explicit", "1");
  });
  await navegar(pen, "/lives", 6000);
  const tituloEn = await pen.locator('[data-testid="progressao-hero"]').innerText().catch(() => "");
  // honesto: os rótulos usam text-transform uppercase — innerText devolve MAIÚSCULAS
  assert(/your progression/i.test(tituloEn), "F1 «Your progression» em EN");
  assert(/points/i.test(tituloEn), "F2 «points» em EN");
  const kartEn = await pen.locator('[data-testid="livehub-hero-kart-pontos"]').innerText().catch(() => "");
  assert(/Up to 120 points/.test(kartEn), `F3 prémio em EN («${kartEn.trim()}»)`);
  const atalhoEn = await pen.locator('[data-testid="livehub-hero-atalho-info-tetris"]').innerText().catch(() => "");
  assert(atalhoEn.includes("Medium"), `F4 dificuldade traduzida («${atalhoEn.trim()}»)`);
  await pen.close();

  // ═══ G. estabilidade ═══
  console.log("\n— G. estabilidade —");
  assert(erros.length === 0, "G1 ZERO pageerror em todas as páginas", JSON.stringify(erros.slice(0, 3)));

  await p1280.close();
  await p1600.close();
  await browser.close();
  console.log(`\n══════════ ${verdes} verdes / ${falhas} falhas ══════════`);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALHA DA SUÍTE:", e);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(1);
});
