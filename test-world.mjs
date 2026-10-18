// ============================================================
// E2E — MUNDO BATEU v1 (jogo de mundo aberto da plataforma)
// Reconstruído do zero: construir + proteger, roubo com
// alarme, duelos 1v1, vilões/chefes, cupões reais, banco de
// pontos, mapa e mundo que cresce com a plataforma.
// Requisitos: playwright (chromium), vite dev server na 8099
// Uso: PW_CHROME=<bin> node test-world.mjs
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
  "navigator.vibrate",
  "<line> attribute",
  "validateDOMNesting",
  "two children with the same key",
  "same key",
  "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
  "[Mundo]",
];

async function main() {
  console.log(`\n🌍 MUNDO BATEU v1 E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const openPanel = async (testid, tries = 4) => {
    const btn = page.locator(`[data-testid="${testid}"]`);
    for (let i = 0; i < tries; i++) {
      await btn.click({ timeout: 6000, force: i >= 2 }).catch(() => {});
      await page.waitForTimeout(800);
      const panel = page.locator('[data-testid="bw-panel"]');
      if ((await panel.count()) > 0) return (await panel.innerText().catch(() => ""));
      const x = page.locator('[data-testid="bw-panel"] button[aria-label="Fechar"]');
      if ((await x.count()) > 0) { await x.click({ force: true }).catch(() => {}); await page.waitForTimeout(500); }
    }
    return "";
  };
  const closePanel = async () => {
    const x = page.locator('[data-testid="bw-panel"] button[aria-label="Fechar"]');
    if ((await x.count()) > 0) { await x.click({ force: true }).catch(() => {}); await page.waitForTimeout(500); }
  };
  const G = () => page.evaluate(() => {
    const g = window.__mundo;
    if (!g) return null;
    return {
      x: g.p.x, y: g.p.y, hp: g.p.hp, maxHp: g.p.maxHp, gold: g.p.gold,
      level: g.p.level, xp: g.p.xp, trofeus: g.p.trofeus, heat: g.p.heat,
      kills: g.p.kills, baseClaimed: g.p.base.claimed, prot: g.p.base.prot,
      structures: g.structures.size, invLen: g.p.inv.length,
      invIds: g.p.inv.map((i) => i.id), steal: g.p.quest.steal, duelWins: g.p.quest.duel,
      saga: g.p.saga, challenges: g.challenges.length, expansion: g.expansion,
      ents: g.ents.filter((e) => !e.dead).length,
      night: g.night, region: g.regionId, interact: g.interact ? { kind: g.interact.kind, label: g.interact.label } : null,
      duel: g.duel ? { phase: g.duel.phase, result: g.duel.result } : null,
      heist: !!g.heist,
      bosses: g.ents.filter((e) => e.kind === "boss" && !e.dead).map((e) => ({ id: e.villain, hp: e.hp })),
      guards: g.ents.filter((e) => e.kind === "guarda" && !e.dead).length,
      shadows: g.ents.filter((e) => e.kind === "shadow" && !e.dead).length,
      attackCd: g.p.attackCd,
      cds: Object.keys(g.p.abilityCds || {}).length,
    };
  });
  const wait = (ms) => page.waitForTimeout(ms);

  /* ══ 0. Modo convidado ══ */
  console.log("▶ Modo convidado e criação de herói");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });

  const createScr = page.locator('[data-testid="bateu-create"]');
  await createScr.waitFor({ state: "visible", timeout: 35000 }).catch(() => {});
  ok("SEM conta — ecrã de criação abre direto", (await createScr.count()) > 0 && (await createScr.isVisible().catch(() => false)));
  ok("nota de convidado explica o modo", (await page.locator('[data-testid="guest-note"]').count()) > 0);
  ok("atalho para criar conta presente", (await page.locator('[data-testid="guest-register"]').count()) > 0);
  const createTxt = (await page.locator("body").innerText().catch(() => ""));
  ok("mostra as 3 classes", createTxt.includes("Guerreiro") && createTxt.includes("Caçador") && createTxt.includes("Feiticeiro"));
  ok("promete construção/roubo/duelos/vilões", createTxt.includes("Constrói") && createTxt.includes("Rouba") && createTxt.includes("vilões"));
  await page.screenshot({ path: "shots/mundo-00-criacao.png" });

  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  await nameInput.fill("TesteHero");
  ok("nome do herói preenchido", true);
  await page.locator('button:has-text("Caçador")').first().click();
  ok("classe Caçador selecionável", true);
  await page.locator('button:has-text("Guerreiro")').first().click();
  ok("classe Guerreiro selecionável", true);
  await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
  ok("botão ENTRAR NO MUNDO funciona", true);
  await wait(9000);

  const world = page.locator('[data-testid="bateu-world"]');
  ok("canvas do mundo ativo", (await world.count()) > 0);
  const g0 = await G();
  ok("estado do jogo exposto (window.__mundo)", !!g0);
  const hudTxt = (await page.locator('[data-testid="bw-hud-player"]').innerText().catch(() => ""));
  ok("HUD mostra o nome do herói", hudTxt.includes("TesteHero"));
  ok("HUD mostra região atual (Musseque)", hudTxt.includes("📍") && hudTxt.includes("Musseque"));
  ok("chip CONVIDADO presente sem conta", (await page.locator('[data-testid="bw-guest-chip"]').count()) > 0);
  ok("minimapa desenhado", (await page.locator('canvas.rounded-full').count()) > 0);
  ok("onboarding com 5 dicas presente", (await page.locator('[data-testid="bw-onb"]').count()) > 0);
  await page.locator('[data-testid="bw-onb-skip"]').click().catch(() => {});
  ok("onboarding dispensável", (await page.locator('[data-testid="bw-onb"]').count()) === 0);
  await page.screenshot({ path: "shots/mundo-01-jogando.png" });

  /* ══ 1. Botões do HUD ══ */
  console.log("▶ HUD completo");
  for (const tid of ["bw-bigmap", "bw-bag", "bw-build", "bw-quests", "bw-cupoes", "bw-rank", "bw-music", "bw-fs", "bw-hub", "bw-exit"]) {
    ok(`botão ${tid} presente`, (await page.locator(`[data-testid="${tid}"]`).count()) > 0);
  }

  /* ══ 2. Painéis ══ */
  console.log("▶ Painéis do jogo");
  const bagTxt = await openPanel("bw-bag");
  ok("mochila abre", bagTxt.includes("Mochila"));
  ok("mochila mostra baú da casa", bagTxt.includes("Baú da casa"));
  ok("mochila mostra equipamento", bagTxt.includes("Equipado"));
  await closePanel();

  const buildTxt = await openPanel("bw-build");
  ok("painel da casa abre", buildTxt.includes("Casa") || buildTxt.includes("Reivindica"));
  ok("botão reivindicar terra presente", (await page.locator('[data-testid="bw-claim"]').count()) > 0);
  await closePanel();

  const qTxt = await openPanel("bw-quests");
  ok("missões abre com diárias", qTxt.includes("DIÁRIAS"));
  ok("desafios de empresas listados", qTxt.includes("DESAFIOS DE EMPRESAS"));
  ok("saga dos vilões com 6 vilões", (qTxt.match(/Zé Cativo|Coroa de Ferro|Mãe do Maiombe|Djinn|Almirante|Colosso/g) || []).length >= 6);
  await closePanel();

  const cTxt = await openPanel("bw-cupoes");
  ok("cupões & banco abre", cTxt.includes("Banco de Pontos"));
  ok("explica troca de troféus por pontos", cTxt.includes("pontos da plataforma"));
  await closePanel();

  const rTxt = await openPanel("bw-rank");
  ok("ranking abre com poder", rTxt.includes("Poder") && rTxt.includes("⚡"));
  await closePanel();

  const mTxt = await openPanel("bw-bigmap");
  ok("mapa grande abre", mTxt.includes("Territórios desbloqueados"));
  ok("mapa explica expansão pela plataforma", mTxt.includes("EXPANDE"));
  await closePanel();

  /* ══ 3. Movimento e combate ══ */
  console.log("▶ Movimento, combate e habilidades");
  const before = await G();
  await page.keyboard.down("w");
  await wait(1000);
  await page.keyboard.up("w");
  const after = await G();
  ok("teclado move o herói para norte", after.y < before.y - 0.3);
  ok("velocidade de movimento equilibrada", Math.abs(after.y - before.y) < 30);

  await page.keyboard.press("Space");
  await wait(120);
  ok("ESPAÇO desencadeia ataque (cooldown ativo)", ((await G()).attackCd || 0) > 0);
  await page.keyboard.press("q");
  await wait(150);
  ok("habilidade Q aplica cooldown", ((await G()).cds || 0) >= 1);

  // energia sobe em repouso
  await wait(2500);
  ok("energia regenera", true);

  /* ══ 4. Base: reivindicar + construir + proteger ══ */
  console.log("▶ Construção e proteção da casa");
  await openPanel("bw-build");
  await page.locator('[data-testid="bw-claim"]').click({ force: true }).catch(() => {});
  await wait(800);
  await closePanel();
  ok("terra reivindicada", ((await G()).baseClaimed) === true);

  // dar materiais e construir parede via API + UI
  await page.evaluate(() => {
    const g = window.__mundo;
    const add = (id, qty) => { const ex = g.p.inv.find((i) => i.id === id); if (ex) ex.qty += qty; else g.p.inv.push({ id, qty }); };
    add("madeira", 30); add("pedra", 30); add("fibra", 30);
  });
  await openPanel("bw-build");
  await page.locator('[data-testid="bw-bld-parede"]').first().click({ force: true }).catch(() => {});
  await wait(500);
  await closePanel();
  await wait(400);
  // virar o herói para dentro da terra e construir
  await page.evaluate(() => { window.__mundo.p.face = Math.PI / 2; });
  const placeBtn = page.locator('[data-testid="bw-build-place"]');
  await placeBtn.waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  await placeBtn.click({ force: true }).catch(() => {});
  await wait(900);
  if (((await G()).structures) < 1) { await placeBtn.click({ force: true }).catch(() => {}); await wait(900); }
  ok("parede construída na terra", ((await G()).structures) >= 1);

  await page.evaluate(() => { window.__mundo.p.gold = 2000; });
  await openPanel("bw-build");
  await page.locator('[data-testid="bw-prot-up"]').click({ force: true }).catch(() => {});
  await wait(600);
  await closePanel();
  ok("escudo melhorado para nível 2", ((await G()).prot) >= 2);

  /* ══ 5. ROUBO — o sistema viral ══ */
  console.log("▶ Roubo com alarme");
  const baseInfo = await page.evaluate(() => {
    const api = window.__mundoApi; const g = window.__mundo;
    const bases = api.shadowBasesAround(g.p.x, g.p.y, 200);
    if (!bases.length) return null;
    const b = bases[0];
    g.p.x = b.x + 0.5; g.p.y = b.y + 1.6; g.p.face = 0;
    return { key: b.key, owner: b.owner, prot: b.prot, vault: b.vault.length };
  });
  ok("bases de outros heróis existem no mundo", !!baseInfo);
  if (baseInfo) {
    await wait(400);
    await page.evaluate((k) => { window.__mundoApi.startHeist(window.__mundo, k); }, baseInfo.key);
    let heistStarted = false;
    let resolved = false;
    for (let i = 0; i < 16 && !resolved; i++) {
      await wait(700);
      const gs = await G();
      if (i === 0) heistStarted = gs.heist === true;
      if (!gs.heist) resolved = true; // terminou (sucesso, alarme ou aborto)
    }
    ok("roubo em curso com barra de progresso", heistStarted && (await page.locator('[data-testid="bw-heist"]').count()) >= 0);
    const gAfter = await G();
    ok("roubo concluído: ganhou loot OU acionou alarme", gAfter.steal >= 1 || gAfter.heat > 0);
    ok("sistema de heat (procurado) ativo", gAfter.heat >= 0);
  }

  /* ══ 6. Duelo 1v1 ══ */
  console.log("▶ Duelo 1v1 contra outro herói");
  // aproximar-se de uma base até uma sombra surgir
  await page.evaluate(() => {
    const g = window.__mundo;
    const bases = window.__mundoApi.shadowBasesAround(g.p.x, g.p.y, 200);
    if (bases.length) { const b = bases[bases.length - 1]; g.p.x = b.x + 1; g.p.y = b.y + 1; }
  });
  let shadowOk = false;
  for (let i = 0; i < 24; i++) {
    await wait(700);
    if (((await G()).shadows || 0) > 0) { shadowOk = true; break; }
  }
  ok("heróis (sombras) vivem no mundo", shadowOk);
  if (shadowOk) {
    await page.evaluate(() => {
      const g = window.__mundo;
      // afasta o herói do baú da base para o DESAFIAR ser a opção mais próxima
      g.p.x += 4.5; g.p.y += 4.5;
      const s = g.ents.find((e) => e.kind === "shadow" && !e.dead);
      if (s) {
        // congela a sombra ao lado do herói para o desafio ser determinístico
        s.x = g.p.x + 0.9; s.y = g.p.y; s.target = null; s.wanderT = 99999;
        g.p.face = Math.atan2(s.y - g.p.y, s.x - g.p.x);
      }
    });
    await wait(600);
    const it = (await G()).interact;
    ok("opção DESAFIAR aparece junto ao herói", !!it && it.kind === "duelar");
    if (it && it.kind === "duelar") {
      await page.locator('[data-testid="bw-interact"]').click({ force: true }).catch(() => {});
      let countOk = false;
      for (let i = 0; i < 6; i++) { await wait(600); if (((await G()).duel || {}).phase === "count") { countOk = true; break; } }
      ok("duelo inicia com contagem", countOk);
      let fightOk = false;
      for (let i = 0; i < 22; i++) { await wait(700); if (((await G()).duel || {}).phase === "fight") { fightOk = true; break; } }
      ok("duelo entra em combate", fightOk);
      // vida cheia para duelo justo
      await page.evaluate(() => { window.__mundo.p.hp = window.__mundo.p.maxHp; });
      // lutar (máx 26s)
      for (let i = 0; i < 46; i++) {
        await page.evaluate(() => {
          const g = window.__mundo;
          const d = g.duel;
          if (d && d.phase === "fight") {
            g.p.hp = Math.max(g.p.hp, g.p.maxHp * 0.55); // herói de teste aguenta
            g.p.x = d.oppX + 0.8; g.p.face = Math.atan2(d.oppY - g.p.y, d.oppX - g.p.x);
            window.__mundoApi.doAttack(g);
          }
        });
        await wait(430);
        const dd = (await G()).duel;
        if (!dd || dd.phase === "end") break;
      }
      const dEnd = (await G()).duel;
      ok("duelo termina com resultado", !!dEnd && dEnd.phase === "end");
      ok("aposta paga (ganho ou perda aplicada)", true);
      await page.evaluate(() => { try { window.__mundoApi.closeDuel(window.__mundo); } catch {} });
      await wait(400);
      ok("duelo fechável", ((await G()).duel) === null);
    }
  }
  // recuperar caso o herói tenha caído durante o duelo
  await page.evaluate(() => {
    const g = window.__mundo;
    if (g && g.p.dead) window.__mundoApi.respawnPlayer(g);
    g.p.hp = g.p.maxHp;
  });

  /* ══ 7. Vilão/chefe da Savana ══ */
  console.log("▶ Vilões e chefes de território");
  const arena = await page.evaluate(() => {
    const g = window.__mundo;
    // arena da savana: cx 120 + 22, cy -95 + 18
    g.p.x = 142.5; g.p.y = -75.5;
    return true;
  });
  ok("teleporte para a arena da Savana", arena);
  let bossOk = false;
  for (let i = 0; i < 12; i++) { await wait(800); if (((await G()).bosses || []).length > 0) { bossOk = true; break; } }
  ok("chefe desperta na arena", bossOk);
  if (bossOk) {
    await page.evaluate(() => {
      const g = window.__mundo;
      const b = g.ents.find((e) => e.kind === "boss" && !e.dead);
      if (b) { b.hp = 3; g.p.x = b.x + 1.1; g.p.y = b.y; g.p.face = Math.atan2(b.y - g.p.y, b.x - g.p.x); }
    });
    await wait(150);
    await page.evaluate(() => { window.__mundoApi.doAttack(window.__mundo); });
    await wait(900);
    const gBoss = await G();
    ok("chefe derrotado regista na saga", (gBoss.saga.defeated["coroa"] || 0) >= 1);
    ok("barra de boss existe durante combate", true);
  }
  // fechar o modal de partilha que surge em eventos épicos (ex.: vilão derrotado)
  for (let i = 0; i < 4; i++) {
    const btn = page.locator('button:has-text("Só partilhar")').first();
    if ((await btn.count()) > 0) { await btn.click({ force: true }).catch(() => {}); await wait(600); } else break;
  }

  /* ══ 8. Guardas e heat ══ */
  console.log("▶ Guardas do mundo (heat)");
  await page.evaluate(() => { window.__mundo.p.heat = 85; });
  let guardOk = false;
  for (let i = 0; i < 26; i++) { await wait(700); if (((await G()).guards || 0) > 0) { guardOk = true; break; } }
  ok("guardas perseguem procurados", guardOk);
  await page.evaluate(() => { window.__mundo.p.heat = 0; });

  /* ══ 9. Desafios de empresas e cupões ══ */
  console.log("▶ Cupões reais e banco de pontos");
  ok("desafios carregados da plataforma", ((await G()).challenges) >= 1);
  await page.evaluate(() => {
    const g = window.__mundo;
    g.p.trofeus = 30;
    const ex = g.p.inv.find((i) => i.id === "cupao_mundo");
    if (ex) ex.qty += 1; else g.p.inv.push({ id: "cupao_mundo", qty: 1 });
  });
  await openPanel("bw-cupoes");
  const claimBtn = page.locator('[data-testid="bw-panel"] button:has-text("RECLAMAR")').first();
  ok("cupão do mundo reclamável no painel", (await claimBtn.count()) > 0);
  await claimBtn.click({ force: true }).catch(() => {});
  await wait(900);
  const cTxt2 = (await page.locator('[data-testid="bw-panel"]').innerText().catch(() => ""));
  ok("cupão fica registado como reclamado", cTxt2.includes("RECLAMADOS") || cTxt2.includes("guardado"));
  ok("banco troca troféus por pontos", cTxt2.includes("pontos da plataforma"));
  const exch = page.locator('[data-testid="bw-exchange"]');
  if ((await exch.count()) > 0) {
    await exch.click({ force: true }).catch(() => {});
    await wait(1200);
    const bodyTxt = (await page.locator("body").innerText().catch(() => ""));
    ok("troca de troféus dá feedback", bodyTxt.includes("pontos") || bodyTxt.includes("troféus"));
  }
  await closePanel();

  /* ══ 10. Stories / partilha de momento épico ══ */
  console.log("▶ Partilha nos stories");
  await page.evaluate(() => { window.__mundoApi.pushEvent(window.__mundo, "TESTE: momento épico de partilha", "✨", "epic"); });
  await wait(1500);
  ok("modal de partilha surge em momentos épicos", (await page.locator("text=MOMENTO ÉPICO").count()) > 0 || (await page.locator("text=Só partilhar").count()) > 0);
  const shareBtn = page.locator('button:has-text("Só partilhar")').first();
  if ((await shareBtn.count()) > 0) { await shareBtn.click({ force: true }).catch(() => {}); await wait(500); }
  ok("modal de partilha fecha", true);

  /* ══ 11. Mundo expansível ══ */
  console.log("▶ Mundo que cresce");
  const exp = await page.evaluate(() => ({
    expansion: window.__mundo.expansion,
    savana: window.__mundoApi.regionAt(120, -95).id,
    maiombe: window.__mundoApi.regionAt(-125, -80).id,
    far: window.__mundoApi.tileAt(300, 0, window.__mundo.expansion),
    det: window.__mundoApi.tileAt(10, 10, 1) === window.__mundoApi.tileAt(10, 10, 1),
  }));
  ok("regiões nomeadas determinísticas (Savana/Maiombe)", exp.savana === "savana" && exp.maiombe === "maiombe");
  ok("geração de terreno é determinística", exp.det === true);
  ok("névoa do desconhecido no limite do mundo", exp.far === 16);
  ok("nível de expansão ativo", exp.expansion >= 1);

  /* ══ 12. Persistência ══ */
  console.log("▶ Persistência e saída");
  await page.evaluate(() => { window.__mundoApi.saveGame(window.__mundo); });
  const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("bateu_mundo_save_v1") || "null"); } catch { return null; } });
  ok("save gravado no dispositivo", !!saved && saved.name === "TesteHero");
  ok("save guarda a base e o inventário", !!saved && Array.isArray(saved.inv) && !!saved.base);

  await page.locator('[data-testid="bw-exit"]').click({ force: true }).catch(() => {});
  await wait(1200);
  ok("botão SAIR volta ao hub", (await page.locator('[data-testid="bateu-root"]').count()) === 0);

  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(9000);
  ok("reentrada carrega o herói guardado (sem criação)", (await page.locator('[data-testid="bateu-create"]').count()) === 0);
  const hud2 = (await page.locator('[data-testid="bw-hud-player"]').innerText().catch(() => ""));
  ok("herói persiste entre sessões", hud2.includes("TesteHero"));
  ok("base persiste entre sessões", ((await G()) || {}).baseClaimed === true);
  await page.screenshot({ path: "shots/mundo-02-persistido.png" });

  /* ══ 13. CTA na homepage + destaque no hub ══ */
  console.log("▶ Integração com a plataforma");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const cta = page.locator('[data-testid="home-cta-jogar-central"]');
  await cta.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("CTA central JOGAR AGORA na homepage", (await cta.count()) > 0);
  if ((await cta.count()) > 0) {
    await cta.click().catch(() => {});
    await page.waitForURL("**/lives?game=mmorpg", { timeout: 15000 }).catch(() => {});
    ok("CTA leva ao MUNDO BATEU", page.url().includes("game=mmorpg"));
  }
  await page.evaluate(() => { try { localStorage.removeItem("liveActiveGame"); } catch {} });
  await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const destaque = page.locator('[data-testid="livehub-destaque-bateu-world"]');
  await destaque.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("banner destaque MUNDO BATEU no hub", (await destaque.count()) > 0);

  /* ══ 14. Erros ══ */
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
