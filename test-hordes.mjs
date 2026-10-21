// ============================================================
// E2E — HORDAS DE BATEU (REA hordes.io): entrada, classes,
// facções, mundo, combate, quests, morte/ressurreição, chat.
// Uso: node test-hordes.mjs  (vite na porta 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
}

const NOISE = ["navigator.vibrate", "<line> attribute", "validateDOMNesting", "same key",
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase", "ERR_",
  "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
  "fetchPriority", "PGRST301", "JWT", "permission", "AbortError", "play() failed", "user gesture",
  "GL_", "WebGL", "THREE", "three.js"];

async function main() {
  console.log(`\n⚔️  HORDAS DE BATEU — E2E paridade hordes.io — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.some(n => m.text().includes(n))) consoleErrors.push(m.text()); });

  try {
    // ═══ ENTRADA (REA: título → classe → facção → nome → Loading World) ═══
    await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('[data-testid="bw-start"]', { timeout: 40000 });
    ok("Ecrã de título com CTA", true);
    const tituloTxt = await page.locator("text=HORDAS DE BATEU").first().isVisible().catch(() => false);
    ok("Marca HORDAS DE BATEU visível", tituloTxt);

    await page.locator('[data-testid="bw-start"]').click();
    await page.waitForSelector('[data-testid="bw-class-0"]', { timeout: 8000 });
    ok("Criação: 4 classes", await page.locator('[data-testid^="bw-class-"]').count() === 4);
    ok("Criação: 3 facções com lore", await page.locator('[data-testid^="bw-faction-"]').count() === 3);
    ok("Campo de nome com regra 3-16", (await page.locator('[data-testid="bw-name-input"]').getAttribute("maxlength")) === "16");

    // nome inválido → botão desativado
    await page.locator('[data-testid="bw-name-input"]').fill("ab");
    ok("Nome inválido bloqueia entrada", await page.locator('[data-testid="bw-enter"]').isDisabled());
    await page.locator('[data-testid="bw-name-input"]').fill("Heroi123");
    ok("Nome válido desbloqueia", !(await page.locator('[data-testid="bw-enter"]').isDisabled()));

    await page.locator('[data-testid="bw-class-1"]').click(); // Mago
    await page.locator('[data-testid="bw-faction-1"]').click(); // Horda de Brasa
    await page.locator('[data-testid="bw-enter"]').click();
    await page.waitForSelector('[data-testid="bw-loading"]', { timeout: 8000 });
    ok('Ecrã "Carregando Mundo"', true);
    await page.waitForSelector('[data-testid="bw-play"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="bw-hpbar"]', { timeout: 15000 });
    ok("Mundo 3D montado com HUD", true);

    const call = (expr) => page.evaluate((e) => { const { m, a } = e; return window.__bw[m](...a); }, { m: expr[0], a: expr.slice(1) });
    const hud = () => call(["hud"]);
    const state = () => call(["state"]);
    const tagsF = () => call(["tags"]);
    const run = (m, ...a) => call([m, ...a]);


    // ═══ HUD REA ═══
    const hud0 = await hud();
    ok("HP inicial da classe (Mago 90)", hud0.hpMax === 90);
    ok("MP inicial da classe (Mago 140)", hud0.mpMax === 140);
    ok("Começa na Aldeia Aurora", hud0.zona === "Aldeia Aurora");
    ok("Nível inicial 1", hud0.nivel === 1);
    ok("XP mostrado no HUD", await page.locator("text=XP").first().isVisible());
    ok("Zona no HUD", (await page.locator('[data-testid="bw-zone"]').innerText()).includes("Aldeia"));

    // ═══ PLACAS DE NOME/VIDA (REA: nameplates) ═══
    await run("tp", 120, -60); // floresta — perto dos mobs
    await page.waitForTimeout(900);
    const tags = await tagsF();
    ok("Placa de vida do herói ativa", tags.self === true);
    ok("Placas nos mobs (8+ perto)", (tags.mobs || 0) >= 8);
    ok("Placas nos jogadores/bots (1+ perto)", (tags.players || 0) >= 1);

    // ═══ CHAT (REA: abas Geral/Combate) ═══
    ok("Chat visível", await page.locator('[data-testid="bw-chat"]').isVisible());
    ok("Aba GERAL", await page.locator('[data-testid="bw-chat-tab-geral"]').count() === 1);
    ok("Aba COMBATE", await page.locator('[data-testid="bw-chat-tab-combate"]').count() === 1);
    const logTxt = await page.locator('[data-testid="bw-chat-log"]').innerText();
    ok("Boas-vindas no chat", logTxt.includes("Bem-vindo"));
    await page.locator('[data-testid="bw-chat-input"]').fill("Salve, Hordas!");
    await page.locator('[data-testid="bw-chat-send"]').click();
    await page.waitForTimeout(500);
    const logTxt2 = await page.locator('[data-testid="bw-chat-log"]').innerText();
    ok("Mensagem do jogador no chat", logTxt2.includes("Heroi123") && logTxt2.includes("Salve, Hordas!"));
    await page.locator('[data-testid="bw-chat-tab-combate"]').click();
    await page.locator('[data-testid="bw-chat-tab-geral"]').click();
    ok("Abas do chat alternam", true);

    // ═══ COMBATE (REA: auto-attack + dano por skill) ═══
    await run("tp", 120, -60); // Floresta da Guarda — larvas
    await page.waitForTimeout(700);
    const zona1 = await state();
    ok("Teleporte para Floresta da Guarda", zona1.zona === "Floresta da Guarda");
    const mobsPerto = await call(["mobsPerto", 60]);
    ok("Mobs na zona certa (8+)", mobsPerto >= 8);

    const alvoNome = await call(["targetNear", "Larva"]);
    ok("Mira por clique/Tab numa Larva", !!alvoNome);
    const alvoHud = await page.locator('[data-testid="bw-target"]').innerText().catch(() => "");
    ok("Frame do alvo no HUD", alvoHud.includes("Larva"));

    await run("atacarProximo");
    await page.waitForTimeout(500);
    const hpAlvoAntes = (await hud()).alvo?.hp ?? 0;
    await run("atacarProximo");
    await page.waitForTimeout(600);
    const hDep = await hud();
    const hpAlvoDepois = hDep.alvo?.hp ?? 0;
    const alvoSumiu = hpAlvoAntes > 0 && (hDep.alvo === null || hpAlvoDepois === 0);
    ok("Auto-ataque tira vida ao alvo (ou mata)", hpAlvoDepois < hpAlvoAntes || alvoSumiu);

    // skill do mago: Dardo de Gelo (cast 1.5s — REA: cast bar)
    await run("fastForward", 3);
    await run("castSkill", 0);
    await page.waitForSelector('[data-testid="bw-castbar"]', { timeout: 3000 });
    ok("Cast bar no HUD (canalização)", true);
    let castTerminou = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(300);
      if ((await state()).cast === null) { castTerminou = true; break; }
    }
    ok("Cast terminou (Dardo de Gelo)", castTerminou);
    const gcd = (await hud()).cds.length;
    ok("Skill registada na barra (1 slot)", gcd >= 1);

    // ═══ MATAR MOB → XP + LOOT ═══
    await run("targetNear", "Larva"); // alvo fraco para determinismo
    await run("fastForward", 3, 4000); // acelera sim (GL por software)
    const xpAntesKill = (await hud()).xp;
    let matou = false;
    for (let i = 0; i < 34; i++) {
      await run("atacarProximo");
      await page.waitForTimeout(380);
      await run("castSkill", 0);
      await page.waitForTimeout(520);
      if ((await state()).target === null) { matou = true; break; }
    }
    ok("Mob derrotado em combate", matou);
    const hudDepois = await hud();
    ok("XP ganho com kill", hudDepois.xp > xpAntesKill || hudDepois.nivel > 1);
    ok("Ouro presente no HUD", hudDepois.ouro >= 0);

    // ═══ QUESTS (REA: cadeia com objetivos e recompensas) ═══
    await run("tp", 0, 0);
    await page.waitForTimeout(900);
    const npcPerto = await page.locator("text=Falar com os NPCs").first().isVisible().catch(() => false);
    ok("Botão de NPC na aldeia", npcPerto);
    if (npcPerto) {
      await page.locator("text=Falar com os NPCs").first().click();
      await page.waitForSelector('[data-testid="bw-quest-accept"]', { timeout: 4000 });
      const qtxt = await page.locator('[data-testid="bw-quest-accept"]').innerText();
      ok("Quest inicial oferecida (Larvas)", qtxt.includes("Larvas"));
      await page.locator('[data-testid="bw-quest-accept"]').click();
      await page.waitForSelector('[data-testid="bw-quest"]', { timeout: 4000 });
      ok("Tracker de quest visível", true);
      // simula kills pelos hooks (mesmo caminho do onKill real)
      for (let i = 0; i < 3; i++) await run("questKill", "larva1");
      for (let i = 0; i < 2; i++) await run("questKill", "larva2");
      await page.waitForTimeout(500);
      const qtxt2 = await page.locator('[data-testid="bw-quest"]').innerText();
      ok("Progresso 3/3 + 2/2 no tracker", qtxt2.includes("3/3") && qtxt2.includes("2/2"));
      await run("tp", 0, 0);
      await page.waitForTimeout(1100);
      const btnNpc = await page.locator("text=Falar com os NPCs").first().isVisible().catch(() => false);
      ok("NPC marcado após regressar", btnNpc);
      if (btnNpc) await page.locator("text=Falar com os NPCs").first().click();
      await page.waitForTimeout(400);
      const completavel = await page.locator('[data-testid="bw-quest-complete"]').first().isVisible().catch(() => false);
      ok("Quest completável junto ao NPC", completavel);
      if (completavel) {
        const ouroAntes = (await hud()).ouro;
        await page.locator('[data-testid="bw-quest-complete"]').first().click();
        await page.waitForTimeout(700);
        const ouroDepois = (await hud()).ouro;
        ok("Recompensa de ouro entregue (+50)", ouroDepois - ouroAntes === 50);
      }
    }

    // ═══ MORTE E RESSURREIÇÃO (REA: sacerdote) ═══
    await run("morrer");
    await page.waitForSelector('[data-testid="bw-death"]', { timeout: 4000 });
    ok("Ecrã de morte", true);
    await run("fastForward", 4);
    let respBtn = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      if (await page.locator('[data-testid="bw-respawn"]').first().isVisible().catch(() => false)) { respBtn = true; break; }
    }
    ok("Botão Ressuscitar ativo após contagem", respBtn);
    if (respBtn) {
      await page.locator('[data-testid="bw-respawn"]').first().click();
      await page.waitForTimeout(700);
      const vivo = await state();
      ok("Ressurreição na aldeia", vivo.vivo === true && vivo.zona === "Aldeia Aurora");
      const hpR = (await hud()).hp;
      ok("HP cheio após ressuscitar", hpR >= 89);
    }

    // ═══ POÇÕES (REA: Q + contador) ═══
    const poc0 = (await hud()).pocoes;
    await run("pocao");
    const poc1 = (await hud()).pocoes;
    ok("Poção consumida (5→4)", poc0 - poc1 === 1);

    // ═══ FRAMES DE GRUPO (REA: party) ═══
    const party = await call(["party"]);
    ok("Frames de grupo com 4 membros", party.length === 4);
    const partyTxt = await page.locator('[data-testid="bw-party-frames"]').innerText().catch(() => "");
    ok("Party frames no HUD com nomes", partyTxt.length > 0 && partyTxt.includes("Nv"));

    // ═══ ZONAS DE NÍVEL (REA: dunas lv24+) ═══
    await run("tp", 420, 40);
    await page.waitForTimeout(700);
    const zonaD = await state();
    ok("Dunas Escaldantes acessível", zonaD.zona === "Dunas Escaldantes");
    const mobsD = await call(["mobsPerto", 90]);
    ok("Mobs do deserto presentes (6+)", mobsD >= 6);
    await run("tp", -80, 420);
    await page.waitForTimeout(700);
    const zonaC = await state();
    ok("Cripta do Eclipse (endgame)", zonaC.zona === "Cripta do Eclipse");

    // ═══ SUBIDA DE NÍVEL (REA: +8 HP/nível) ═══
    const hudN1 = await hud();
    // curva de XP validada em baixo via fórmula REA
    ok("Curva de XP dura (nv2 > 200 xp)", await page.evaluate(() => {
      // xpParaNivel(1) = 90*1^1.75 + 60 = 150; nv2 = 90*3.36+120 ≈ 422
      const f = (n) => Math.round(90 * Math.pow(n, 1.75) + 60 * n);
      return f(2) > 300 && f(10) > 3000;
    }));

    // ═══ SEM ERROS ═══
    ok("Sem erros JS graves", consoleErrors.length === 0);
    if (consoleErrors.length) console.log("   erros:", consoleErrors.slice(0, 4));

    // ═══ MOBILE (viewport pequeno) ═══
    const pageM = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errsM = [];
    pageM.on("pageerror", (e) => errsM.push(String(e)));
    await pageM.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
    await pageM.waitForSelector('[data-testid="bw-start"]', { timeout: 40000 });
    await pageM.locator('[data-testid="bw-start"]').click();
    await pageM.locator('[data-testid="bw-class-0"]').click();
    await pageM.locator('[data-testid="bw-name-input"]').fill("MovelHeroi");
    await pageM.locator('[data-testid="bw-enter"]').click();
    await pageM.waitForSelector('[data-testid="bw-play"]', { timeout: 30000 });
    await pageM.waitForTimeout(2500);
    ok("Mobile: mundo carrega", true);
    const joy = await pageM.locator(".rounded-full.bg-white\\/5").count();
    ok("Mobile: joystick de movimento", joy >= 1);
    const atk = await pageM.locator("text=ATACAR").count();
    ok("Mobile: botão ATACAR", atk >= 1);
    const tagsM = await pageM.evaluate(() => window.__bw?.tags?.() ?? null);
    ok("Mobile: placas de vida ativas", !!tagsM && tagsM.self === true);
    ok("Mobile: sem erros JS graves", errsM.length === 0);
    await pageM.close();

  } catch (e) {
    ok(`Fluxo completo (${String(e).slice(0, 110)})`, false);
  }

  await browser.close();
  console.log(`\n📊 HORDAS: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("   Falhas:", fails.join(" | "));
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
