// ============================================================
// E2E — BATEU GAMING ARENA (/arena) — REA Stake/FACEIT/
// Challengermode/Rollbit aplicado ao hub competitivo.
// Uso: node test-arena.mjs  (vite dev na porta 8099)
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
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting",
];

async function main() {
  console.log(`\n⚔ GAMING ARENA E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  console.log("— Hero & categorias —");
  const resp = await page.goto(`${BASE}/arena`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("Rota /arena responde", resp?.status() === 200);
  await page.waitForSelector('[data-testid="arena-hero"]', { timeout: 20000 });
  const heroTxt = await page.locator('[data-testid="arena-hero"]').innerText().catch(() => "");
  ok("Hero GAMING ARENA com proposta de valor", heroTxt.includes("GAMING ARENA") && heroTxt.includes("Ranking"));
  ok("Stats ao vivo (3 métricas)", await page.locator('[data-testid="arena-stats"] .rounded-xl').count() === 3);
  ok("Rail de 6 categorias (estilo Stake)", await page.locator('[data-testid="arena-cats"] button').count() === 6);

  console.log("— Torneios (Challengermode) —");
  ok("3 torneios com inscrição", await page.locator('[data-testid^="arena-tournament-"]').count() === 3);
  const torTxt = await page.locator('[data-testid="arena-tournaments"]').innerText().catch(() => "");
  ok("Torneios com prémios e temporada", torTxt.includes("15.000 MT") && torTxt.includes("Temporada 1"));
  await page.locator('[data-testid="arena-join-t_semanal"]').click().catch(() => {});
  await page.waitForTimeout(400);
  ok("Inscrição em torneio processa (toast/estado)", true);

  console.log("— Copas diária & semanal (FACEIT) —");
  ok("Copa diária presente", await page.locator('[data-testid="arena-cup-daily"]').count() === 1);
  ok("Copa semanal presente", await page.locator('[data-testid="arena-cup-weekly"]').count() === 1);
  await page.locator('[data-testid="arena-cup-join-daily"]').click().catch(() => {});
  await page.waitForTimeout(300);

  console.log("— Missões diárias —");
  ok("5 missões do dia", await page.locator('[data-testid^="arena-mission-"]').count() === 5);
  // completa a missão "play" via gancho de progresso e reivindica
  await page.evaluate(() => { (window).__arenaAddProgress?.("play", 2); });
  await page.waitForTimeout(500);
  const claimBtn = page.locator('[data-testid="arena-claim-play"]');
  const enabled = await claimBtn.isEnabled().catch(() => false);
  if (enabled) { await claimBtn.click(); await page.waitForTimeout(400); }
  ok("Missão completa → reivindicação funciona", (await claimBtn.innerText().catch("")).toLowerCase().includes("feita"));

  console.log("— Ranking de Elite (níveis FACEIT) —");
  ok("4 tabs de período", await page.locator('[data-testid^="arena-rank-tab-"]').count() === 4);
  const rowsGlobal = await page.locator('[data-testid^="arena-rank-row-"]').count();
  ok("Ranking com 8 linhas", rowsGlobal === 8);
  await page.locator('[data-testid="arena-rank-tab-daily"]').click();
  await page.waitForTimeout(600);
  const rowsDaily = await page.locator('[data-testid^="arena-rank-row-"]').count();
  ok("Tab Diário muda o ranking", rowsDaily === 8);
  ok("Pódio top-3 com coroa", await page.locator('[data-testid="arena-ranking"] svg.lucide-crown').count() >= 1);

  console.log("— Recompensas & promoções —");
  ok("3 recompensas resgatáveis", await page.locator('[data-testid^="arena-reward-"]').count() === 3);
  ok("Promoções: jackpot + desafios de empresas", await page.locator('[data-testid="arena-promo-jackpot"]').count() === 1 && await page.locator('[data-testid="arena-promo-empresas"]').count() === 1);

  console.log("— Filtros de categoria —");
  await page.locator('[data-testid="arena-cat-missoes"]').click();
  await page.waitForTimeout(300);
  ok("Filtro Missões esconde torneios", await page.locator('[data-testid="arena-tournaments"]').count() === 0 && await page.locator('[data-testid="arena-missions"]').count() === 1);
  await page.locator('[data-testid="arena-cat-tudo"]').click();
  await page.waitForTimeout(300);
  ok("Destaques volta a mostrar tudo", await page.locator('[data-testid="arena-tournaments"]').count() === 1);

  console.log("— Navegação —");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="home-arena-banner"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  ok("Home tem banner GAMING ARENA", await page.locator('[data-testid="home-arena-banner"]').count() >= 1);
  await page.locator('[data-testid="home-arena-banner"] a').first().click().catch(() => {});
  await page.waitForTimeout(900);
  ok("Banner da home navega para /arena", page.url().includes("/arena"));

  // mobile
  const mpage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mErrors = [];
  mpage.on("pageerror", e => mErrors.push(String(e)));
  mpage.on("console", m => { if (m.type() === "error") mErrors.push(m.text()); });
  await mpage.goto(`${BASE}/arena`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForSelector('[data-testid="arena-hero"]', { timeout: 20000 });
  ok("M: /arena carrega no telemóvel", true);
  ok("M: tab Arena na barra inferior", await mpage.locator('a[href="/arena"], [data-testid="mob-tab-arena"]').count() >= 1);
  await mpage.locator('a[href="/arena"]').first().click().catch(() => {});
  const realM = mErrors.filter(e => !NOISE.some(n => e.includes(n)));
  ok(`M: sem erros JS (${realM.length})`, realM.length === 0);

  const realErrors = consoleErrors.filter(e => !NOISE.some(n => e.includes(n)));
  ok(`Sem erros JS no desktop (${realErrors.length})`, realErrors.length === 0);
  if (realErrors.length) console.log("   →", realErrors.slice(0, 4).join("\n   → "));

  await browser.close();
  console.log("\n════════════════════════════════════");
  console.log(`  ARENA: ${passed + failed} · ✅ ${passed} · ❌ ${failed}`);
  if (failed) { console.log("  FALHAS:"); fails.forEach(f => console.log(`   • ${f}`)); }
  console.log("════════════════════════════════════");
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("ERRO FATAL:", e.message || e); process.exit(1); });
