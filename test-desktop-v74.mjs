// test-desktop-v74 — UPGRADE VISUAL DA VERSÃO DESKTOP (1600×900)
// O que a suíte PROVA (com o browser a ver, não com confiança no código):
//   A. NAVBAR: as 8 classes navbar-* que eram usadas no JSX SEM CSS nenhum agora
//      existem de verdade — o orb «ao vivo» é 1 linha (sem wrap), altura ~30px,
//      o logo tem anel com sombra, o aurora/spotlight/progresso existem.
//   B. HUB DESKTOP: painel de destaque à direita do hero (SÓ ≥lg), grelha 5
//      colunas em 1600px, pesquisa desktop presente e que FILTRA, ordem real:
//      destaque kart ACIMA das rádios (antes as rádios empurravam os jogos).
//   C. KART DESKTOP: menu em 2 colunas (grid computado) + pistas/garagem/online/
//      desafios/correr todos presentes + shot.
//   D. TETRIS/ESPAÇO: legendas desktop visíveis ≥lg; telemóvel NÃO as vê (375px).
//   E. ZERO pageerror em todas as páginas.
// Requisito: vite dev em :8099 (igual às suítes anteriores).
import { spawn } from "node:child_process";
import fs from "node:fs";

const BASE = "http://localhost:8099";
const OUT = "shots-v74";
fs.mkdirSync(OUT, { recursive: true });

// ── launcher do vite (mesmo padrão da v262: setsid, porta fixa, limpeza no fim)
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

async function navegar(page, url, waitMs = 3800) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(waitMs);
}

(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => erros.push(String(e)));

  // ═══ A. NAVBAR DESKTOP (home /) ═══
  console.log("\n— A. navbar desktop (v79: cabeçalho simples) —");
  await navegar(page, "/", 5000);
  // v79: o orb deu lugar a 4 links principais + Mais + pesquisa — mesmo sítio,
  // agora SEM mega-menus nem atalhos duplicados
  const principaisA = ["nav79-desktop-jogos", "nav79-desktop-live", "nav79-desktop-desporto", "nav79-desktop-premios", "nav79-desktop-mais"];
  for (const tid of principaisA) {
    const el = page.locator(`[data-testid="${tid}"]`);
    assert(await el.isVisible(), `A1 ${tid} visível`);
    const box = await el.boundingBox();
    assert(box && box.height >= 24 && box.height <= 44, `A2 ${tid} altura de linha de nav (${box ? box.height.toFixed(1) : "?"}px)`);
  }
  const overflowA = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  assert(overflowA.sw <= overflowA.cw, `A3 navbar SEM overflow horizontal a 1600px (${overflowA.sw} ≤ ${overflowA.cw})`);
  const ring = await page.locator(".navbar-logo-ring").evaluate((el) => getComputedStyle(el).boxShadow !== "none");
  assert(ring, "A5 anel do logo com sombra (classe navbar-logo-ring existente)");
  const aurora = await page.locator(".navbar-aurora-strip").count();
  const spotlight = await page.locator(".navbar-spotlight").count();
  const progress = await page.locator(".navbar-scroll-progress").count();
  assert(aurora === 1 && spotlight === 1 && progress === 1, "A6 aurora + spotlight + barra de progresso presentes");
  await page.screenshot({ path: `${OUT}/v74-desktop-home.png` });

  // ═══ B. HUB DESKTOP ═══
  console.log("\n— B. hub desktop —");
  await navegar(page, "/lives", 5200);
  const hero = page.locator('[data-testid="livehub-hero-desktop"]');
  assert(await hero.isVisible(), "B1 painel de destaque do hero visível em ≥lg");
  const heroKart = page.locator('[data-testid="livehub-hero-kart"]');
  assert(await heroKart.count() === 1, "B2 cartão kart do hero presente");
  const heroTxt = await heroKart.innerText().catch(() => "");
  assert(!heroTxt.includes("livehub.game."), "B2b cartão kart SEM chave i18n crua (label traduzido)");
  for (const id of ["tetris", "spaceshooter", "chess"]) {
    assert(await page.locator(`[data-testid="livehub-hero-atalho-${id}"]`).count() === 1, `B3 atalho ${id} no hero`);
  }
  const grid = page.locator('[data-testid="livehub-grelha"]');
  const gridTxt = await grid.innerText().catch(() => "");
  assert(!gridTxt.includes("livehub.game."), "B2c grelha SEM chave i18n crua");
  const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  assert(cols === 5, `B4 grelha com 5 colunas em 1600px (${cols})`);
  const busca = page.locator('[data-testid="livehub-busca-desktop"]');
  assert(await busca.isVisible(), "B5 pesquisa desktop visível");
  await busca.fill("Tetris");
  await page.waitForTimeout(700);
  const cartoes = await grid.locator("button").count();
  assert(cartoes >= 1 && cartoes <= 3, `B6 pesquisa FILTRA a grelha (${cartoes} cartões com «Tetris»)`);
  await busca.fill("");
  await page.waitForTimeout(500);
  // ordem: destaque kart ACIMA das rádios (era o furo do desktop: rádios 1.ª)
  const yKart = (await page.locator('[data-testid="livehub-destaque-bateu-world"]').boundingBox()).y;
  const yRadios = (await page.locator('[data-testid="livehub-radios"]').boundingBox()).y;
  assert(yKart < yRadios, `B7 jogos ACIMA das rádios em desktop (${yKart.toFixed(0)} < ${yRadios.toFixed(0)})`);
  const yGrid = (await grid.boundingBox()).y;
  assert(yGrid < yRadios, `B8 grelha de jogos ACIMA das rádios (${yGrid.toFixed(0)} < ${yRadios.toFixed(0)})`);
  await page.screenshot({ path: `${OUT}/v74-desktop-hub.png` });

  // ═══ C. KART DESKTOP (menu 2 colunas) ═══
  console.log("\n— C. kart desktop —");
  await navegar(page, "/lives?game=kart", 4500);
  const menuGrid = page.locator('[data-testid="kart-menu"] .lg\\:grid-cols-\\[minmax\\(0\\,1\\.2fr\\)_minmax\\(0\\,1fr\\)\\]');
  const gridKart = await menuGrid.count();
  assert(gridKart === 1, "C1 wrapper de 2 colunas presente no menu");
  const disp = gridKart ? await menuGrid.first().evaluate((el) => getComputedStyle(el).display) : "none";
  assert(disp === "grid", `C2 menu é grid a 1600px (${disp})`);
  for (const tid of ["kart-pista-praia", "kart-garagem", "kart-entrar", "kart-batalha", "kart-online-painel", "kart-desafios-painel", "kart-save-info"]) {
    const vis = await page.locator(`[data-testid="${tid}"]`).first().isVisible();
    assert(vis, `C3 ${tid} visível`);
  }
  // coluna esquerda (pistas) e direita (online) lado a lado
  const yPistas = (await page.locator('[data-testid="kart-pista-praia"]').boundingBox()).y;
  const yOnline = (await page.locator('[data-testid="kart-online-painel"]').boundingBox()).y;
  assert(Math.abs(yPistas - yOnline) < 220, `C4 colunas lado a lado (Δy ${Math.abs(yPistas - yOnline).toFixed(0)}px)`);
  await page.screenshot({ path: `${OUT}/v74-desktop-kart.png` });

  // ═══ D. TETRIS + ESPAÇO desktop ═══
  console.log("\n— D. tetris/espaço desktop —");
  await navegar(page, "/lives?game=tetris", 4200);
  assert(await page.locator('[data-testid="tetris-legenda-desktop"]').isVisible(), "D1 legenda tetris ≥lg visível");
  await page.screenshot({ path: `${OUT}/v74-desktop-tetris.png` });
  await navegar(page, "/lives?game=spaceshooter", 4200);
  assert(await page.locator('[data-testid="espaco-legenda-desktop"]').isVisible(), "D2 legenda espaço ≥lg visível");
  await page.screenshot({ path: `${OUT}/v74-desktop-espaco.png` });

  // telemóvel: legendas NÃO existem (375×667) — o mobile fica intacto
  console.log("\n— D3. mobile intocado —");
  const mob = await browser.newPage({ viewport: { width: 375, height: 667 } });
  mob.on("pageerror", (e) => erros.push("mobile: " + String(e)));
  await navegar(mob, "/lives?game=tetris", 4200);
  const legT = await mob.locator('[data-testid="tetris-legenda-desktop"]').count();
  const legTv = legT ? await mob.locator('[data-testid="tetris-legenda-desktop"]').first().isVisible() : false;
  assert(!legTv, "D3a tetris SEM legenda desktop em mobile");
  await navegar(mob, "/lives", 4500);
  const heroMob = await mob.locator('[data-testid="livehub-hero-desktop"]').isVisible();
  assert(!heroMob, "D3b hero desktop NÃO aparece em mobile");
  const orbMob = mob.locator(".navbar-live-orb");
  const orbMobCount = await orbMob.count();
  const orbMobHidden = orbMobCount === 0 || !(await orbMob.first().isVisible());
  assert(orbMobHidden, "D3c orb desktop escondido em mobile");
  const buscaMob = await mob.locator('[data-testid="livehub-busca-desktop"]').isVisible();
  assert(!buscaMob, "D3d pesquisa desktop escondida em mobile");
  await mob.close();

  // ═══ E. zero pageerror ═══
  console.log("\n— E. estabilidade —");
  assert(erros.length === 0, "E1 ZERO pageerror em todas as páginas", JSON.stringify(erros.slice(0, 3)));

  await browser.close();
  console.log(`\n══════════ ${verdes} verdes / ${falhas} falhas ══════════`);
  if (vite) process.kill(-vite.pid, "SIGTERM");
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALHA DA SUÍTE:", e);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(1);
});
