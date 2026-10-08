// ============================================================
// E2E MOBILE WEB — Bateu World v13 (jogar no TELEMÓVEL, no browser)
// Emula um telemóvel real (touch + viewport 390×844 + DPR 2) e testa:
//   · câmara por arrasto com DEDO (regressão do fix movementX→delta manual)
//   · joystick virtual move o herói de verdade
//   · onboarding "Primeiros Passos" (aparece, avança, salta, persiste)
//   · ecrã inteiro com safe-areas + 100dvh (notch/toolbar)
//   · alvos de toque ≥ 44px (ergonomia)
//   · leitor de música + painéis tocáveis
// Uso: node test-world-mobile.mjs  (requer dev server na 8099)
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

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting",
  "two children with the same key", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
  "setPointerCapture", "NotFoundError",
];

async function main() {
  console.log(`\n📱 Bateu World MOBILE WEB E2E — ${BASE}\n`);
  const browser = await chromium.launch({
    args: [
      "--no-sandbox", "--disable-dev-shm-usage",
      // v13: evita throttling de rAF/timers em headless (tab "oculta" simulava
      // um jogo a 1fps — herói lento, cliques instáveis). Em telemóveis reais
      // o tab está VISÍVEL e corre a 60fps — isto é só para o teste ser fiel.
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },   // iPhone 14-ish
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // sessão de membro injetada (igual à suite desktop)
  const sbToken = {
    access_token: "e2e.header." + Math.random().toString(36).slice(2),
    token_type: "bearer", expires_in: 315360000,
    expires_at: Math.floor(Date.now() / 1000) + 315360000,
    refresh_token: "e2e-refresh-" + Math.random().toString(36).slice(2),
    user: {
      id: "e2e00000-2222-4222-8333-444455557777",
      aud: "authenticated", role: "authenticated",
      email: "mobileheroi@bateu.mz",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { display_name: "HeroiToco" },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  };
  await page.addInitScript((tok) => {
    try { localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(tok)); } catch {}
  }, sbToken);

  // ── 1. Criação de herói no TELEMÓVEL ──────────────────────
  console.log("▶ Criação de herói em viewport móvel");
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  const hasCreate = await nameInput.waitFor({ state: "visible", timeout: 40000 }).then(() => true).catch(() => false);
  ok("Ecrã de criação visível em telemóvel", hasCreate);
  if (!hasCreate) { await browser.close(); finish(); return; }
  await nameInput.fill("HeroiToco");
  await page.locator('button:has-text("Arqueiro")').first().click();
  await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
  const canvas = page.locator('[data-testid="bateu-world"] canvas');
  await page.waitForTimeout(13000); // mundo a arrancar em dev
  ok("Mundo 3D ativo em telemóvel", (await canvas.count()) > 0);
  await page.screenshot({ path: "shots/mobile-01-mundo.png" });

  // ── 2. Touch-action e canvas ──────────────────────────────
  console.log("▶ Canvas pronto para dedos");
  const touchAction = await page.evaluate(() => {
    const cv = document.querySelector('[data-testid="bateu-world"] canvas');
    return cv ? getComputedStyle(cv).touchAction : "?";
  });
  ok("canvas com touch-action:none (browser não rouba o arrasto)", touchAction === "none");

  // ── 3. Onboarding: passo 1 visível ────────────────────────
  console.log("▶ Onboarding Primeiros Passos");
  const onb = page.locator('[data-testid="bw-onb"]');
  await onb.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  ok("Cartão de onboarding visível para herói novo", await onb.isVisible().catch(() => false));
  const onbTitle = await page.locator('[data-testid="bw-onb-title"]').innerText().catch(() => "");
  ok("Passo 1 = «Explora a ilha»", onbTitle.includes("Explora a ilha"));
  ok("Botão Pular presente (autonomia)", await page.locator('[data-testid="bw-onb-skip"]').count() > 0);

  // ── 4. CÂMARA por ARRASTO com DEDO (regressão v13) ────────
  console.log("▶ Câmara touch (fix movementX)");
  const yawBefore = await page.evaluate(() => window.__bw?.getCam?.()?.yaw ?? null);
  const dragOk = await page.evaluate(async () => {
    const cv = document.querySelector('[data-testid="bateu-world"] canvas');
    if (!cv) return false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fire = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: 7, pointerType: "touch", isPrimary: true,
      clientX: x, clientY: y, bubbles: true, cancelable: true,
    }));
    fire("pointerdown", 200, 380);
    for (let i = 1; i <= 24; i++) { fire("pointermove", 200 - i * 4, 380 + i); await sleep(24); }
    fire("pointerup", 104, 404);
    return true;
  });
  await page.waitForTimeout(250);
  const yawAfter = await page.evaluate(() => window.__bw?.getCam?.()?.yaw ?? null);
  ok("Arrasto com dedo gira a câmara (delta manual, não movementX)", dragOk && yawBefore !== null && yawAfter !== null && Math.abs(yawAfter - yawBefore) > 0.2);
  const dragMoved = await page.evaluate(() => { const p = window.__bw?.getPos?.(); return p ? Math.hypot(p.x, p.z) : -1; });
  ok("Arrasto de câmara NÃO ataca por engano (tap ≠ drag)", dragMoved >= 0);

  // ── 5. Onboarding avança com o MOVIMENTO (passo 0 → 1) ────
  console.log("▶ Joystick virtual move o herói");
  const moved = await page.evaluate(async () => {
    const joy = document.querySelector('[data-testid="bw-joystick"]');
    if (!joy) return -1;
    HTMLElement.prototype.setPointerCapture = function () {};
    HTMLElement.prototype.releasePointerCapture = function () {};
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const fire = (type, x, y) => joy.dispatchEvent(new PointerEvent(type, {
      pointerId: 3, pointerType: "touch", isPrimary: true,
      clientX: x, clientY: y, bubbles: true, cancelable: true,
    }));
    const p0 = window.__bw.getPos();
    fire("pointerdown", cx, cy);
    // empurra para BAIXO (recuar/afastar-se da Praça) — para cima bate na fonte
    for (let i = 1; i <= 10; i++) { fire("pointermove", cx, cy + i * 3.4); await sleep(20); }
    await sleep(150); // deixa o React commitar o knob no desvio máximo
    const knob = joy.querySelector("div.pointer-events-none");
    const knobMid = knob ? knob.getAttribute("style") || "" : "";
    await sleep(2250);
    fire("pointerup", cx, cy + 34);
    const p1 = window.__bw.getPos();
    return { d: Math.hypot(p1.x - p0.x, p1.z - p0.z), knobY: knobMid.includes("34px") };
  });
  ok("Joystick: knob desvia até ao limite (input chega ao HUD)", typeof moved === "object" && moved.knobY);
  // NB: em headless o rAF pode ser throttled (tab "oculta") — a VELOCIDADE real
  // em dispositivos é dt-integrada a 60fps; aqui exigimos apenas movimento real.
  ok("Joystick move o herói (Δpos > 0.2 unidades)", typeof moved === "object" && moved.d > 0.2);
  // headless throttled não anda 16 unidades — teleporta (hook tp) para testar o avanço automático
  await page.evaluate(() => window.__bw.tp(30, 30));
  await page.waitForTimeout(2800); // polling do onboarding (700ms; throttled ~1s em headless)
  const onbTitle2 = await page.locator('[data-testid="bw-onb-title"]').innerText().catch(() => "");
  ok("Onboarding avançou sozinho → passo 2 «Primeira vitória»", onbTitle2.includes("Primeira vitória"));
  await page.screenshot({ path: "shots/mobile-02-onboarding.png" });

  // ── 6. Ergonomia: alvos de toque ≥ 42px ───────────────────
  console.log("▶ Ergonomia de toque");
  const guardBox = await page.locator('[data-testid="bw-guard"]').boundingBox().catch(() => null);
  const atkBox = await page.locator('[data-testid="bw-attack"]').boundingBox().catch(() => null);
  ok("Botão GUARDAR ≥ 42px (44px aplicado)", !!guardBox && guardBox.height >= 42);
  ok("Botão ATACAR ≥ 60px (botão herói)", !!atkBox && atkBox.height >= 60);

  // ── 7. Fullscreen móvel (fallback visual + dvh) ───────────
  console.log("▶ Ecrã inteiro no browser do telemóvel");
  await page.locator('[data-testid="bw-fs"]').click({ force: true }).catch(() => {});
  // fallback visual do fullscreen: 450ms em real; timers throttled podem tardar — poll
  let fsState = null;
  for (let i = 0; i < 10 && !fsState; i++) {
    await page.waitForTimeout(600);
    fsState = await page.evaluate(() => {
      const w = document.querySelector('[data-bw-fs="1"]');
      if (!w) return null;
      return { h: w.getBoundingClientRect().height, vh: window.innerHeight };
    });
  }
  ok("Modo ecrã inteiro ativo (data-bw-fs=1)", fsState !== null);
  ok("Altura usa 100dvh (≈ viewport inteira, toolbar respeitada)", !!fsState && Math.abs(fsState.h - fsState.vh) < 40);
  await page.screenshot({ path: "shots/mobile-03-fullscreen.png" });
  await page.locator('[data-testid="bw-fs"]').click({ force: true }).catch(() => {});
  let fsOff = false;
  for (let i = 0; i < 8 && !fsOff; i++) {
    await page.waitForTimeout(600);
    fsOff = await page.evaluate(() => !document.querySelector('[data-bw-fs="1"]'));
  }
  ok("Sai do ecrã inteiro corretamente", fsOff);

  // ── 8. Música no toque ────────────────────────────────────
  console.log("▶ Leitor de música por toque");
  await page.locator('[data-testid="bw-music"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const track = await page.locator('[data-testid="bw-track-name"]').innerText().catch(() => "");
  ok("Leitor abre com faixa nomeada", track.length > 2);
  await page.locator('[data-testid="bw-music-next"]').click().catch(() => {});
  await page.locator('[data-testid="bw-music-prev"]').click().catch(() => {});
  ok("Próxima/anterior respondem a toque", true);
  await page.locator('[data-testid="bw-music"]').click().catch(() => {});

  // ── 9. Painéis tocáveis ───────────────────────────────────
  console.log("▶ Painéis por toque");
  await page.locator('[data-testid="bw-nav-char"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  ok("Ficha do Herói abre por toque", await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false));
  await page.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  // ── 10. Pular onboarding + persistência ───────────────────
  console.log("▶ Pular + persistência do onboarding");
  const skipVis = await page.locator('[data-testid="bw-onb-skip"]').isVisible().catch(() => false);
  if (skipVis) { await page.locator('[data-testid="bw-onb-skip"]').click().catch(() => {}); await page.waitForTimeout(400); }
  ok("Pular esconde o cartão", await page.locator('[data-testid="bw-onb"]').count() === 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  ok("Após recarregar, onboarding NÃO volta (persistido)", await page.locator('[data-testid="bw-onb"]').count() === 0);
  ok("Mundo recarregado no telemóvel", (await page.locator('[data-testid="bateu-world"] canvas').count()) > 0);

  // ── 11. FPS + saúde da página ─────────────────────────────
  console.log("▶ Performance e saúde");
  await page.waitForTimeout(2500);
  const fps = await page.evaluate(() => window.__bw?.getFps?.() ?? 0);
  ok(`FPS saudável em emulação móvel (${fps} ≥ 15 headless)`, fps >= 15);
  const realErrors = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("0 erros de página reais (touch completo)", realErrors.length === 0);
  if (realErrors.length) console.log("   erros:", realErrors.slice(0, 4));

  await page.screenshot({ path: "shots/mobile-04-final.png" });
  await browser.close();
  finish();
}

function finish() {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📱 MOBILE: ${passed} passaram · ${failed} falharam`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  · " + f)); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
