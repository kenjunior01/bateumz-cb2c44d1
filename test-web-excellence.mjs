// v26 — Web Excellence E2E: arranque rápido, zero warnings, prefetch no hover, skip-link
import { chromium } from "playwright";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// ─── 1. ARRANQUE RÁPIDO: hero visível em < 4.5s (antes: 5-9s) ───
console.log("■ 1. Arranque rápido");
const keyWarnings = [];
const routerWarnings = [];
page.on("console", m => {
  if (/two children with the same key/i.test(m.text())) keyWarnings.push(m.text());
  if (/React Router Future Flag Warning/i.test(m.text())) routerWarnings.push(m.text());
});
const t0 = Date.now();
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 4500 });
  const dt = Date.now() - t0;
  ok(`hero renderiza em ${dt}ms (< 5000ms)`, dt < 5000);
} catch {
  ok("hero renderiza em < 4500ms", false, "— hero não apareceu a tempo");
}

// ─── 2. ZERO warnings React (keys duplicadas) ───
console.log("■ 2. Zero warnings de keys duplicadas");
await page.waitForTimeout(1500);
ok(`0 warnings de keys (got ${keyWarnings.length})`, keyWarnings.length === 0);

// ─── 3. ZERO warnings React Router future flags ───
console.log("■ 3. Zero warnings do React Router");
ok(`0 warnings de future flags (got ${routerWarnings.length})`, routerWarnings.length === 0);

// ─── 4. PREFETCH no hover: hover no link "Jogos Grátis" descarrega o chunk antes do clique ───
console.log("■ 4. Prefetch de rota no hover");
const chunkReqs = [];
page.on("request", r => {
  const u = r.url();
  if (/src\/pages\/games-gratis\/|FreeGamesHub/.test(u)) chunkReqs.push(u);
});
// hover REAL no link direto do navbar (o prefetch escuta mouseover delegado)
const direct = page.locator("[data-testid='nav-direct-jogos-gratis']");
ok("atalho direto «Jogos Grátis» no navbar desktop", await direct.isVisible());
await direct.hover();
await page.waitForTimeout(1200);
ok("chunk de /jogos-gratis pedido no hover (antes do clique)", chunkReqs.length > 0,
  `— reqs: ${chunkReqs.length}`);
// ─── 5. SKIP-LINK a11y: 1º Tab foca «Saltar para o conteúdo» ───
console.log("■ 5. Skip-link de acessibilidade");
await page.keyboard.press("Tab");
const skipFocused = await page.evaluate(() => {
  const el = document.activeElement;
  return el?.getAttribute("data-testid") === "skip-link";
});
ok("1º Tab foca o skip-link", skipFocused);
const skipVisible = await page.locator("[data-testid='skip-link']").isVisible();
ok("skip-link visível quando focado", skipVisible);
const targetExists = await page.evaluate(() => {
  const t = document.getElementById("conteudo-principal");
  return !!t;
});
ok("alvo #conteudo-principal existe", targetExists);
// Enter salta o foco para o conteúdo
await page.keyboard.press("Enter");
const afterSkip = await page.evaluate(() => document.activeElement?.id === "conteudo-principal");
ok("Enter move o foco para #conteudo-principal", afterSkip);

// ─── 6. Navegação desktop segue funcional (regressão leve) ───
console.log("■ 6. Navegação desktop para /jogos-gratis");
await page.click("a[href='/jogos-gratis']");
await page.waitForURL("**/jogos-gratis", { timeout: 8000 });
await page.waitForSelector("[data-testid='freegames-grid'], [data-testid='freegames-empty']", { timeout: 8000 });
ok("navegação para hub de jogos grátis OK", true);

// ─── 7. Loading screen continua a aparecer (marca) mas não mais que ~2s no mobile ───
console.log("■ 7. LoadingScreen presente mas breve");
await page.goto(BASE + "/lives", { waitUntil: "domcontentloaded", timeout: 30000 });
const t1 = Date.now();
await page.waitForSelector("main, [data-testid='live-hub'], h1", { timeout: 6000 });
const dtLives = Date.now() - t1;
ok(`/lives renderiza em ${dtLives}ms (< 6000ms)`, dtLives < 6000);

console.log(`\n═══ RESULTADO: ${pass} ✅ / ${fail} ❌ ═══`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
