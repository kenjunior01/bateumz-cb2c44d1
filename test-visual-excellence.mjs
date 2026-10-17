// ============================================================
// E2E — EXCELÊNCIA VISUAL (REA v2.22): arte original por jogo,
// página de detalhe /jogo/:id, alias /todos-jogos, chips de arte
// na busca. Desktop 1280x900 + mobile 390x844.
// Uso: node test-visual-excellence.mjs   (vite na porta 8099)
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
  "navigator.vibrate", "<line> attribute", "validateDOMNesting", "same key",
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "ERR_", "net::", "404", "403", "429", "favicon", "vite", "React DevTools",
  "Download the React DevTools", "sourcemap", "Sourcemap", "auto_reconnect",
  "will be deprecated", "aria-hidden", "third-party cookie", "Third-party cookie",
];

const KIT_PROGRESS = {
  games: { chess: { best: 120, plays: 3, totalScore: 300, lastPlayed: Date.now() } },
  day: new Date().toISOString().slice(0, 10),
  missions: {}, streak: 1, lastStreakDay: new Date().toISOString().slice(0, 10),
  xp: 120, credit: 1,
};

async function waitVisible(page, selector, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await page.locator(selector).first().isVisible()) return true; } catch {}
    await page.waitForTimeout(600);
  }
  return false;
}

async function waitUrl(page, fragment, timeoutMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (page.url().includes(fragment)) return true;
    await page.waitForTimeout(700);
  }
  return false;
}

/** Abre a paleta com retry — o chunk lazy demora no dev server. */
async function abrirPaleta(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    try {
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(1200);
      if (await page.locator('[data-testid="busca-global-dialog"]').count() > 0) return true;
    } catch {}
    await page.waitForTimeout(1500);
  }
  return false;
}

async function runSuite(browser, label, viewport, isMobileUA) {
  console.log(`\n——— ${label} ———`);
  const ctx = await browser.newContext({
    viewport, hasTouch: isMobileUA, isMobile: isMobileUA,
    userAgent: isMobileUA
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
      : undefined,
  });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on("pageerror", (e) => {
    if (!NOISE.some((n) => String(e.message).includes(n))) pageErrors.push(e.message);
  });

  try {
    await page.addInitScript((seed) => {
      try { localStorage.setItem("bateu:kit-progress-v1", JSON.stringify(seed)); } catch {}
    }, KIT_PROGRESS);

    /* ── HUB /JOGOS ── */
    await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const artHub = await waitVisible(page, '[data-testid="jogos-populares-rail"] svg.game-art');
    ok("/jogos: rail Populares usa ARTE original (svg.game-art)", artHub);

    // grelha principal com arte nos cards
    let gridArt = false, t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const n = await page.locator('a[href^="/lives?game="] svg.game-art').count();
      if (n >= 10) { gridArt = true; break; }
      await page.waitForTimeout(1000);
    }
    ok("/jogos: grelha com arte em todos os cards (≥10)", gridArt);

    // sem emojis soltos nos cabeçalhos dos cards do catálogo
    const emojiInGrid = await page.locator('a[href^="/lives?game="] .game-visual').count();
    ok("/jogos: caixas de emoji antigas removidas", emojiInGrid === 0);

    // botão Detalhes navega para /jogo/:id
    if (!isMobileUA) {
      const infoBtn = await waitVisible(page, '[data-testid="info-chess"]');
      ok("/jogos: botão 'Detalhes' visível no xadrez", infoBtn);
      if (infoBtn) {
        await page.locator('[data-testid="info-chess"]').click();
        await page.waitForTimeout(3000);
        ok("/jogos: 'Detalhes' navega para /jogo/chess", page.url().includes("/jogo/chess"));
      }
    }

    /* ── PÁGINA DE DETALHE ── */
    await page.goto(`${BASE}/jogo/chess`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const hero = await waitVisible(page, '[data-testid="detalhe-hero"] svg.game-art');
    ok("/jogo/chess: herói com arte grande", hero);

    const stats = await waitVisible(page, '[data-testid="detalhe-stats"]');
    ok("/jogo/chess: grelha de estatísticas", stats);
    if (stats) {
      const st = await page.locator('[data-testid="detalhe-stat-jogadas"]').innerText();
      ok("/jogo/chess: 'Jogadas tuas' = 3 (progresso local honesto)", st.trim().split("\n")[0].trim() === "3");
      const rec = await page.locator('[data-testid="detalhe-stat-recorde"]').innerText();
      ok("/jogo/chess: recorde = 120", rec.includes("120"));
    }

    const tips = await page.locator('section:has-text("Como jogar") p').count();
    ok("/jogo/chess: 'Como jogar' com dicas (≥2)", tips >= 2);

    const rel = await page.locator('[data-testid^="relacionado-"]').count();
    ok("/jogo/chess: jogos relacionados presentes (≥2)", rel >= 2);

    if (!isMobileUA) {
      await page.locator('[data-testid="detalhe-jogar"]').click();
      await page.waitForTimeout(3500);
      ok("/jogo/chess: 'JOGAR AGORA' navega para o jogo", page.url().includes("lives?game=chess"));
    }

    // id inválido → volta ao hub (chunk lazy: esperar com polling)
    await page.goto(`${BASE}/jogo/nao-existe`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const r1 = await waitUrl(page, "/jogos");
    ok("/jogo/nao-existe: redireciona para /jogos", r1);

    /* ── ALIAS /todos-jogos ── */
    await page.goto(`${BASE}/todos-jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const r2 = await waitUrl(page, "/jogos");
    ok("/todos-jogos: redireciona para /jogos", r2);

    /* ── BUSCA com chips de arte ── */
    if (!isMobileUA) {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(4000);
      const dlg = await abrirPaleta(page);
      if (dlg) {
        await page.keyboard.type("xadrez", { delay: 50 });
        await page.waitForTimeout(1000);
        const chip = await page.locator('[data-testid="busca-item-jogo-chess"] svg.game-art').count();
        ok("busca: linha do jogo mostra chip de ARTE", chip > 0);
      } else {
        ok("busca: paleta disponível", false);
      }
      await page.keyboard.press("Escape");
    }
  } catch (e) {
    ok(`suite ${label} sem excepção: ${e.message?.slice(0, 120)}`, false);
  }

  ok(`${label}: 0 erros de página`, pageErrors.length === 0);
  if (pageErrors.length) console.log("   pageerrors:", pageErrors.slice(0, 3));
  await ctx.close();
}

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
await runSuite(browser, "DESKTOP 1280x900", { width: 1280, height: 900 }, false);
await runSuite(browser, "MOBILE 390x844", { width: 390, height: 844 }, true);
await browser.close();

console.log(`\n════════════════════════════════`);
console.log(`EXCELÊNCIA VISUAL: ${passed} pass · ${failed} fail`);
if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log("  -", f)); process.exit(1); }
process.exit(0);
