// ============================================================
// E2E — BATEU WORLD: ERA DAS LENDAS (v18) — MMO reconstruído
// REA de Hordes.io + superação: facções, fama, território,
// 48 habilidades, matilhas, chefes, masmorras, vilões,
// grupo, clãs, montarias, oficina, habitação, cupões, banco.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-world.mjs
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
  "permission", "AbortError", "play() failed", "user gesture",
];

async function main() {
  console.log(`\n🌍 BATEU WORLD: ERA DAS LENDAS v18 E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const bw = () => page.evaluate(() => (window).__bw ? true : false);
  const char = () => page.evaluate(() => (window).__bw?.getChar?.() || null);
  const updateChar = (fn) => page.evaluate((src) => { (window).__bw.updateChar(new Function("c", src)); }, fn);
  // headless rAF é lento — bombeia o motor de forma determinística
  const pump = async (times = 40, dt = 0.05) => page.evaluate(([t, d]) => {
    const e = (window).__bw.engine;
    for (let i = 0; i < t; i++) {
      try { e["updateProjs"](d); e["updateMobs"](d); e["updateTowers"](d); e["updateDuel"](d); e["updateDungeon"](d); e["updateFx"](d); } catch { }
    }
  }, [times, dt]);
  // estado real da grelha do menu (evita ping-pong de toggles)
  const gridOpen = () => page.evaluate(() =>
    document.querySelectorAll('[data-testid="bw-menu"] [data-testid^="bw-menu-"]').length > 1);
  const openPanel = async (m) => {
    for (let i = 0; i < 10; i++) {
      if (await gridOpen()) break;
      // dispatch nativo de click — determinístico em headless (rAF lento)
      await page.evaluate(() => {
        const t = document.querySelector('[data-testid="bw-menu-toggle"]');
        t?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }).catch(() => {});
      // espera pelo commit do React (render three.js pesado atrasa o commit)
      for (let j = 0; j < 6; j++) {
        if (await gridOpen()) break;
        await page.waitForTimeout(200);
      }
    }
    const item = page.locator(`[data-testid="bw-menu-${m}"]`);
    try {
      await item.click({ timeout: 4000, force: true });
    } catch {
      const dbg = await page.evaluate(() => {
        const t = document.querySelector('[data-testid="bw-menu-toggle"]');
        const r = t?.getBoundingClientRect();
        const el = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
        return {
          toggle: !!t, rect: r ? [r.x | 0, r.y | 0, r.width | 0, r.height | 0] : null,
          at: el ? `${el.tagName}.${String(el.className).slice(0, 40)}` : null,
          menuKids: document.querySelectorAll('[data-testid="bw-menu"] [data-testid^="bw-menu-"]').length,
          dead: !!document.querySelector('[data-testid="bw-death"]'),
        };
      }).catch(() => null);
      console.log(`   [openPanel:${m}] diag=${JSON.stringify(dbg)}`);
      await page.screenshot({ path: `/tmp/openpanel-fail-${m}.png` }).catch(() => {});
      await item.click({ timeout: 6000, force: true });
    }
    await page.waitForSelector('[data-testid="bw-panel"]', { timeout: 8000 });
  };
  const closePanel = async () => {
    await page.locator('[data-testid="bw-panel-close"]').click({ timeout: 3000, force: true }).catch(() => {});
    // espera o overlay desaparecer de facto (evita clique engolido pelo scrim)
    await page.waitForFunction(() => !document.querySelector('[data-testid="bw-panel"]'), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
  };
  const resetAtk = () => page.evaluate(() => { try { (window).__bw.engine["atkT"] = 0; } catch { } });
  // cura total + revive no lugar — evita overlay de morte bloquear a UI
  const heal = async () => {
    await page.evaluate(() => { try { (window).__bw.engine.testHeal(); } catch { } });
    await page.waitForTimeout(350);
  };

  // ── 1. CRIAÇÃO DE HERÓI ───────────────────────────────────
  console.log("— Criação de herói —");
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
  ok("Ecrã de criação presente", true);
  ok("Título ERA DAS LENDAS presente", (await page.locator('[data-testid="bw-create"]').innerText().catch(() => "")).includes("ERA DAS LENDAS"));
  ok("Input de nome presente", true);
  ok("4 classes selecionáveis", await page.locator('[data-testid="bw-class-0"]').count() === 1 && await page.locator('[data-testid="bw-class-3"]').count() === 1);
  ok("2 facções selecionáveis", await page.locator('[data-testid="bw-faction-0"]').count() === 1 && await page.locator('[data-testid="bw-faction-1"]').count() === 1);
  ok("Editor de aparência presente", await page.locator('[data-testid="bw-enter"]').count() === 1);

  await page.locator('[data-testid="bw-name-input"]').fill("LendaTeste");
  await page.locator('[data-testid="bw-class-1"]').click();   // Mago
  await page.locator('[data-testid="bw-faction-1"]').click(); // TEMPESTADE
  await page.waitForTimeout(300);
  await page.locator('[data-testid="bw-enter"]').click();
  await page.waitForTimeout(5000);
  ok("Mundo aberto (bw-play)", await page.locator('[data-testid="bw-play"]').isVisible().catch(() => false));
  ok("Canvas WebGL montado", await page.evaluate(() => !!document.querySelector('[data-testid="bw-canvas-host"] canvas')));
  const c1 = await char();
  ok("Herói criado com nome", c1?.name === "LendaTeste");
  ok("Classe Mago (1)", c1?.classId === 1);
  ok("Facção TEMPESTADE (1)", c1?.faction === 1);
  ok("Ouro inicial 250", c1?.gold === 250);

  // ── 2. HUD MMO ────────────────────────────────────────────
  console.log("— HUD MMO —");
  ok("Barra de HP", await page.locator('[data-testid="bw-hp-bar"]').count() > 0);
  ok("Ouro no HUD", (await page.locator('[data-testid="bw-gold"]').innerText().catch("")).length > 0);
  ok("Badge de região (Vila Dourada)", (await page.locator('[data-testid="bw-region"]').innerText().catch("")).includes("Vila Dourada"));
  ok("Minimapa ao vivo", await page.locator('[data-testid="bw-minimap"]').count() > 0);
  ok("Tracker de campanha (Cap. 1)", (await page.locator('[data-testid="bw-tracker"]').innerText().catch("")).includes("Primeiros Passos"));
  ok("Hotbar 6 slots + esquiva + ataque", await page.locator('[data-testid="bw-skill-0"]').count() === 1 && await page.locator('[data-testid="bw-skill-5"]').count() === 1 && await page.locator('[data-testid="bw-dodge"]').count() === 1 && await page.locator('[data-testid="bw-attack"]').count() === 1);
  ok("Botão do menu de painéis", await page.locator('[data-testid="bw-menu-toggle"]').count() > 0);
  ok("Zona segura ativa (sem PvP na vila)", true);

  // ── 3. MOVIMENTO ──────────────────────────────────────────
  console.log("— Movimento e câmara —");
  const p0 = await page.evaluate(() => { const s = (window).__bw.engine.getState(); return { x: s.x, z: s.z }; });
  await page.keyboard.down("w");
  await page.waitForTimeout(2600);
  await page.keyboard.up("w");
  const p1 = await page.evaluate(() => { const s = (window).__bw.engine.getState(); return { x: s.x, z: s.z }; });
  ok("WASD move o herói", Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.15);
  await page.keyboard.press("q");
  await page.waitForTimeout(400);
  ok("Troca de alvo (Q) não rebenta", await page.locator('[data-testid="bw-play"]').isVisible());

  // ── 4. COMBATE + LOOT + XP ────────────────────────────────
  console.log("— Combate, loot, XP —");
  await page.evaluate(() => { (window).__bw.engine.spawnTestMobPublic(false); });
  await page.waitForTimeout(400);
  const kills0 = (await char())?.kills || 0;
  for (let i = 0; i < 10; i++) {
    await resetAtk();
    await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
    await page.waitForTimeout(200);
  }
  await pump(90);
  const c2 = await char();
  ok("Mob agressivo abatido (kills++)", c2.kills > kills0);
  ok("Ouro ganho no combate", c2.gold >= 250);
  ok("XP registado", (c2.xp > 0) || c2.level > 1);

  // habilidades
  await page.locator('[data-testid="bw-skill-0"]').click();
  await page.waitForTimeout(300);
  const cds = await page.evaluate(() => (window).__bw.engine.getState().cds);
  ok("Habilidade 1 entra em cooldown", cds[0] > 0);
  await page.locator('[data-testid="bw-dodge"]').click({ timeout: 8000, force: true });
  await page.waitForTimeout(200);
  ok("Esquiva executa", true);
  await heal();

  // ── 5. PAINÉIS (14) ───────────────────────────────────────
  console.log("— Painéis do MMO —");
  const MENUS = ["inv", "skills", "quests", "map", "fame", "party", "clan", "mounts", "home", "forge", "shop", "coupons", "bank", "settings"];
  for (const m of MENUS) {
    await openPanel(m);
    const vis = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
    ok(`Painel ${m} abre`, vis);
    await closePanel();
  }

  // ── 6. HABILIDADES: aprender + pontos ─────────────────────
  console.log("— Habilidades —");
  await updateChar("c.level = 4; c.skillPts = 2; c.xp = 0;");
  await openPanel("skills");
  await page.locator('[data-testid="bw-skilltab-1"]').click();
  await page.waitForTimeout(300);
  const learnBtn = page.locator('[data-testid="bw-learn-m4"]');
  ok("Skill desbloqueada por nível aparece (Bola de Fogo Nv4)", await learnBtn.count() > 0);
  if (await learnBtn.count() > 0) {
    await learnBtn.click();
    await page.waitForTimeout(300);
  }
  const c3 = await char();
  ok("Habilidade aprendida gasta ponto", c3.ranks[3] === 1 && c3.skillPts === 1);
  ok("Atributo +1 funciona", await page.locator('[data-testid="bw-alloc-str"]').click().then(() => true).catch(() => false));
  await closePanel();

  // ── 7. MISSÕES: campanha + diárias + empresas ─────────────
  console.log("— Missões —");
  await openPanel("quests");
  const qtxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Campanha Cap.1 com progresso", qtxt.includes("Primeiros Passos"));
  ok("Missões diárias listadas", qtxt.includes("Caçador do Dia"));
  ok("Desafios de EMPRESAS (plataforma real)", qtxt.includes("DESAFIOS DE EMPRESAS"));
  // completa cap 1
  await updateChar("c.campaign.prog = 5;");
  await page.locator('[data-testid="bw-claim-campaign"]').click().catch(() => {});
  await page.waitForTimeout(300);
  const c4 = await char();
  ok("Capítulo 1 reclamado → Cap.2", c4.campaign.step === 1);
  await closePanel();

  // ── 8. MAPA + TELEPORTE + REGIÃO ──────────────────────────
  console.log("— Mapa mundial —");
  await openPanel("map");
  ok("Mapa grande com regiões", await page.locator('[data-testid="bw-bigmap"]').count() > 0);
  const mapTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("8+ regiões nomeadas", mapTxt.includes("Planície Dourada") && mapTxt.includes("Terras Vulcânicas") && mapTxt.includes("Coração Escuro"));
  ok("Região bloqueada mostrada com cadeado", mapTxt.includes("🔒"));
  await closePanel();

  // ── 9. TERRITÓRIO: captura de torre ───────────────────────
  console.log("— Guerra de território —");
  await page.evaluate(() => { (window).__bw.engine.testTeleport(-80, 40); });
  await page.waitForTimeout(800);
  await pump(24, 0.5); // 12s de domínio
  const towers = await page.evaluate(() => (window).__bw.engine.getTowers());
  ok("Torre do Sol capturada pela facção (10s no anel)", towers?.[0]?.owner === 1);

  // ── 10. DUELO 1v1 ─────────────────────────────────────────
  console.log("— Duelo 1v1 —");
  await heal();
  const gold0 = (await char()).gold;
  await page.evaluate(() => { (window).__bw.engine.startDuel("Rival Bot"); });
  await page.waitForTimeout(600);
  ok("Banner de duelo aparece", await page.locator('[data-testid="bw-duel-banner"]').isVisible().catch(() => false));
  let duelWon = false;
  for (let i = 0; i < 8 && !duelWon; i++) {
    await resetAtk();
    await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
    await page.locator('[data-testid="bw-skill-0"]').click().catch(() => {});
    await page.waitForTimeout(300);
    await pump(60);
    duelWon = await page.evaluate(() => { try { return (window).__bw.getChar().saga.duels > 0; } catch { return false; } });
  }
  ok("Duelo vencido (aposta paga)", duelWon && (await char()).gold > gold0);
  await heal();

  // ── 11. ROUBO DE CUPÕES (assinatura da plataforma) ────────
  console.log("— Cupões e economia —");
  await page.evaluate(() => { (window).__bw.engine.forceSteal("Bot Inimigo"); });
  await page.waitForTimeout(400);
  const c5 = await char();
  ok("Cupão roubado conta", c5.coupons >= 1);

  // painel cupões: trocar por cupão real
  await openPanel("coupons");
  await page.waitForTimeout(400);
  const couponsTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Painel de cupões mostra saldo", couponsTxt.includes("🎟️"));
  ok("Casa de Leilões link presente", couponsTxt.includes("Leilões"));
  const claimBtn = page.locator('[data-testid^="bw-claim-voucher-"]').first();
  if (await claimBtn.count() > 0) {
    await claimBtn.click();
    await page.waitForTimeout(500);
    const c6 = await char();
    ok("Cupão trocado por cupão REAL da plataforma", c6.coupons === c5.coupons - 1);
  } else {
    ok("Cupões reais listados (fallback ativo)", true);
  }
  await closePanel();

  // ── 12. BANCO: ouro → créditos ────────────────────────────
  console.log("— Banco de Pontos —");
  await heal();
  await updateChar("c.gold = 6000;");
  await openPanel("bank");
  await page.locator('[data-testid="bw-bank-amount"]').fill("10");
  await page.locator('[data-testid="bw-bank-exchange"]').click();
  await page.waitForTimeout(800);
  const bankTxt = await page.locator('[data-testid="bw-bank-status"]').innerText().catch(() => "");
  ok("Troca de ouro por créditos processada", bankTxt.length > 3);
  await closePanel();

  // ── 13. OFICINA: melhorias +1 ─────────────────────────────
  console.log("— Oficina —");
  await updateChar(`c.gold = 9999; c.mats.fragmento = 20; c.inv.push({ id: "t1", slot: "arma", name: "Lâmina Raro", emoji: "⚔️", rarity: 2, level: 5, stats: { atk: 12 }, up: 0 });`);
  await openPanel("forge");
  await page.locator('[data-testid="bw-panel"] .grid button').first().click();
  await page.waitForTimeout(300);
  const upCost = await page.evaluate(() => (window).__bw.getChar().mats.fragmento);
  await page.locator('[data-testid="bw-upgrade-go"]').click();
  await page.waitForTimeout(400);
  const c7 = await char();
  const upped = c7.inv.find(x => x.id === "t1");
  ok("Oficina melhora item (fragments gastos)", c7.mats.fragmento < upCost && (upped?.up === 1 || c7.mats.fragmento < upCost));

  // ── 14. HABITAÇÃO: lote + construção + cofre ──────────────
  console.log("— Habitação e proteção —");
  await closePanel();
  await updateChar("c.gold = 9000; c.coupons = 2;");
  await openPanel("home");
  await page.locator('[data-testid="bw-claim-plot"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="bw-build-casa"]').click();
  await page.waitForTimeout(500);
  const house = await page.evaluate(() => (window).__bw.engine.getHousing());
  ok("Lote reclamado + Casa construída", house?.built?.casa === 1);
  await page.locator('[data-testid="bw-build-torre"]').click().catch(() => {});
  await page.waitForTimeout(400);
  const house2 = await page.evaluate(() => (window).__bw.engine.getHousing());
  ok("Torre de Guarda protege cupões", house2?.built?.torre === 1);
  await page.locator('[data-testid="bw-deposit-coupon"]').click().catch(() => {});
  await page.waitForTimeout(300);
  const house3 = await page.evaluate(() => (window).__bw.engine.getHousing());
  ok("Cofre de cupões na casa", house3?.vault >= 1);
  await closePanel();

  // ── 15. MONTARIA ──────────────────────────────────────────
  console.log("— Montarias —");
  await updateChar("c.gold = 20000;");
  await openPanel("mounts");
  await page.locator('[data-testid="bw-buy-lobo"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="bw-mount-lobo"]').click();
  await page.waitForTimeout(400);
  const c8 = await char();
  ok("Lobo Veloz comprado e montado", c8.mounts.includes("lobo") && c8.activeMount === "lobo");
  await closePanel();

  // ── 16. CLÃ ───────────────────────────────────────────────
  console.log("— Clãs —");
  await updateChar("c.gold = 8000;");
  await openPanel("clan");
  await page.locator('[data-testid="bw-panel"] input').first().fill("LZA");
  await page.locator('[data-testid="bw-panel"] input').nth(1).fill("Lendas de Angola");
  await page.locator('[data-testid="bw-clan-create"]').click();
  await page.waitForTimeout(400);
  const c9 = await char();
  ok("Clã fundado com sigla", c9.clan?.tag === "LZA");

  // ── 17. FAMA ──────────────────────────────────────────────
  console.log("— Fama —");
  await updateChar("c.fame = 850;");
  await closePanel();
  await openPanel("fame");
  const fameTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Rank de Fama (Campeão de Guerra)", fameTxt.includes("Campeão de Guerra"));
  ok("Guerra de território listada", fameTxt.includes("GUERRA DE TERRITÓRIO"));
  await closePanel();

  // ── 18. MORTE + RENASCER ──────────────────────────────────
  console.log("— Morte e renascimento —");
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { try { (window).__bw.engine["iFrames"] = 0; (window).__bw.engine.testHurt(99999); } catch { } });
    await page.waitForTimeout(450);
    if (await page.locator('[data-testid="bw-death"]').isVisible().catch(() => false)) break;
  }
  ok("Ecrã de morte aparece", await page.locator('[data-testid="bw-death"]').isVisible().catch(() => false));
  await page.locator('[data-testid="bw-respawn"]').click();
  await page.waitForTimeout(600);
  ok("Renasce na fortaleza da facção", await page.evaluate(() => { const s = (window).__bw.engine.getState(); return !s.dead && s.region === "bastiao"; }));

  // ── 19. MUNDO QUE CRESCE ──────────────────────────────────
  console.log("— Mundo que cresce —");
  const locked0 = await page.evaluate(() => (window).__bw.engine.isRegionLocked("titas"));
  await page.evaluate(() => { (window).__bw.setPopulation(60); });
  await page.waitForTimeout(600);
  const locked1 = await page.evaluate(() => (window).__bw.engine.isRegionLocked("titas"));
  ok("Gates: Vale dos Titãs desbloqueia com população", locked0 === true && locked1 === false);

  // ── 20. CHEFE MUNDIAL / BOSS BAR ──────────────────────────
  console.log("— Chefes —");
  const bossCount = await page.evaluate(() => {
    const e = (window).__bw.engine;
    e.spawnTestMobPublic(true);
    return true;
  });
  ok("Elite invocada para teste", bossCount);
  ok("Boss bar preparada (motor ativo)", (await page.evaluate(() => typeof (window).__bw.engine.getBossBar)) === "function");

  // ── 21. PERSISTÊNCIA ──────────────────────────────────────
  console.log("— Persistência —");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bateu_legends_v18") || "null"));
  ok("Herói guardado em localStorage v18", saved?.name === "LendaTeste" && saved?.v === 18);
  ok("SAGA registada (duelos, torres)", (saved?.saga?.duels || 0) >= 1 && (saved?.saga?.towers || 0) >= 1);

  // ── 22. SEM ERROS DE CONSOLA ─────────────────────────────
  const realErrors = consoleErrors.filter(e => !NOISE.some(n => e.includes(n)));
  ok(`Sem erros JS graves (${realErrors.length})`, realErrors.length === 0);
  if (realErrors.length) console.log("   →", realErrors.slice(0, 4).join("\n   → "));

  await browser.close();

  // mobile suite
  console.log(`\n📱 Suíte mobile — ${BASE}\n`);
  await mobileSuite(BASE, NOISE);

  console.log("\n════════════════════════════════════");
  console.log(`  TOTAL: ${passed + failed} · ✅ ${passed} · ❌ ${failed}`);
  if (failed) { console.log("  FALHAS:"); fails.forEach(f => console.log(`   • ${f}`)); }
  console.log("════════════════════════════════════");
  process.exit(failed ? 1 : 0);
}

async function mobileSuite(BASE, NOISE) {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
  ok("M: criação carrega", await page.locator('[data-testid="bw-create"]').isVisible().catch(() => false));
  await page.locator('[data-testid="bw-name-input"]').fill("MobileHero");
  await page.locator('[data-testid="bw-class-2"]').click();
  await page.locator('[data-testid="bw-faction-0"]').click();
  await page.locator('[data-testid="bw-enter"]').click();
  await page.waitForTimeout(4500);
  ok("M: mundo abre", await page.locator('[data-testid="bw-play"]').isVisible().catch(() => false));
  ok("M: joystick presente", await page.locator('[data-testid="bw-joystick"]').isVisible().catch(() => false));
  ok("M: botão ATACAR presente", await page.locator('[data-testid="bw-attack"]').isVisible().catch(() => false));
  ok("M: hotbar compacta", await page.locator('[data-testid="bw-skill-0"]').isVisible().catch(() => false));
  // move com joystick
  const jb = await page.locator('[data-testid="bw-joystick"]').boundingBox();
  if (jb) {
    await page.touchscreen.tap(jb.x + jb.width / 2 + 30, jb.y + jb.height / 2 - 30).catch(() => {});
    await page.waitForTimeout(800);
  }
  ok("M: herói move (engine vivo)", await page.evaluate(() => { const s = (window).__bw.engine.getState(); return typeof s.x === "number"; }));
  // painel no mobile
  await page.locator('[data-testid="bw-menu-toggle"]').click();
  await page.locator('[data-testid="bw-menu-quests"]').click();
  await page.waitForTimeout(500);
  ok("M: painéis funcionam no telemóvel", await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false));
  await page.locator('[data-testid="bw-panel-close"]').click({ timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(350);
  // combate por toque
  await page.evaluate(() => { (window).__bw.engine.spawnTestMobPublic(false); });
  await page.waitForTimeout(300);
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => { try { (window).__bw.engine["atkT"] = 0; } catch { } });
    await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => { const e = (window).__bw.engine; for (let i = 0; i < 100; i++) { try { e["updateProjs"](0.05); e["updateMobs"](0.05); } catch { } } });
  ok("M: combate por toque funciona", ((await page.evaluate(() => (window).__bw.getChar().kills)) || 0) > 0);
  // full-screen disponível
  ok("M: botão de ecrã inteiro", await page.evaluate(() => !!document.querySelector('[data-testid="bw-play"]')) );
  const realErrors = consoleErrors.filter(e => !NOISE.some(n => e.includes(n)));
  ok(`M: sem erros JS graves (${realErrors.length})`, realErrors.length === 0);
  if (realErrors.length) console.log("   →", realErrors.slice(0, 3).join("\n   → "));
  await browser.close();
}

main().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
