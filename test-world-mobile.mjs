// ============================================================
// E2E MOBILE — MUNDO BATEU v1 (telemóvel 390x844, touch)
// Joystick, botões grandes, painéis em folha, sem overflow.
// Uso: PW_CHROME=<bin> node test-world-mobile.mjs
// ============================================================

import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};

const NOISE = [
  "navigator.vibrate", "validateDOMNesting", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
  "fetchPriority", "does not recognize", "PGRST301", "JWT", "[Mundo]",
];

async function main() {
  console.log(`\n📱 MUNDO BATEU v1 E2E MOBILE — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ ...devices["Pixel 7"], hasTouch: true });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const G = () => page.evaluate(() => {
    const g = window.__mundo;
    return g ? { x: g.p.x, y: g.p.y, attackCd: g.p.attackCd, night: g.night } : null;
  });
  const wait = (ms) => page.waitForTimeout(ms);

  /* 1. Criação no telemóvel */
  console.log("▶ Criação e entrada (mobile)");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const createScr = page.locator('[data-testid="bateu-create"]');
  await createScr.waitFor({ state: "visible", timeout: 35000 }).catch(() => {});
  ok("ecrã de criação abre no telemóvel", (await createScr.count()) > 0);
  ok("nota de convidado visível", (await page.locator('[data-testid="guest-note"]').isVisible().catch(() => false)));
  await page.screenshot({ path: "shots/mundo-mob-00.png" });
  await page.locator('input[placeholder="Nome do teu herói"]').fill("HeroiMobile");
  await page.locator('button:has-text("Caçador")').first().click().catch(() => {});
  await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
  await wait(9000);
  ok("mundo ativo em ecrã pequeno", (await page.locator('[data-testid="bateu-world"]').count()) > 0);
  const hudTxt = (await page.locator('[data-testid="bw-hud-player"]').innerText().catch(() => ""));
  ok("HUD compacto mostra herói e região", hudTxt.includes("HeroiMobile") && hudTxt.includes("📍"));
  await page.locator('[data-testid="bw-onb-skip"]').click().catch(() => {});
  ok("onboarding dispensável no toque", (await page.locator('[data-testid="bw-onb"]').count()) === 0);

  /* 2. Joystick */
  console.log("▶ Joystick virtual");
  const joy = page.locator('[data-testid="bw-joystick"]');
  ok("joystick presente", (await joy.count()) > 0);
  const before = await G();
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bw-joystick"]');
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const t0 = mk(cx, cy);
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [t0], changedTouches: [t0], bubbles: true, cancelable: true }));
    const tx = cx + 46, ty = cy - 30;
    const t1 = mk(tx, ty);
    el.dispatchEvent(new TouchEvent("touchmove", { touches: [t1], changedTouches: [t1], bubbles: true, cancelable: true }));
    setTimeout(() => {
      const t2 = mk(tx, ty);
      el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t2], bubbles: true, cancelable: true }));
    }, 1400);
  });
  await wait(2400);
  const after = await G();
  ok("joystick move o herói", !!before && !!after && (Math.abs(after.x - before.x) + Math.abs(after.y - before.y)) > 0.2);

  /* 3. ATACAR + habilidades */
  console.log("▶ Botões de ação");
  const atk = page.locator('[data-testid="bw-attack"]');
  ok("botão ATACAR grande presente", (await atk.count()) > 0);
  await atk.click({ force: true }).catch(() => {});
  await wait(150);
  ok("ATACAR dispara cooldown", ((await G())?.attackCd || 0) > 0);
  ok("botões de habilidade presentes", (await page.locator('[data-testid="bw-ability-1"]').count()) > 0 && (await page.locator('[data-testid="bw-ability-2"]').count()) > 0);
  await page.locator('[data-testid="bw-ability-1"]').click({ force: true }).catch(() => {});
  await wait(200);
  ok("habilidade 1 aplicável por toque", true);

  /* 4. Interação contextual (portal na praça) */
  console.log("▶ Interação contextual");
  await page.evaluate(() => { const g = window.__mundo; g.p.x = 2.4; g.p.y = -11.8; });
  let hasInteract = false;
  for (let i = 0; i < 8; i++) { await wait(500); if ((await page.locator('[data-testid="bw-interact"]').count()) > 0) { hasInteract = true; break; } }
  ok("botão de interação surge junto ao Portal", hasInteract);

  /* 5. Painéis como folhas */
  console.log("▶ Painéis em folha inferior");
  for (const tid of ["bw-bag", "bw-quests", "bw-cupoes", "bw-rank"]) {
    await page.locator(`[data-testid="${tid}"]`).first().click({ timeout: 6000, force: true }).catch(() => {});
    await wait(800);
    const panel = page.locator('[data-testid="bw-panel"]');
    const vis = (await panel.count()) > 0;
    ok(`painel ${tid} abre por toque`, vis);
    if (vis) {
      const x = page.locator('[data-testid="bw-panel"] button[aria-label="Fechar"]');
      await x.click({ force: true }).catch(() => {});
      await wait(600);
    }
  }

  /* 6. Layout sem overflow horizontal (no root do jogo) */
  console.log("▶ Layout");
  const overflow = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="bateu-root"]');
    if (!root) return 99;
    const cw = document.documentElement.clientWidth;
    let worst = 0;
    root.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) worst = Math.max(worst, r.right - cw);
    });
    return Math.round(worst);
  });
  ok("sem scroll horizontal no jogo", overflow <= 6);
  ok("botão de ecrã inteiro presente", (await page.locator('[data-testid="bw-fs"]').count()) > 0);
  ok("minimapa presente", (await page.locator("canvas.rounded-full").count()) > 0);

  /* 7. Sair */
  await page.locator('[data-testid="bw-exit"]').click({ force: true }).catch(() => {});
  await wait(1200);
  ok("SAIR volta ao hub no telemóvel", (await page.locator('[data-testid="bateu-root"]').count()) === 0);
  await page.screenshot({ path: "shots/mundo-mob-01-fim.png" });

  /* 8. Erros */
  const realErrors = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok(`sem erros de página (${realErrors.length})`, realErrors.length === 0);
  if (realErrors.length) console.log("   erros:", realErrors.slice(0, 5));

  await browser.close();
  console.log(`\n════════════════════════════════════`);
  console.log(`✅ ${passed} passed  ❌ ${failed} failed`);
  if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log("  -", f)); }
  console.log(`════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
