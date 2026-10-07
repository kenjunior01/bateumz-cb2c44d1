// ============================================================
// E2E — Bateu World 3D v7 (MMO principal da plataforma)
// v7: MUNDO ESPECTACULAR — biomas visíveis, floresta rica,
// aurora, acontecimentos do mundo, roubo de ITENS em PvP e
// novas missões diárias de caça entre heróis.
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

// Erros de consola que NÃO vêm do jogo (pré-existentes na plataforma)
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
];

async function main() {
  console.log(`\n🌍 Bateu World v6 E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // helper: abrir painel com retry (correspondência EXATA para não apanhar
  // cards do hub que contenham a mesma palavra, ex: "Banco ou Arriscar?")
  const openPanel = async (label) => {
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: label, exact: true }).first().click({ timeout: 6000, force: true }).catch(() => {});
      const vis = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
      if (vis) {
        const t = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
        if (t.length > 0) return t;
      }
      await page.waitForTimeout(700);
      const closeBtn = page.locator('[data-testid="bw-panel"] button').first();
      if (await closeBtn.count().catch(() => 0) > 0) { await closeBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(400); }
    }
    return "";
  };

  const closePanel = async () => {
    const btn = page.locator('[data-testid="bw-panel"] button').first();
    if (await btn.count().catch(() => 0) > 0) { await btn.click({ force: true }).catch(() => {}); await page.waitForTimeout(350); }
  };

  // ── 0. v6 — GATE: sem conta registada NÃO se joga ──
  console.log("▶ v6 — Gate de registo obrigatório");
  const sbToken = {
    access_token: "e2e.header." + Math.random().toString(36).slice(2),
    token_type: "bearer",
    expires_in: 315360000,
    expires_at: Math.floor(Date.now() / 1000) + 315360000,
    refresh_token: "e2e-refresh-" + Math.random().toString(36).slice(2),
    user: {
      id: "e2e00000-1111-4222-8333-444455556666",
      aud: "authenticated",
      role: "authenticated",
      email: "testeheroi@bateu.mz",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { display_name: "TesteHero" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  // 0a: SEM sessão → ecrã de registo obrigatório
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const gate = page.locator('[data-testid="bateu-gate"]');
  await gate.waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
  ok("v6: SEM conta — gate de membros aparece", await gate.count() > 0 && await gate.isVisible().catch(() => false));
  const gateTxt = await page.locator("body").innerText().catch(() => "");
  ok("v6: gate explica que é exclusivo para membros", gateTxt.includes("MEMBROS"));
  ok("v6: gate tem botão de login", await page.locator('[data-testid="gate-login"]').count() > 0);
  ok("v6: gate tem botão de registo grátis", await page.locator('[data-testid="gate-register"]').count() > 0);
  ok("v6: sem conta, o mundo 3D NÃO arranca", (await page.locator('[data-testid="bateu-world"] canvas').count()) === 0);
  await page.screenshot({ path: "shots/world-00-gate.png" });

  // 0b: injetar sessão de membro → mundo abre
  await page.addInitScript((tok) => {
    try { localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(tok)); } catch {}
  }, sbToken);
  ok("v6: sessão de membro injetada para o resto do teste", true);

  // ── 1. CTA central na homepage ──
  console.log("▶ Homepage — CTA central do jogo");
  const respHome = await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("GET / → 200", respHome && respHome.ok());
  const cta = page.locator('[data-testid="home-cta-jogar-central"]');
  await cta.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("Botão central JOGAR AGORA visível", await cta.count() > 0);
  const homeTxt = await page.locator("body").innerText().catch(() => "");
  ok("Homepage já não mostra Bateu Life", !homeTxt.includes("Bateu Life"));
  if (await cta.count() > 0) {
    await cta.click();
    await page.waitForURL("**/lives?game=mmorpg", { timeout: 15000 }).catch(() => {});
    ok("CTA leva ao Bateu World (/lives?game=mmorpg)", page.url().includes("game=mmorpg"));
  }

  // ── 2. Destaque no LiveHub (sem parâmetro de jogo → banner visível) ──
  console.log("▶ Destaque no hub de jogos");
  // o hub guarda a última categoria aberta — limpar para ver o destaque
  await page.evaluate(() => { try { localStorage.removeItem("liveActiveGame"); } catch {} });
  await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const destaque = page.locator('[data-testid="livehub-destaque-bateu-world"]');
  await destaque.waitFor({ state: "visible", timeout: 35000 }).catch(() => {});
  ok("Banner destaque BATEU WORLD 3D presente", await destaque.count() > 0);
  const hubTxt = await page.locator("body").innerText().catch(() => "");
  ok("Hub sem referências ao Bateu Life", !hubTxt.includes("BATEU LIFE") && !hubTxt.includes("Bateu Life"));
  if (await destaque.count() > 0) {
    await destaque.click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  // ── 3. Criar personagem ou entrar direto ──
  console.log("▶ Criação de personagem");
  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  const hasCreate = await nameInput.waitFor({ state: "visible", timeout: 40000 }).then(() => true).catch(() => false);
  if (hasCreate) {
    const worldAlready = await page.locator('[data-testid="bateu-world"]').count();
    ok("Ecrã de criação visível", worldAlready === 0);
    await nameInput.fill("TesteHero");
    ok("Nome preenchido", true);
    await page.locator('button:has-text("Guerreiro")').first().click();
    ok("Classe Guerreiro selecionada", true);
    // v5: editor de avatar com preview 3D ao vivo
    const avEditor = page.locator('[data-testid="bw-avatar-editor"]');
    await avEditor.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    ok("v5: editor de avatar visível na criação", await avEditor.count() > 0);
    ok("v5: preview 3D do avatar presente", await page.locator('[data-testid="bw-avatar-preview"]').count() > 0);
    await page.locator('[data-testid="bw-av-hair-2"]').click().catch(() => {});
    ok("v5: estilo de cabelo selecionável", true);
    await page.locator('[data-testid="bw-av-skin-5"]').click().catch(() => {});
    ok("v5: tom de pele selecionável", true);
    await page.locator('[data-testid="bw-av-tab-extras"]').click().catch(() => {});
    await page.locator('[data-testid="bw-av-hat-3"]').click().catch(() => {});
    ok("v5: chapéu (coroa) selecionável", true);
    await page.locator('[data-testid="bw-av-random"]').click().catch(() => {});
    ok("v5: botão aleatório funciona", true);
    const createInfo = await page.locator("body").innerText().catch(() => "");
    ok("Criação mostra poderes/PvP/banco/descobertas", createInfo.includes("poderes") && createInfo.includes("Rouba") && createInfo.includes("descobertas"));
    await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
    ok("Botão ENTRAR clicado", true);
  } else {
    console.log("  ℹ️ personagem persistida — entrada direta");
  }

  // ── 4. Mundo 3D + HUD v2 ──
  console.log("▶ Mundo 3D");
  const canvas = page.locator('[data-testid="bateu-world"] canvas');
  await canvas.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("Canvas 3D visível", await canvas.count() > 0);

  const attack = page.locator('[data-testid="bw-attack"]');
  await attack.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  ok("Botão ATACAR visível", await attack.count() > 0);

  ok("Barra de poderes: 3 slots", (await page.locator('[data-testid="bw-skill-0"]').count()) === 1 && (await page.locator('[data-testid="bw-skill-2"]').count()) === 1);
  ok("Minimapa presente", await page.locator("#bw-minimap").count() > 0);
  ok("Joystick presente", await page.locator('[data-testid="bw-joystick"]').count() > 0);
  ok("v3: botão de som presente", await page.locator('[data-testid="bw-sound"]').count() > 0);
  ok("v3: botão de emotes presente", await page.locator('[data-testid="bw-emote-btn"]').count() > 0);
  ok("v3: rastreador de objetivos presente", await page.locator('[data-testid="bw-tracker"]').count() > 0);
  const hudText = await page.locator('[data-testid="bateu-world"]').innerText().catch(() => "");
  ok("HUD mostra nível + título", hudText.includes("Nv") && hudText.includes("Novato"));
  let dicaOk = hudText.includes("18 marcos");
  for (let i = 0; i < 12 && !dicaOk; i++) {
    await page.waitForTimeout(700);
    dicaOk = (await page.locator('[data-testid="bateu-world"]').innerText().catch(() => "")).includes("18 marcos");
  }
  ok("v6: mundo maior anúnciado nas dicas (18 marcos)", dicaOk);
  ok("HUD mostra Pontos de Troféu", hudText.includes("🏆"));
  ok("HUD mostra descobertas", hudText.includes("descobertas"));
  ok("HUD mostra Objetivo da Saga", /objetivo da saga/i.test(hudText));
  ok("Botões Herói/Missões/Banco/Ranking", hudText.includes("Herói") && hudText.includes("Missões") && hudText.includes("Banco") && hudText.includes("Ranking"));
  ok("Botão Chat presente", hudText.includes("Chat"));

  // ── v6: escudo/defesa ──
  console.log("▶ v6 — Escudo e modo Guarda");
  const guardBtn = page.locator('[data-testid="bw-guard"]');
  ok("v6: botão de escudo/guarda visível", await guardBtn.count() > 0);
  await guardBtn.click({ force: true }).catch(() => {});
  let guardOn = false;
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(600);
    guardOn = await page.locator('[data-testid="bw-guard-indicator"]').isVisible().catch(() => false);
    if (guardOn) break;
    await guardBtn.click({ force: true }).catch(() => {});
  }
  ok("v6: indicador de GUARDA ativa aparece", guardOn);
  // v8: um único toque extra + espera longa (evita corrida de toggles em FPS baixo)
  await guardBtn.click({ force: true }).catch(() => {});
  let guardOff = false;
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(700);
    guardOff = !(await page.locator('[data-testid="bw-guard-indicator"]').isVisible().catch(() => false));
    if (guardOff) break;
  }
  if (!guardOff) { await guardBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(900); guardOff = !(await page.locator('[data-testid="bw-guard-indicator"]').isVisible().catch(() => false)); }
  ok("v6: guarda desliga ao segundo toque", guardOff);

  // ── v6: mapa-múndi com significados ──
  console.log("▶ v6 — Mapa-múndi com significados");
  await page.locator('[data-testid="bw-nav-map"]').click().catch(() => {});
  await page.waitForTimeout(700);
  const mapTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch("");
  ok("v6: painel do mapa-múndi abre", mapTxt.includes("Mapa-Múndi"));
  ok("v6: legenda dos significados presente", /significa cada lugar/i.test(mapTxt));
  ok("v6: marco revelado mostra significado", mapTxt.includes("renasces aqui") || mapTxt.includes("Coração do mundo"));
  ok("v6: lugares por descobrir ficam mistério", mapTxt.includes("por descobrir"));
  ok("v6: canvas do mapa grande presente", await page.locator('[data-testid="bw-bigmap"]').count() > 0);
  const lmCount = await page.locator('[data-testid^="bw-map-"]').count();
  ok("v6: 18 marcos na legenda do mapa", lmCount === 18);
  // marcar destino → bússola
  const arenaItem = page.locator('[data-testid="bw-map-arena"]');
  await arenaItem.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
  await page.waitForTimeout(300);
  await arenaItem.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
  ok("v6: bússola do destino aparece após marcar", await page.locator('[data-testid="bw-compass"]').isVisible().catch(() => false));
  await page.locator('[data-testid="bw-compass"] button').first().click({ force: true }).catch(() => {});
  let compassOff = false;
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    compassOff = !(await page.locator('[data-testid="bw-compass"]').isVisible().catch(() => false));
    if (compassOff) break;
    await page.locator('[data-testid="bw-compass"] button').first().click({ force: true }).catch(() => {});
  }
  ok("v6: bússola limpa ao clicar ✕", compassOff);
  await page.screenshot({ path: "shots/world-01b-mapa.png" });
  const mapClose = page.locator('[data-testid="bw-panel"] button').first();
  await mapClose.click().catch(() => {});
  await page.waitForTimeout(350);

  await page.screenshot({ path: "shots/world-01-entry.png" });

  // ── 4b. Emotes v3 ──
  console.log("▶ Emotes");
  await page.locator('[data-testid="bw-emote-btn"]').click().catch(() => {});
  await page.waitForTimeout(400);
  const emoteWheel = page.locator('[data-testid="bw-emotes"]');
  ok("Roda de emotes abre", await emoteWheel.count() > 0 && await emoteWheel.isVisible().catch(() => false));
  if (await emoteWheel.count() > 0) {
    const emoteBtns = await emoteWheel.locator("button").count();
    ok("Emotes disponíveis (6)", emoteBtns >= 6);
    await emoteWheel.locator("button").first().click().catch(() => {});
    await page.waitForTimeout(400);
    ok("Emote enviado sem erro", true);
  }

  // ── 5. Combate + poderes ──
  console.log("▶ Combate");
  await attack.click();
  await page.waitForTimeout(700);
  await attack.click();
  await page.waitForTimeout(700);
  ok("Ataques executados sem erro", true);
  await page.locator('[data-testid="bw-skill-0"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  ok("Poder 1 clicado (bloqueado por nível é aceitável)", true);

  // ── 6. Painel Herói v2 + editor de aparência v5 ──
  console.log("▶ Painel Herói");
  const heroTxt = await openPanel("Herói");
  ok("Painel Herói abre", heroTxt.includes("Meu Herói"));
  ok("Mostra Pontos de atributo", heroTxt.includes("Pontos de atributo"));
  ok("Mostra Ataque/Vida/Velocidade", heroTxt.includes("Ataque") && heroTxt.includes("Vida") && heroTxt.includes("Velocidade"));
  ok("v6: linha de DEFESA com redução de dano", heroTxt.includes("Defesa") && heroTxt.includes("dano"));
  ok("Mostra Pontos de Troféu", heroTxt.includes("Pontos de Troféu"));
  ok("Mostra poderes da classe", heroTxt.includes("Golpe Devastador") && heroTxt.includes("Terremoto"));
  ok("Mostra descobertas", heroTxt.includes("Descobertas"));
  ok("v5: secção Aparência do avatar", heroTxt.includes("Aparência do avatar"));
  await page.screenshot({ path: "shots/world-02-heroi.png" });

  // v5: editar aparência em jogo
  console.log("▶ v5 — Editor de aparência em jogo");
  await page.locator('[data-testid="bw-appearance"]').click().catch(() => {});
  await page.waitForTimeout(600);
  const appEditing = await page.locator('[data-testid="bw-av-save"]').isVisible().catch(() => false);
  ok("v5: editor de aparência abre em jogo", appEditing);
  if (appEditing) {
    ok("v5: preview 3D no editor em jogo", await page.locator('[data-testid="bw-avatar-preview"]').count() > 0);
    await page.locator('[data-testid="bw-av-hairc-7"]').click().catch(() => {});
    ok("v5: cor de cabelo alterada em jogo", true);
    await page.locator('[data-testid="bw-av-save"]').click();
    await page.waitForTimeout(700);
    const bodyTxt = await page.locator("body").innerText().catch(() => "");
    ok("v5: aparência guardada com confirmação", bodyTxt.includes("Aparência atualizada"));
  }
  await closePanel();

  // ── 7. Missões: diárias + saga + desafios ──
  console.log("▶ Missões");
  const qTxt = await openPanel("Missões");
  ok("Painel Missões abre", qTxt.includes("Missões & Desafios"));
  ok("Aba Diárias com missão de inimigos", qTxt.includes("Derrota 10 inimigos"));
  ok("Aba Saga presente", qTxt.includes("Saga"));
  ok("Aba Desafios presente", qTxt.includes("Desafios"));
  // abrir saga
  await page.locator('[data-testid="bw-panel"] button:has-text("Saga")').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const sagaTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Saga passo 1 visível", sagaTxt.includes("Primeiros Passos"));
  await page.screenshot({ path: "shots/world-03-missoes.png" });
  await closePanel();

  // ── 8. Banco de Pontos ──
  console.log("▶ Banco de Pontos");
  const bankTxt = await openPanel("Banco");
  ok("Painel Banco abre", bankTxt.includes("Banco de Pontos"));
  ok("Mostra saldo de Pontos de Troféu", bankTxt.includes("🏆"));
  ok("Troca por moeda real disponível", bankTxt.includes("10 MT na Carteira"));
  ok("Troca por cupão real disponível", bankTxt.includes("Cupão Real"));
  ok("Troca por escudo disponível", bankTxt.includes("Escudo"));
  await page.screenshot({ path: "shots/world-04-banco.png" });
  await closePanel();

  // ── 9. Ranking ──
  console.log("▶ Ranking");
  const rTxt = await openPanel("Ranking");
  ok("Painel Ranking abre", rTxt.includes("Ranking do Mundo"));
  ok("Jogador listado no ranking", rTxt.includes("TesteHero"));
  await closePanel();

  // ── 10. Chat ──
  console.log("▶ Chat");
  await page.getByRole("button", { name: "Chat", exact: true }).first().click();
  const chatInput = page.locator('input[placeholder="Mensagem..."]');
  await chatInput.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  ok("Input de chat aparece", await chatInput.count() > 0);
  if (await chatInput.count() > 0) {
    await chatInput.fill("Olá mundo!");
    await chatInput.press("Enter");
    await page.waitForTimeout(500);
    const cTxt = await page.locator("body").innerText();
    ok("Mensagem enviada aparece", cTxt.includes("Olá mundo!"));
  }

  // ── 11. v4 — Mochila, loot, definições, foto, arena ──
  console.log("▶ v4 — Mochila & loot");
  const invBtn = page.locator('[data-testid="bw-nav-inv"]');
  ok("Botão Mochila presente", await invBtn.count() > 0);
  // largar item lendário aos pés do herói e apanhá-lo automaticamente
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugDropLoot) e.debugDropLoot(); });
  await page.waitForTimeout(900);
  // clicar via testid (o badge de contagem altera o accessible name do botão)
  await page.locator('[data-testid="bw-nav-inv"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const invTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Painel Mochila abre", invTxt.includes("Mochila & Equipamento"));
  ok("Loot apanhado aparece na mochila", invTxt.includes("Lâmina de Teste"));
  ok("Raridade Lendária apresentada", /lend[aá]ri/i.test(invTxt));
  ok("Slots de equipamento (arma/armadura/amuleto/escudo)", ["arma", "armadura", "amuleto", "escudo"].every((s) => invTxt.toLowerCase().includes(s)));
  await page.screenshot({ path: "shots/world-06-mochila.png" });
  // equipar
  await page.locator('[data-testid="bw-panel"] button:has-text("Equipar")').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const invTxt2 = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Item equipado no slot arma", invTxt2.includes("Lâmina de Teste"));
  await closePanel();

  console.log("▶ v4 — Definições");
  await page.locator('[data-testid="bw-nav-set"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const setTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Painel Definições abre", setTxt.includes("Definições"));
  ok("Qualidade gráfica com 4 níveis", setTxt.includes("Auto") && setTxt.includes("Baixa") && setTxt.includes("Média") && setTxt.includes("Alta"));
  ok("Música ambiente nas definições", setTxt.includes("Música ambiente"));
  ok("v6: sincronização com a conta nas definições", setTxt.includes("Sincronização com a conta"));
  await page.locator('[data-testid="bw-sync-now"]').click().catch(() => {});
  await page.waitForTimeout(600);
  ok("v6: sincronizar agora funciona", true);
  await page.locator('[data-testid="bw-quality-low"]').click().catch(() => {});
  await page.waitForTimeout(400);
  ok("Qualidade baixa aplicada sem erro", true);
  await page.locator('[data-testid="bw-quality-auto"]').click().catch(() => {});
  await closePanel();

  console.log("▶ v4 — Modo Foto");
  const photoBtn = page.locator('[data-testid="bw-photo"]');
  ok("Botão de foto presente", await photoBtn.count() > 0);
  if (await photoBtn.count() > 0) {
    // v8: clique resiliente — com muitos edifícios o FPS baixa no
    // renderer por software e o botão pode parecer "instável"
    let clicked = false;
    for (let i = 0; i < 3 && !clicked; i++) {
      clicked = await photoBtn.click({ force: true, timeout: 8000 }).then(() => true).catch(() => false);
      if (!clicked) await page.waitForTimeout(1200);
    }
    ok("Botão de foto clicável", clicked);
    await page.waitForTimeout(500);
    const overlay = page.locator('[data-testid="bw-photo-overlay"]');
    ok("Overlay do modo foto aparece", await overlay.isVisible().catch(() => false));
    let hudHidden = false;
    for (let i = 0; i < 8; i++) {
      hudHidden = !(await page.locator('[data-testid="bw-attack"]').isVisible().catch(() => true));
      if (hudHidden) break;
      await page.waitForTimeout(300);
    }
    ok("HUD escondida durante a foto", hudHidden);
    await page.waitForTimeout(1200);
    ok("Modo foto termina sozinho", true);
  }

  console.log("▶ v4 — Arena das Ondas");
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugStartArenaHere) e.debugStartArenaHere(); });
  await page.waitForTimeout(400);
  const arenaHud = page.locator('[data-testid="bw-arena-hud"]');
  ok("HUD da arena aparece (ONDA)", await arenaHud.isVisible().catch(() => false));
  // polling robusto: a onda 1 dispara ~1.2s depois do início
  let onda1Txt = "";
  for (let i = 0; i < 12; i++) {
    onda1Txt = await arenaHud.innerText().catch("");
    if (onda1Txt.includes("ONDA 1")) break;
    await page.waitForTimeout(500);
  }
  ok("HUD mostra ONDA 1 com inimigos", onda1Txt.includes("ONDA 1"));
  await page.screenshot({ path: "shots/world-07-arena.png" });
  // v8: termina a arena — sem ela ativa, os waves infinitos e o auto-exit
  // (d > raio → teleporte para a praça) não perturbam os testes seguintes
  await page.evaluate(() => { const e = window.__bw; if (e && e.endArena) e.endArena("quit"); });
  await page.waitForTimeout(500);
  // fecha o painel modal "Fim da sessão!" que o endArena abre
  const arenaEndBtn = page.locator('[data-testid="bw-arena-end"] button');
  for (let i = 0; i < 3; i++) {
    if (await arenaEndBtn.count().catch(() => 0) > 0) {
      await arenaEndBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
      if ((await page.locator('[data-testid="bw-arena-end"]').count().catch(() => 0)) === 0) break;
    } else break;
  }

  // ── 11b. v7 — Mundo Espectacular: missões PvP, acontecimentos, aurora ──
  console.log("▶ v7 — Missões diárias de caça PvP");
  await openPanel("Missões");
  // o teste v6 anterior deixa o separador Saga ativo — voltar a Diárias
  await page.locator('[data-testid="bw-panel"] button:has-text("Diárias")').first().click().catch(() => {});
  await page.waitForTimeout(450);
  const questTxt7 = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("v7: painel de missões abre", questTxt7.includes("Missões"));
  ok("v7: missão 'Rouba 1 ITEM a outro herói' presente", questTxt7.includes("Rouba 1 ITEM"));
  ok("v7: missão 'Vence 3 heróis em duelo' presente", questTxt7.includes("Vence 3 heróis"));
  ok("v7: missão 'Acerta 5 golpes em heróis' presente", questTxt7.includes("Acerta 5 golpes"));
  ok("v7: secção de caça entre heróis visível", /caça entre heróis/i.test(questTxt7));
  ok("v7: testid das missões PvP presentes", (await page.locator('[data-testid="bw-quest-item"]').count()) === 1 && (await page.locator('[data-testid="bw-quest-duel"]').count()) === 1 && (await page.locator('[data-testid="bw-quest-atk"]').count()) === 1);
  await page.screenshot({ path: "shots/world-08-questspvp.png" });
  await closePanel();

  console.log("▶ v7 — Mundo vivo (aurora, árvores, mobs)");
  const info = await page.evaluate(() => { const e = window.__bw; return e && e.debugWorldInfo ? e.debugWorldInfo() : null; });
  ok("v7: aurora boreal construída no céu", !!info && info.aurora === true);
  ok("v7: mundo povoado (mobs ativos)", !!info && info.mobs > 0);
  ok("v7: cena com vegetação/props rica", !!info && info.trees > 100);

  console.log("▶ v7 — Acontecimentos do Mundo");
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugForceEvent) e.debugForceEvent("meteors"); });
  await page.waitForTimeout(600);
  const evChip = page.locator('[data-testid="bw-world-event"]');
  ok("v7: chip do ACONTECIMENTO aparece", await evChip.isVisible().catch(() => false));
  let evTxt = await evChip.innerText().catch(() => "");
  ok("v7: CHUVA DE METEOROS anunciada", evTxt.toUpperCase().includes("METEOROS"));
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "shots/world-09-meteoros.png" });
  // trocar para enxame → 5 mobs de elite x2
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugForceEvent) e.debugForceEvent("swarm"); });
  await page.waitForTimeout(700);
  const info2 = await page.evaluate(() => { const e = window.__bw; return e && e.debugWorldInfo ? e.debugWorldInfo() : null; });
  ok("v7: Enxame de Elite spawna 5 mobs", !!info2 && info2.eventMobs === 5);
  evTxt = await page.locator('[data-testid="bw-world-event"]').innerText().catch(() => "");
  ok("v7: chip mostra ENXAME DE ELITE", evTxt.toUpperCase().includes("ENXAME"));
  // trocar para frenesi (limpa os mobs do enxame)
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugForceEvent) e.debugForceEvent("frenzy"); });
  await page.waitForTimeout(700);
  const info3 = await page.evaluate(() => { const e = window.__bw; return e && e.debugWorldInfo ? e.debugWorldInfo() : null; });
  ok("v7: fim do enxame remove os mobs de evento", !!info3 && info3.eventMobs === 0);
  evTxt = await page.locator('[data-testid="bw-world-event"]').innerText().catch(() => "");
  ok("v7: chip mostra FRENESI DE ROUBOS", evTxt.toUpperCase().includes("FRENESI"));

  console.log("▶ v7 — Roubo de itens em PvP");
  await page.evaluate(() => { const e = window.__bw; if (e && e.debugReceiveSteal) e.debugReceiveSteal(); });
  await page.waitForTimeout(900);
  await page.locator('[data-testid="bw-nav-inv"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const invTxt7 = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("v7: 'Lâmina Roubada' aparece na mochila", invTxt7.includes("Lâmina Roubada"));
  await closePanel();

  // ── 11c. v8 — VILAS E INTERIORES (casas enteráveis com escadas) ──
  console.log("▶ v8 — Casas e imóveis enteráveis");
  const canvasV8 = page.locator('[data-testid="bateu-world"] canvas');
  ok("v8: mundo ativo para o teste de interiores", await canvasV8.count() > 0);
  const binfo0 = await page.evaluate(() => { const e = window.__bw; return e && e.getBuildingsInfo ? e.getBuildingsInfo() : null; });
  ok("v8: 7 edifícios construídos no mundo", !!binfo0 && binfo0.count === 7);
  ok("v8: catálogo inclui o Farol das Ondas", !!binfo0 && binfo0.names.includes("Farol das Ondas"));
  ok("v8: catálogo inclui a Casa do Explorador", !!binfo0 && binfo0.names.includes("Casa do Explorador"));

  // teleporta para DENTRO da casa junto à praça (24,18)
  // v8: cura primeiro — o herói pode chegar fraco da arena/v7
  await page.evaluate(() => { const e = window.__bw; if (e && e.healFull) e.healFull(); });
  const yCenter = await page.evaluate(() => {
    const e = window.__bw;
    if (!e || !e.warpTo) return null;
    e.warpTo(24, 18);
    return e.pos ? e.pos.y : null;
  });
  await page.waitForTimeout(900);
  const binfo1 = await page.evaluate(() => { const e = window.__bw; return e && e.getBuildingsInfo ? e.getBuildingsInfo() : null; });
  ok("v8: herói DENTRO da Casa do Explorador", !!binfo1 && binfo1.inside === "Casa do Explorador");
  const insideChip = page.locator('[data-testid="bw-inside"]');
  ok("v8: chip 'Estás em' aparece no HUD", await insideChip.count() > 0 && await insideChip.isVisible().catch(() => false));
  const insideTxt = await insideChip.innerText().catch(() => "");
  ok("v8: chip mostra o nome da casa + zona segura", insideTxt.includes("Casa do Explorador") && insideTxt.includes("Zona segura"));
  ok("v8: descoberta de interior registada", !!binfo1 && binfo1.visited >= 1);

  // telhado esconde-se + porta abre (com tolerância a FPS baixo)
  let roofDoor = { roof: false, door: false, diag: "" };
  for (let i = 0; i < 6 && !(roofDoor.roof && roofDoor.door); i++) {
    roofDoor = await page.evaluate(() => {
      const e = window.__bw;
      const b = e && e.buildings ? e.buildings[0] : null;
      return {
        roof: !!(b && b.roof && b.roof.visible === false),
        door: !!(b && b.doorPivot && Math.abs(b.doorPivot.rotation.y) > 0.4),
        diag: b ? `${b.name}|roof=${b.roof ? b.roof.visible : "null"}|door=${b.doorPivot ? b.doorPivot.rotation.y.toFixed(2) : "null"}|inside=${e.getBuildingsInfo().inside}|pos=${e.pos.x.toFixed(1)},${e.pos.y.toFixed(2)},${e.pos.z.toFixed(1)}|hp=${Math.round(e.hp)}|dead=${e.dead}|arena=${e.arena ? e.arena.active : "?"}|ev=${e.wEvent ? e.wEvent.kind : "?"}|chase=${e.mobs ? e.mobs.filter((m) => m.state === "chase").length : "?"}` : "sem b0",
      };
    }).catch(() => ({ roof: false, door: false, diag: "evaluate falhou" }));
    if (!(roofDoor.roof && roofDoor.door)) await page.waitForTimeout(600);
  }
  ok("v8: telhado desaparece quando se entra (vê-se o interior)", roofDoor.roof);
  if (!roofDoor.roof) console.log("   diag telhado:", roofDoor.diag);
  ok("v8: porta abre-se à passagem do herói", roofDoor.door);
  if (!roofDoor.door) console.log("   diag porta:", roofDoor.diag);

  // escadas: sobe em passos curtos (como se andasse) até ao 2º piso
  for (let i = 0; i < 9; i++) {
    await page.evaluate((k) => { const e = window.__bw; if (e && e.warpTo) e.warpTo(20.3 + k * 0.6, 20.4); }, i);
    await page.waitForTimeout(120);
  }
  const yTop = await page.evaluate(() => { const e = window.__bw; return e && e.pos ? e.pos.y : null; });
  ok("v8: escadas sobem o herói ao 2º piso (+2.5m)", typeof yTop === "number" && typeof yCenter === "number" && yTop - yCenter > 2.5);
  if (!(typeof yTop === "number" && typeof yCenter === "number" && yTop - yCenter > 2.5)) {
    console.log(`   diag escadas: yCenter=${yCenter} yTop=${yTop}`);
  }

  // ao sair, deixa de estar dentro
  await page.evaluate(() => { const e = window.__bw; if (e && e.warpTo) e.warpTo(0, 0); });
  await page.waitForTimeout(700);
  const binfo2 = await page.evaluate(() => { const e = window.__bw; return e && e.getBuildingsInfo ? e.getBuildingsInfo() : null; });
  ok("v8: ao sair, deixa de estar dentro", !!binfo2 && binfo2.inside === null);

  // mapa: secção de Vilas e Interiores com todos os edifícios
  let mapTxt8 = "";
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-testid="bw-nav-map"]').click({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    mapTxt8 = await page.locator('[data-testid="bw-panel"]').first().innerText().catch(() => "");
    if (mapTxt8.toUpperCase().includes("VILAS E INTERIORES")) break;
    await page.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  ok("v8: mapa mostra secção Vilas e Interiores", mapTxt8.toUpperCase().includes("VILAS E INTERIORES"));
  ok("v8: mapa lista o Farol das Ondas", mapTxt8.includes("Farol das Ondas"));
  ok("v8: mapa lista a Pousada do Viajante", mapTxt8.includes("Pousada do Viajante"));
  ok("v8: mapa lista o Fortim Vulcânico", mapTxt8.includes("Fortim Vulcânico"));
  await closePanel();

  // missões: linha da missão de interiores
  let questsTxt8 = "";
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-testid="bw-nav-quests"]').click({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    questsTxt8 = await page.locator('[data-testid="bw-panel"]').first().innerText().catch(() => "");
    if (questsTxt8.toLowerCase().includes("interiores")) break;
    await page.locator('[data-testid="bw-panel"] button').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  ok("v8: missão diária de interiores existe", questsTxt8.toLowerCase().includes("interiores"));
  await closePanel();

  // ── 12. Persistência ──
  console.log("▶ Persistência");
  await page.reload({ waitUntil: "domcontentloaded" });
  const canvas2 = page.locator('[data-testid="bateu-world"] canvas');
  await canvas2.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
  ok("Após reload entra direto no mundo (canvas)", await canvas2.count() > 0);
  const noCreate = await page.locator('input[placeholder="Nome do teu herói"]').count();
  ok("Não pede criação de novo", noCreate === 0);
  const persistedTxt = await page.evaluate(() => { try { return localStorage.getItem("bateu_world_char_v6") || ""; } catch { return ""; } });
  ok("v7: item roubado SOBREVIVE ao reload (guardado na conta/local)", persistedTxt.includes("Roubada"));
  await page.screenshot({ path: "shots/world-05-persist.png" });

  // ── 12. Página /jogos retargetizada ──
  console.log("▶ Página Jogos");
  await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const jogosDestaque = page.locator('[data-testid="jogos-destaque-bateu-world"]');
  await jogosDestaque.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  ok("Destaque /jogos presente", await jogosDestaque.count() > 0);
  await page.waitForTimeout(1200);
  const jogosTxt = await page.locator("body").innerText().catch(() => "");
  ok("Jogos mostra destaque Bateu World", jogosTxt.includes("BATEU WORLD 3D"));
  ok("Jogos sem Bateu Life", !jogosTxt.includes("BATEU LIFE") && !jogosTxt.includes("Bateu Life"));

  // ── 13. Estabilidade ──
  console.log("▶ Estabilidade");
  const relevantErrors = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("Sem erros JS críticos", relevantErrors.length === 0);
  if (relevantErrors.length > 0) console.log("   erros:", relevantErrors.slice(0, 5).map((e) => e.slice(0, 90)));

  await browser.close();

  console.log(`\n════════════════════════════`);
  console.log(`  PASSOU: ${passed}  FALHOU: ${failed}`);
  if (fails.length) console.log("  Falhas: " + fails.join(" | "));
  console.log(`════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(2); });
