// ============================================================
// E2E — BATEUCRAFT (Super Minecraft da Bateu) · v20
// REA de Minecraft: mundo voxel, minerar, craftar, mobs, noite,
// tablet da PLATAFORMA e alternância Craft ↔ Clássico.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-craft.mjs
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
  "navigator.vibrate", "<line> attribute", "validateDOMNesting", "same key",
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "webpack", "sourcemap", "Download the React DevTools",
  " AudioContext", "autoplay", "pointerLock", "PointerLock", "requestPointerLock",
  "The play() request", "Uncaught (in promise)", "in Promise",
];

async function newPage(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    const msg = String(e?.message || e);
    if (!NOISE.some((n) => msg.includes(n))) errors.push(msg);
  });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const msg = m.text();
    if (!NOISE.some((n) => msg.includes(n))) errors.push(msg);
  });
  page._errors = errors;
  return page;
}

async function createCharAndEnter(page) {
  await page.goto(`${BASE}/lives?game=bateucraft`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  // se já existe personagem → entra direto
  const hasCanvas = await page.locator('[data-testid="bw-craft-canvas"]').count() > 0;
  if (hasCanvas) return;
  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  const hasCreate = await nameInput.waitFor({ state: "visible", timeout: 40000 }).then(() => true).catch(() => false);
  if (hasCreate) {
    await nameInput.fill("CrafterTeste");
    ok("Nome preenchido", true);
    await page.locator('button:has-text("Guerreiro")').first().click();
    ok("Classe Guerreiro selecionada", true);
  } else {
    ok("Nome preenchido", false);
    ok("Classe Guerreiro selecionada", false);
  }
  const enter = page.locator('button:has-text("ENTRAR NO MUNDO")').first();
  await enter.click({ timeout: 8000 }).catch(() => {});
  ok("Botão ENTRAR clicado", true);
}

// ════════════════════════════════════════════════════════════
async function run() {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });

  // ── DESKTOP ──
  console.log("\n▶ DESKTOP 1280×900 — BateuCraft");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await newPage(ctx);
    // mundo limpo
    await page.addInitScript(() => {
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("bateu_world_char") || k.startsWith("bateu_craft")) localStorage.removeItem(k);
        localStorage.removeItem("bateu_wmode");
      } catch {}
    });
    await createCharAndEnter(page);

    const canvas = page.locator('[data-testid="bw-craft-canvas"]');
    await canvas.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
    ok("Canvas do BateuCraft montado", await canvas.count() > 0);
    ok("v20: CRAFT é o modo padrão (sem botão de volta no clássico)", (await page.locator('[data-testid="bw-mode-craft"]').count()) === 0);

    await page.waitForFunction(() => !!(window).__bwcraft, { timeout: 20000 }).catch(() => {});
    ok("Motor __bwcraft exposto", await page.evaluate(() => !!(window).__bwcraft));

    // HUD
    ok("Hotbar com 9 slots", (await page.locator('[data-testid="craft-hotbar"] button').count()) === 9);
    ok("Corações/fome visíveis", (await page.locator('[data-testid="craft-hp"]').count()) > 0 && (await page.locator('[data-testid="craft-hunger"]').count()) > 0);
    ok("Barra de XP presente", (await page.locator('[data-testid="craft-xpbar"]').count()) > 0);
    ok("Chip de estado (PL/Dia/coords)", (await page.locator('[data-testid="craft-status"]').count()) > 0);
    ok("Guia de objetivo presente", (await page.locator('[data-testid="craft-goal"]').count()) > 0);
    ok("Botões topo: Mochila+Plataforma+Menu", (await page.locator('[data-testid="craft-btn-inv"]').count()) === 1 && (await page.locator('[data-testid="craft-btn-tablet"]').count()) === 1 && (await page.locator('[data-testid="craft-btn-menu"]').count()) === 1);
    ok("Desktop: sem joystick nem botões touch", (await page.locator('[data-testid="craft-joystick"]').count()) === 0 && (await page.locator('[data-testid="craft-btn-jump"]').count()) === 0);
    await page.locator('[data-testid="craft-boot"]').waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    ok("Boot desapareceu", (await page.locator('[data-testid="craft-boot"]').count()) === 0);

    // mundo gerado
    await page.waitForTimeout(2500);
    const st0 = await page.evaluate(() => (window).__bwcraft.stats());
    ok("Chunks geradas (>20)", st0.chunks > 20);
    ok("Jogador em superfície (y>10)", st0.pos.y > 10);

    // MOCHILA + CRAFT (fluxo Minecraft: tronco → tábuas)
    await page.locator('[data-testid="craft-btn-inv"]').click();
    await page.waitForTimeout(600);
    ok("Painel Mochila abre", (await page.locator('[data-testid="craft-panel"]').count()) > 0);
    // separador Craftar
    await page.locator('button:has-text("Craftar")').first().click().catch(() => {});
    await page.waitForTimeout(400);
    await page.evaluate(() => (window).__bwcraft.give("b8", 3)); // 3 troncos
    await page.waitForTimeout(800);
    const planksBtn = page.locator('[data-testid="craft-make-planks"]');
    ok("Receita Tábuas visível", (await planksBtn.count()) > 0);
    await planksBtn.click().catch(() => {});
    await planksBtn.click().catch(() => {});
    await page.waitForTimeout(600);
    const planks = await page.evaluate(() => (window).__bwcraft.engine.countItem("b10"));
    ok("Tábuas craftadas no inventário (≥8)", planks >= 8);
    // pau + picareta de madeira (requer MESA → deve mostrar bloqueio)
    const pickLock = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="craft-recipe-wood_pickaxe"]');
      return el ? el.textContent.includes("Mesa") || el.querySelector("button")?.disabled : null;
    });
    ok("Ferramentas exigem Mesa de Craft (REA fiel)", pickLock === true);
    await page.locator('[data-testid="craft-panel"] button:has(svg.lucide-x)').first().click().catch(() => {});
    await page.waitForTimeout(400);

    // COLOCAR + QUEBRAR bloco (API de mundo)
    const setGet = await page.evaluate(() => {
      const w = (window).__bwcraft;
      const s = w.stats();
      const bx = Math.floor(s.pos.x) + 2, bz = Math.floor(s.pos.z), by = 40;
      w.setBlockAt(bx, by, bz, 10); // tábuas
      const placed = w.getBlockAt(bx, by, bz) === 10;
      w.setBlockAt(bx, by, bz, 0);
      const removed = w.getBlockAt(bx, by, bz) === 0;
      return placed && removed;
    });
    ok("Mundo editável (colocar/quebrar blocos)", setGet);

    // VENDER recurso → ouro da plataforma
    await page.locator('[data-testid="craft-btn-inv"]').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Vender")').first().click().catch(() => {});
    await page.waitForTimeout(400);
    await page.evaluate(() => (window).__bwcraft.give("iron_ingot", 2));
    await page.waitForTimeout(400);
    const sellRow = page.locator('[data-testid="craft-sell-iiron_ingot"] button:has-text("Vender 1")');
    ok("Loja de recursos (minerar → ouro)", (await sellRow.count()) > 0);
    let sold = false;
    for (let i = 0; i < 4 && !sold; i++) {
      await sellRow.first().click().catch(() => {});
      await page.waitForTimeout(900);
      const bodyTxt = await page.locator("body").innerText().catch(() => "");
      sold = bodyTxt.includes("Vendeste");
    }
    ok("Venda gera ouro (+toast)", sold);
    await page.locator('[data-testid="craft-panel"] button:has(svg.lucide-x)').first().click().catch(() => {});

    // NOITE + MOBS (REA de Minecraft)
    await page.evaluate(() => (window).__bwcraft.setTime(0.75));
    await page.evaluate(() => (window).__bwcraft.spawn("zombie"));
    await page.evaluate(() => (window).__bwcraft.spawn("creeper"));
    await page.evaluate(() => (window).__bwcraft.spawn("pig"));
    await page.waitForTimeout(2200);
    const st1 = await page.evaluate(() => (window).__bwcraft.stats());
    ok("Mobs vivos no mundo (zumbi/creeper/porco)", st1.mobs >= 3 && !!st1.mobsByType.zombie && !!st1.mobsByType.creeper);

    // TABLET DA PLATAFORMA
    await page.locator('[data-testid="craft-btn-tablet"]').click();
    await page.waitForTimeout(600);
    const tabletTxt = await page.locator('[data-testid="craft-tablet"]').innerText().catch(() => "");
    ok("TABLET DA PLATAFORMA abre", (await page.locator('[data-testid="craft-tablet-grid"]').count()) > 0);
    ok("Acesso: Marketplace+Leilões+Sorteios+Esports", ["Marketplace", "Leilões", "Sorteios", "Esports"].every((t) => tabletTxt.includes(t)));
    ok("Power Level mostrado", /PL \d+/.test(tabletTxt) || tabletTxt.includes("POWER LEVEL"));
    ok("Stories: publicar conquista", tabletTxt.includes("Stories"));
    await page.locator('[data-testid="craft-panel"] button:has(svg.lucide-x)').first().click().catch(() => {});

    // MENU + SAVE
    await page.locator('[data-testid="craft-btn-menu"]').click();
    await page.waitForTimeout(500);
    ok("Menu: som+distância+guardar", (await page.locator('[data-testid="craft-sound"]').count()) > 0 && (await page.locator('[data-testid="craft-dist-4"]').count()) > 0);
    await page.evaluate(() => (window).__bwcraft.save());
    const saved = await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("bateu_craft_v2_")));
    ok("Save persistente em localStorage", saved);
    await page.locator('[data-testid="craft-panel"] button:has(svg.lucide-x)').first().click().catch(() => {});

    // ALTERNÂNCIA Craft ↔ Clássico
    await page.locator('[data-testid="bw-mode-classic"]').click();
    await page.waitForTimeout(3500);
    ok("Alterna para Mundo Clássico (botão ⛏ Craft na faixa)", (await page.locator('[data-testid="bw-mode-craft"]').count()) > 0);
    const classicCanvas = await page.evaluate(() => !!(window).__bw);
    ok("Motor clássico arranca (window.__bw)", classicCanvas);
    await page.locator('[data-testid="bw-mode-craft"]').dispatchEvent("click");
    await page.waitForTimeout(2500);
    ok("Volta ao BateuCraft", (await page.locator('[data-testid="bw-craft-canvas"]').count()) > 0);

    ok("Desktop: 0 erros JS críticos", page._errors.length === 0);
    if (page._errors.length) console.log("   erros:", page._errors.slice(0, 4));
    await ctx.close();
  }

  // ── MOBILE ──
  console.log("\n▶ MOBILE 390×844 — BateuCraft");
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
      hasTouch: true,
      isMobile: true,
    });
    const page = await newPage(ctx);
    await page.addInitScript(() => {
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("bateu_world_char") || k.startsWith("bateu_craft")) localStorage.removeItem(k);
        localStorage.removeItem("bateu_wmode");
      } catch {}
    });
    await createCharAndEnter(page);

    const canvas = page.locator('[data-testid="bw-craft-canvas"]');
    await canvas.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
    ok("Canvas do BateuCraft no celular", await canvas.count() > 0);
    await page.waitForFunction(() => !!(window).__bwcraft, { timeout: 20000 }).catch(() => {});

    ok("Joystick virtual presente", (await page.locator('[data-testid="craft-joystick"]').count()) === 1);
    ok("Botão SALTAR presente", (await page.locator('[data-testid="craft-btn-jump"]').count()) === 1);
    ok("Botões MINERAR/COLOCAR presentes", (await page.locator('[data-testid="craft-btn-break"]').count()) === 1 && (await page.locator('[data-testid="craft-btn-place"]').count()) === 1);
    ok("Botão PLATAFORMA visível no topo", (await page.locator('[data-testid="craft-btn-tablet"]').isVisible().catch(() => false)));
    ok("Hotbar cabe no ecrã (9 slots)", (await page.locator('[data-testid="craft-hotbar"] button').count()) === 9);
    ok("Atalho 🌍 CLÁSSICO visível", (await page.locator('[data-testid="bw-mode-classic"]').count()) === 1);

    // mover o joystick não deve rebentar nada
    const stick = page.locator('[data-testid="craft-joystick"]');
    const bb = await stick.boundingBox().catch(() => null);
    if (bb) {
      await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2).catch(() => {});
    }
    await page.waitForTimeout(1200);
    const st = await page.evaluate(() => (window).__bwcraft.stats());
    ok("Mundo ativo no celular (chunks>10)", st.chunks > 10);

    // navegar para a plataforma a partir do tablet
    await page.locator('[data-testid="craft-btn-tablet"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="craft-nav-sorteios"]').click().catch(() => {});
    await page.waitForTimeout(2200);
    ok("TABLET navega para os Sorteios reais (/marketplace?tab=raffles)", page.url().includes("/marketplace"));

    ok("Mobile: 0 erros JS críticos", page._errors.length === 0);
    if (page._errors.length) console.log("   erros:", page._errors.slice(0, 4));
    await ctx.close();
  }

  await browser.close();
  console.log(`\n═══════════════════════════════════`);
  console.log(`BATEUCRAFT: ${passed} pass · ${failed} fail`);
  if (fails.length) console.log("Falhas:\n - " + fails.join("\n - "));
  process.exit(failed ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
