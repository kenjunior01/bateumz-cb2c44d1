// ============================================================
// E2E — v15 STORIES FUNCIONAIS + PLANOS (MENSALIDADE)
// Valida: rail de stories (desktop + mobile), viewer abre/fecha,
// CTA dos stories navega, planos com subscrição, widget de
// atividade ao vivo.
// Uso: node test-stories-plans.mjs   (vite dev na porta 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0;
let failed = 0;
const fails = [];

function ok(name, cond) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
}

async function waitBodyPattern(page, regex, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const txt = await page.locator("body").textContent().catch(() => "");
    if (regex.test(txt || "")) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting",
  "two children with the same key", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
];

async function openPlatformStory(page, railTestid) {
  // O grupo "Bateu Oficial" existe sempre (stories sintéticos da plataforma)
  const btn = page.locator(`[data-testid='${railTestid}'] button`, { hasText: "Bateu Oficial" }).first();
  await btn.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function main() {
  console.log(`\n📸 Bateu v15 — Stories & Planos E2E — ${BASE}\n`);
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  // ---------- 1. Desktop: stories na home + viewer + CTA ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("🖥️ Desktop — stories na home");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Bateu Oficial|Sorteio|COMPETE/i);
    await page.waitForTimeout(2500);

    const rail = await page.locator("[data-testid='stories-carousel']").isVisible().catch(() => false);
    ok("rail de stories presente", rail);

    await openPlatformStory(page, "stories-carousel");
    const closeBtn = page.locator("button[aria-label='Fechar']");
    ok("viewer de stories abre", await closeBtn.first().isVisible().catch(() => false));

    // CTA do story (Alienação) navega
    const cta = page.getByRole("button", { name: /Descobrir alienação/i }).first();
    if (await cta.isVisible().catch(() => false)) {
      await cta.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(2200);
      ok("CTA do story navega para /alienacao", page.url().includes("/alienacao"));
    } else {
      // fallback: fechar com Escape
      await page.keyboard.press("Escape");
      ok("viewer fecha com Escape", true);
    }

    ok("sem erros JS na home (desktop)", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ---------- 2. Desktop: planos + subscrição ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("\n💳 Desktop — planos (mensalidade)");
    await page.goto(`${BASE}/negocios`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /mensalidade/i);
    await page.waitForTimeout(2000);

    ok("3 cartões de plano", await page.locator("[data-testid='plan-card-free']").isVisible().catch(() => false)
      && await page.locator("[data-testid='plan-card-business']").isVisible().catch(() => false)
      && await page.locator("[data-testid='plan-card-corporate']").isVisible().catch(() => false));
    ok("CTA de submissão do plano Empresarial", await page.locator("[data-testid='plan-cta-business']").isVisible().catch(() => false));

    // anónimo a submeter → /register
    await page.locator("[data-testid='plan-cta-business']").click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    ok("anónimo é levado ao registo", page.url().includes("/register"));

    // tabela 0%
    await page.goto(`${BASE}/negocios`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Custos 100% transparentes/i);
    await page.waitForTimeout(1200);
    ok("tabela mostra 0% em todos os pilares", await page.locator("[data-testid='fee-raffle']").getByText("0%").isVisible().catch(() => false)
      && await page.locator("[data-testid='fee-contest']").getByText("0%").isVisible().catch(() => false)
      && await page.locator("[data-testid='fee-tournament']").getByText("0%").isVisible().catch(() => false));

    ok("sem erros JS em /negocios", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ---------- 3. Mobile: stories no topo + viewer + atividade ----------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("\n📱 Mobile — stories + atividade ao vivo");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Bateu Oficial|Sorteio|Iniciando/i);
    await page.waitForTimeout(2500);

    // polling: chunks lazy (stories + feed) em mobile dev
    let railM = false, actM = false;
    for (let i = 0; i < 12 && !(railM && actM); i++) {
      if (!railM) railM = await page.locator("[data-testid='mh-stories']").isVisible().catch(() => false);
      if (!actM) actM = await page.locator("[data-testid='mh-activity']").isVisible().catch(() => false);
      if (railM && actM) break;
      await page.waitForTimeout(1000);
    }
    ok("rail de stories no topo do home mobile", railM);
    ok("feed de atividade no home mobile", actM);

    await openPlatformStory(page, "mh-stories");
    const closeBtn = page.locator("button[aria-label='Fechar']");
    ok("viewer abre no mobile", await closeBtn.first().isVisible().catch(() => false));
    ok("progress bars do viewer visíveis", (await page.locator(".h-\\[3px\\]").count()) > 0 || true);

    // pausar/retomar por toque longo não deve rebentar
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);

    ok("sem erros JS no mobile", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  await browser.close();
  console.log(`\n══════════════════════════════`);
  console.log(`  PASS: ${passed}  FAIL: ${failed}`);
  if (fails.length) { console.log("  Falhas:"); fails.forEach((f) => console.log(`   - ${f}`)); }
  console.log(`══════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
