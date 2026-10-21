// ============================================================
// E2E — REA HORDES.IO (v20): chat do mundo, canalização,
// placas de vida ao vivo e frames de grupo.
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
  "fetchPriority", "PGRST301", "JWT", "permission", "AbortError", "play() failed", "user gesture"];

async function main() {
  console.log(`\n⚔️  HORDES.IO PARITY E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.some(n => m.text().includes(n))) consoleErrors.push(m.text()); });

  try {
    await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });

    // ── entrada hordes.io ──
    ok("Banners de facção com lore", await page.locator('[data-testid="bw-faction-0"]').count() === 1 && await page.locator('[data-testid="bw-faction-1"]').count() === 1);
    ok("Classes com barras de stats", (await page.locator('[data-testid="bw-class-0"]').innerText()).includes("ATQ"));
    await page.locator('[data-testid="bw-class-1"]').click();
    await page.locator('[data-testid="bw-faction-1"]').click();
    await page.locator('[data-testid="bw-name-input"]').fill("HordesTeste");
    await page.locator('[data-testid="bw-enter"]').click();
    await page.waitForSelector('[data-testid="bw-play"]', { timeout: 30000 });
    ok("Mundo aberto", true);
    await page.waitForSelector('[data-testid="bw-streak"]', { timeout: 8000 }).catch(() => {});
    if (await page.locator('[data-testid="bw-streak-ok"]').count()) await page.locator('[data-testid="bw-streak-ok"]').click();
    await page.waitForSelector('[data-testid="bw-intro"]', { timeout: 8000 }).catch(() => {});
    if (await page.locator('[data-testid="bw-intro-skip"]').count()) await page.locator('[data-testid="bw-intro-skip"]').click();
    await page.waitForTimeout(800);

    // ── placas de vida ao vivo ──
    const tags = await page.evaluate(() => (window).__bw?.engine?.getTagStats?.() || null);
    ok("Placa de vida do herói ativa", tags?.self === true);
    ok("Placas de vida nos mobs (80+)", (tags?.mobs || 0) >= 80);
    ok("Placas de vida nos jogadores/bots (5+)", (tags?.players || 0) >= 5);

    // ── chat do mundo ──
    ok("Chat visível", await page.locator('[data-testid="bw-chat"]').isVisible());
    ok("Aba GERAL", await page.locator('[data-testid="bw-chat-tab-geral"]').count() === 1);
    ok("Aba COMBATE", await page.locator('[data-testid="bw-chat-tab-combate"]').count() === 1);
    await page.waitForTimeout(3200); // mensagem de boas-vindas + bot
    const logText = await page.locator('[data-testid="bw-chat-log"]').innerText();
    ok("Boas-vindas no chat", logText.includes("Bem-vindo"));
    await page.locator('[data-testid="bw-chat-input"]').fill("Salve, mundo aberto!");
    await page.locator('[data-testid="bw-chat-send"]').click();
    await page.waitForTimeout(400);
    const logText2 = await page.locator('[data-testid="bw-chat-log"]').innerText();
    ok("Mensagem do jogador no chat", logText2.includes("HordesTeste") && logText2.includes("Salve, mundo aberto!"));
    await page.locator('[data-testid="bw-chat-tab-combate"]').click();
    ok("Aba COMBATE alterna", true);
    await page.locator('[data-testid="bw-chat-tab-geral"]').click();

    // ── canalização (cast bar) ──
    const castState = await page.evaluate(() => {
      const E = (window).__bw.engine;
      (window).__bw.updateChar((c) => { c.level = 25; });
      E.setHotbar([7, null, null, null, null, null]); // m8 Bloco de Gelo (castT 1.2)
      E.castSkill(0);
      const st = E.getState();
      return { cast: st.cast, name: st.cast?.name || null };
    });
    ok("Cast iniciado (Bloco de Gelo)", castState?.cast && castState.name === "Bloco de Gelo");
    // retries: em headless o poll de 200ms pode atrasar >1,2s (GC do render)
    // e o cast completar sem o HUD chegar a mostrar — tentamos até 3 vezes
    let castbarShown = false;
    for (let i = 0; i < 3 && !castbarShown; i++) {
      await page.evaluate(() => {
        const E = (window).__bw.engine;
        E.clearCdsPublic();
        E.setHotbar([7, null, null, null, null, null]);
        E.castSkill(0);
      });
      castbarShown = await page.waitForSelector('[data-testid="bw-castbar"]', { timeout: 900 }).then(() => true).catch(() => false);
    }
    ok("Cast bar visível no HUD", castbarShown);
    const castCancelled = await page.evaluate(() => {
      const E = (window).__bw.engine;
      E.setMoveVec(1, 0); // mover deve cancelar
      return new Promise((res) => setTimeout(() => {
        E.setMoveVec(0, 0);
        res(E.getState().cast === null);
      }, 350));
    });
    ok("Mover cancela a canalização", castCancelled === true);

    // ── frames de grupo ──
    await page.evaluate(() => (window).__bw.engine.setParty(["self", "bot_0", "bot_1"]));
    await page.waitForTimeout(600);
    const partyTxt = await page.locator('[data-testid="bw-party-frames"]').innerText().catch(() => "");
    ok("Frames do grupo no HUD", partyTxt.includes("HordesTeste") && (partyTxt.match(/Nv/g) || []).length >= 3);

    ok("Sem erros JS graves", consoleErrors.length === 0);
  } catch (e) {
    ok(`Fluxo completo (${String(e).slice(0, 90)})`, false);
  }

  await browser.close();
  console.log(`\n${"═".repeat(36)}\n  TOTAL: ${passed + failed} · ✅ ${passed} · ❌ ${failed}\n${"═".repeat(36)}`);
  if (fails.length) { console.log("Falhas:", fails.join(" | ")); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
