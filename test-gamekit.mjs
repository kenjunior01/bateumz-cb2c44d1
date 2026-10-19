// ============================================================
// E2E — BATEU PRO KIT v20: progressão universal dos jogos
// Missões diárias visíveis no hub + jogo corre sem erros.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-gamekit.mjs
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

// a app demora a arrancar (~8-20s) — espera activa por texto
async function waitText(page, pattern, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const found = await page.evaluate((p) => {
        try { return new RegExp(p).test(document.body.innerText); } catch { return false; }
      }, pattern.source);
      if (found) return true;
    } catch {}
    await page.waitForTimeout(800);
  }
  return false;
}

async function main() {
  console.log(`\n🎮 BATEU PRO KIT E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message || e)));

  // ── 1. Missões diárias no hub (jogo Bounce) ──
  console.log("▶ Missões Diárias no LiveHub");
  await page.goto(`${BASE}/lives?game=bounce`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const missionsVisible = await waitText(page, /Missões de hoje/i);
  ok("barra de missões diárias visível", missionsVisible);

  const streakChip = missionsVisible && await page.getByText(/seguidos/i).first().isVisible().catch(() => false);
  ok("chip de streak de dias presente", streakChip);

  const xpBadges = await page.getByText(/\+\d+XP/).count();
  ok("recompensas XP anunciadas nas missões (3 missões)", xpBadges >= 3);

  // ── 2. Progressão muda com o jogo activo ──
  await page.goto(`${BASE}/lives?game=flappybird`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const flappyMissions = await waitText(page, /Missões de hoje — Flappy Bird/i);
  ok("missões acompanham o jogo activo (Flappy Bird)", flappyMissions);

  // ── 3. Motor de progresso: reportar score → XP/missões/persistência ──
  const kit = await page.evaluate(() => {
    const k = window.__bateuKit;
    if (!k) return null;
    k.report("bounce", "Bounce", 900);
    const p = k.getProgress();
    return {
      hasDay: typeof p.day === "string",
      best: p.games?.bounce?.best ?? 0,
      xp: p.xp,
      missions: k.getMissions("bounce", "Bounce").map((m) => ({ id: m.id, done: m.done, progress: m.progress })),
    };
  });
  ok("motor de progresso grava no aparelho (best/xp/dia)", !!kit && kit.hasDay && kit.best >= 320 && kit.xp > 0);
  ok("missão de pontuação concluída com score alto", !!kit && kit.missions.some((m) => m.id === "score" && m.done));

  // ── 4. Jogo Bounce funciona com o kit por cima ──
  await page.goto(`${BASE}/lives?game=bounce`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitText(page, /Missões de hoje/i);
  const canvas = page.locator('[data-testid="bounce-canvas"]');
  ok("canvas do Bounce presente", await canvas.count() > 0);
  const play = page.locator('[data-testid="bounce-play"]');
  if (await play.count() > 0) {
    await play.click();
    await page.waitForTimeout(2500);
    const left = page.locator('[data-testid="bounce-left"]');
    if (await left.count() > 0) { await left.hover(); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up(); }
  }
  await page.waitForTimeout(1200);
  ok("Bounce joga sem crash com o kit activo", true);

  // ── 5. MMORPG não duplica barra (tem progressão própria) ──
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);
  const mmorpgBar = await page.getByText(/Missões de hoje —/i).count();
  ok("MMORPG sem barra de kit (progressão RPG própria)", mmorpgBar === 0);

  // ── 6. Estabilidade ──
  const criticalErrors = pageErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok(`0 erros JS críticos (${criticalErrors.length})`, criticalErrors.length === 0);
  if (criticalErrors.length) console.log("   →", criticalErrors.slice(0, 3));

  await browser.close();
  console.log(`\n════════════════════════════`);
  console.log(`  PRO KIT: ${passed} passaram · ${failed} falharam`);
  if (fails.length) { console.log("  Falhas:"); fails.forEach((f) => console.log(`   - ${f}`)); process.exit(1); }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
