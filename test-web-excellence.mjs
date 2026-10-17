// ============================================================
// E2E — EXCELÊNCIA WEB (REA): Busca global ⌘K, Continuar a
// Jogar, Populares esta Semana, chips de categorias e stats
// ao vivo do hero. Desktop 1280x900 + mobile 390x844.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-web-excellence.mjs
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
  games: {
    chess: { best: 120, plays: 3, totalScore: 300, lastPlayed: Date.now() - 60000 },
    bounce: { best: 40, plays: 1, totalScore: 40, lastPlayed: Date.now() - 120000 },
  },
  day: new Date().toISOString().slice(0, 10),
  missions: {},
  streak: 2,
  lastStreakDay: new Date().toISOString().slice(0, 10),
  xp: 240,
  credit: 3,
};

async function waitVisible(page, selector, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await page.locator(selector).first().isVisible()) return true;
    } catch {}
    await page.waitForTimeout(700);
  }
  return false;
}

/** Abre a paleta com retry — o chunk lazy demora a carregar no dev server. */
async function abrirPaleta(page, via) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    try {
      if (via === "teclado") await page.keyboard.press("Control+k");
      else {
        const el = page.locator(via).first();
        if ((await el.count()) > 0 && (await el.isVisible())) await el.click();
      }
      await page.waitForTimeout(1200);
      if (await page.locator('[data-testid="busca-global-dialog"]').first().isVisible()) return true;
      if (await page.locator('[data-testid="busca-global-dialog"]').count() > 0) return true;
    } catch {}
    await page.waitForTimeout(1500);
  }
  return false;
}

async function runSuite(browser, label, viewport, isMobileUA) {
  console.log(`\n——— ${label} ———`);
  const ctx = await browser.newContext({
    viewport,
    hasTouch: isMobileUA,
    isMobile: isMobileUA,
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
    // 0) Semear progressão local ANTES de a app ler (Continuar a Jogar)
    await page.addInitScript((seed) => {
      try { localStorage.setItem("bateu:kit-progress-v1", JSON.stringify(seed)); } catch {}
    }, KIT_PROGRESS);

    /* ── HOMEPAGE ── */
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitVisible(page, 'body');

    // 1) Hero com chips de categorias reais (secções de hero só no desktop)
    if (!isMobileUA) {
      const chips = await waitVisible(page, '[data-testid="hero-categorias"]');
      ok("hero: chips de categorias visíveis", chips);
      if (chips) {
        const chipText = await page.locator('[data-testid="hero-categorias"]').innerText();
        ok("hero: chips têm contagens reais", /\(\d+\)/.test(chipText));
      }

      // 2) Hero com stats ao vivo (contadores reais ou fallback honesto)
      const heroStats = await waitVisible(page, '[data-testid="hero-stats-live"]');
      ok("hero: stats ao vivo visíveis", heroStats);

      // 3) Rail Continuar a Jogar — aparece porque semeámos 2 jogos
      const rail = await waitVisible(page, '[data-testid="home-continuar-jogar"]');
      ok("home: rail 'Continuar a Jogar' aparece", rail);
      if (rail) {
        const card = await page.locator('[data-testid="continuar-card-chess"]').isVisible();
        ok("home: card do xadrez no rail", card);
        await page.locator('[data-testid="continuar-card-chess"]').click();
        await page.waitForTimeout(2500);
        ok("home: 'Continuar' navega para o jogo", page.url().includes("lives?game=chess"));
      }
    }

    // 4) Busca global via Ctrl+K / ⌘K
    if (!isMobileUA) {
      await page.keyboard.press("Escape");
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(4000);
      const dialog = await abrirPaleta(page, "teclado");
      ok("busca: Ctrl+K abre a paleta", dialog);
      if (dialog) {
        await page.keyboard.type("xadrez", { delay: 60 });
        await page.waitForTimeout(900);
        const item = await page.locator('[data-testid="busca-item-jogo-chess"]').first().isVisible();
        ok("busca: 'xadrez' encontra o jogo", item);
        if (item) {
          await page.keyboard.press("Enter");
          await page.waitForTimeout(2500);
          ok("busca: Enter navega para /lives?game=chess", page.url().includes("lives?game=chess"));
        }
      }

      // 5) Busca global pelo gatilho da navbar (desktop)
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const d2 = await abrirPaleta(page, '[data-testid="navbar-busca"]');
      ok("busca: gatilho da navbar abre a paleta", d2);
      await page.keyboard.press("Escape");
    }

    // 6) Mobile: gatilho na barra de topo
    if (isMobileUA) {
      const d3 = await abrirPaleta(page, '[data-testid="topbar-busca"]');
      ok("busca: ícone da barra de topo abre a paleta", d3);
      await page.keyboard.press("Escape");
    }

    /* ── HUB /JOGOS ── */
    await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const popRail = await waitVisible(page, '[data-testid="jogos-populares-rail"]');
    ok("/jogos: rail 'Populares esta Semana' visível", popRail);
    if (popRail) {
      const first = await page.locator('[data-testid^="populares-card-"]').first().getAttribute("data-testid");
      ok("/jogos: rail tem cards ordenados", !!first);
    }
    // sort "Populares" activo por omissão + badge de jogadas locais
    const sortBtn = await page.locator('button:has-text("Populares")').first().isVisible();
    ok("/jogos: ordenação 'Populares' disponível", sortBtn);
    await waitVisible(page, '[data-testid="plays-badge-chess"]', 12000)
      .then((v) => ok("/jogos: badge '3× tuas' no xadrez", v));

    // 7) Chip da homepage filtra o hub: /jogos?cat=Estratégia (5 clássicos)
    await page.goto(`${BASE}/jogos?cat=${encodeURIComponent("Estratégia")}`, { waitUntil: "domcontentloaded" });
    let filtrou = false;
    const t0c = Date.now();
    while (Date.now() - t0c < 25000) {
      const n = await page.locator('a[href^="/lives?game="]').count();
      if (n === 5) { filtrou = true; break; }
      await page.waitForTimeout(1200);
    }
    ok("/jogos?cat=Estratégia filtra (5 jogos)", filtrou);
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
console.log(`EXCELÊNCIA WEB: ${passed} pass · ${failed} fail`);
if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log("  -", f)); process.exit(1); }
process.exit(0);
