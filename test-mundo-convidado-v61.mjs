// ============================================================
// v61 — MUNDO 3D SEM REGISTO (item 2 do roadmap «Bateu corrections»)
//
// A) Núcleo (Node): o contrato «convidado vs conta» do mundoConvidado.ts
//    — modoDoUtilizador (só id verificável = conta), deveReportarUniversal
//    (o BATEU RPG tem progressão própria no aparelho), e o perímetro
//    CONTA-APENAS (tabelas que o convidado NUNCA toca + escritas).
// B) E2E (browser REAL, vite 8099, SEM login em lado nenhum):
//    · hub honesto para convidado (aviso «o progresso fica neste aparelho»)
//    · RPG jogável sem conta: jogar → andar → SAIR → save no APARELHO +
//      leaderboard local; ZERO pedidos ao perímetro de conta;
//      ZERO escritas no PostgREST; ZERO chamadas a edge functions
//    · o kit universal NÃO recebe o mmorpg (progressão própria do aparelho)
//    · persistência: recarregar → CONTINUAR → jogando (round-trip convidado)
//    · Aetheria sem conta: entrar → voar/andar → voltar → mesmo perímetro
//    · recompensas de conta PROTEGIDAS: /wallet e /my-points → /login
//    · ZERO pageerror em toda a sessão
//
// Fonte dos padrões: docs/REA-mundo-convidado-v61.md
// Uso: PW_CHROME=<chromium> node test-mundo-convidado-v61.mjs        (vite 8099)
//      PW_CHROME=<chromium> node test-mundo-convidado-v61.mjs --sem-e2e   (só A)
// ============================================================
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
let passed = 0, failed = 0, skipped = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const skip = (name, motivo) => { skipped++; console.log(`  ⏭️  ${name} (${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🧭 v61 MUNDO 3D SEM REGISTO — ${RAIZ}\n`);

  // ════════ A) NÚCLEO (Node) ════════
  const { modoDoUtilizador, deveReportarUniversal, tabelaDeRest, eContaApenas,
          eEscritaRest, funcaoContaApenas, TABELAS_CONTA_APENAS, FUNCOES_CONTA_APENAS,
          JOGOS_SEM_KIT, ROTULO_CONVIDADO }
    = await import(`${RAIZ}/src/lib/mundoConvidado.ts`);

  console.log("— A1) modoDoUtilizador: só um id VERIFICÁVEL é conta (padrão convidado v58)");
  ok("null → convidado", modoDoUtilizador(null) === "convidado");
  ok("undefined → convidado", modoDoUtilizador(undefined) === "convidado");
  ok("objeto sem id (podre) → convidado", modoDoUtilizador({}) === "convidado");
  ok("id string vazia → convidado", modoDoUtilizador({ id: "" }) === "convidado");
  ok("id não-string (número) → convidado", modoDoUtilizador({ id: 42 }) === "convidado");
  ok("id só com espaços (podre) → convidado (padrão jogoValido: podre recusado)", modoDoUtilizador({ id: "   " }) === "convidado");
  ok("id real (uuid de sessão) → conta", modoDoUtilizador({ id: "9f1c..." }) === "conta");
  ok("o tipo devolvido é só convidado|conta", ["convidado", "conta"].includes(modoDoUtilizador({ id: "x" })));

  console.log("— A2) deveReportarUniversal: o BATEU RPG NÃO alimenta o kit (progressão própria)");
  ok("null (sem jogo ativo) → false", deveReportarUniversal(null) === false);
  ok("\"\" → false", deveReportarUniversal("") === false);
  ok("mmorpg → false (PerfilRpg no aparelho)", deveReportarUniversal("mmorpg") === false);
  ok("aetheria → true (kit do aparelho)", deveReportarUniversal("aetheria") === true);
  ok("jogo normal do hub → true", deveReportarUniversal("tap") === true);
  ok("exceções injetáveis (aetheria fora)", deveReportarUniversal("aetheria", ["aetheria"]) === false);
  ok("exceções injetáveis (mmorpg volta a reportar)", deveReportarUniversal("mmorpg", []) === true);
  ok("JOGOS_SEM_KIT é o padrão real do hub", JOGOS_SEM_KIT.includes("mmorpg"));

  console.log("— A3) o perímetro CONTA-APENAS (tabelas que o convidado NUNCA toca)");
  ok("as 4 tabelas do perímetro estão declaradas",
     ["spin_wheel_games", "ia_historico", "engagement_points", "rpg_characters"]
       .every((tb) => TABELAS_CONTA_APENAS.includes(tb)));
  ok("lives NÃO é conta-apenas (leitura pública)", !eContaApenas("https://x.supabase.co/rest/v1/lives?select=*"));
  ok("profiles_public NÃO é conta-apenas", !eContaApenas("https://x.supabase.co/rest/v1/profiles_public?select=id"));

  console.log("— A4) classificação de pedidos (o MESMO contrato que o E2E usa)");
  ok("tabela de um URL rest real", tabelaDeRest("https://x.supabase.co/rest/v1/spin_wheel_games?select=*&created_by=eq.1") === "spin_wheel_games");
  ok("URL não-rest → null", tabelaDeRest("https://x.supabase.co/auth/v1/user") === null);
  ok("URL vazio → null", tabelaDeRest("") === null);
  ok("spin_wheel_games → conta-apenas", eContaApenas("https://x.supabase.co/rest/v1/spin_wheel_games?select=*"));
  ok("ia_historico → conta-apenas", eContaApenas("https://x.supabase.co/rest/v1/ia_historico"));
  ok("engagement_points → conta-apenas", eContaApenas("https://x.supabase.co/rest/v1/engagement_points"));
  ok("rpg_characters → conta-apenas", eContaApenas("https://x.supabase.co/rest/v1/rpg_characters"));
  ok("GET no PostgREST NÃO é escrita", !eEscritaRest("https://x.supabase.co/rest/v1/lives?select=*", "GET"));
  ok("POST no PostgREST é escrita", eEscritaRest("https://x.supabase.co/rest/v1/ia_historico", "POST"));
  ok("PATCH/DELETE são escritas", eEscritaRest("https://x.supabase.co/rest/v1/ia_historico", "PATCH") && eEscritaRest("https://x.supabase.co/rest/v1/ia_historico", "DELETE"));
  ok("OPTIONS/HEAD não são escritas", !eEscritaRest("https://x.supabase.co/rest/v1/lives", "OPTIONS") && !eEscritaRest("https://x.supabase.co/rest/v1/lives", "HEAD"));
  ok("escrita fora do rest não conta como escrita rest", !eEscritaRest("https://api.radio-browser.info/json/states", "POST"));
  ok("rótulo do convidado é constante honesta", ROTULO_CONVIDADO === "Convidado");

  console.log("— A5) funções edge CONTA-APENAS (exigem JWT — 401 sem sessão)");
  ok("as 10 funções do perímetro estão declaradas",
     ["award-engagement-points", "spin-wheel-spin", "raffle-draw", "mascot-chat",
      "mascot-message", "nemotron-chat", "nemotron-embed", "nemotron-visao",
      "paypal-create-order", "paypal-capture-order"]
       .every((f) => FUNCOES_CONTA_APENAS.includes(f)));
  ok("award-engagement-points → conta-apenas", funcaoContaApenas("https://x.supabase.co/functions/v1/award-engagement-points"));
  ok("spin-wheel-spin → conta-apenas", funcaoContaApenas("https://x.supabase.co/functions/v1/spin-wheel-spin"));
  ok("nemotron-chat → conta-apenas", funcaoContaApenas("https://x.supabase.co/functions/v1/nemotron-chat"));
  ok("paypal-config NÃO é conta-apenas (config PÚBLICA do SDK)", !funcaoContaApenas("https://x.supabase.co/functions/v1/paypal-config"));
  ok("track-ambassador-visit NÃO é conta-apenas (contador público)", !funcaoContaApenas("https://x.supabase.co/functions/v1/track-ambassador-visit"));
  ok("URL não-function → false", !funcaoContaApenas("https://x.supabase.co/rest/v1/lives") && !funcaoContaApenas(""));
  ok("por CAMINHO, não por domínio (estrito)", funcaoContaApenas("https://api.exemplo.com/functions/v1/award-engagement-points"));

  const SEM_E2E = process.argv.includes("--sem-e2e");
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    // ════════ B) E2E (browser REAL, SEM login em lado nenhum) ════════
    const { chromium } = await import("playwright");
    const BASE = process.env.BASE_URL || "http://localhost:8099";
    const PW = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: PW });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(15000);

    mkdirSync(join(RAIZ, "shots-v61"), { recursive: true });

    // pageerror SEMPRE é problema; console-error passa pelo filtro NOISE da casa
    const NOISE = [
      "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
      "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
      "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
      "permission", "AbortError", "play() failed", "user gesture", "401",
      "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
      "GPU stall due to ReadPixels",
    ];
    const pageErrors = [];
    const consoleErros = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("console", (m) => {
      const t = m.text();
      if (NOISE.some((n) => t.includes(n))) return;
      if (m.type() === "error") consoleErros.push(t);
    });

    // LEDGER de pedidos: cada pedido da sessão classificado pelo NÚCLEO v61
    // (o MESMO contrato que o hub consome — não é reimplementação do teste)
    const pedidos = [];
    page.on("request", (req) => {
      pedidos.push({ metodo: req.method(), url: req.url() });
    });
    const contaApenasFeitos = () => pedidos.filter((p) => eContaApenas(p.url));
    const escritasRestFeitas = () => pedidos.filter((p) => eEscritaRest(p.url, p.metodo));
    const funcoesContaFeitas = () => pedidos.filter((p) => funcaoContaApenas(p.url));
    const funcoesPublicas = () => pedidos.filter((p) => /\/functions\/v1\//.test(p.url) && !funcaoContaApenas(p.url));
    const relatorioPerimetro = () => {
      const ca = contaApenasFeitos(), es = escritasRestFeitas(), fnc = funcoesContaFeitas();
      console.log(`    perímetro: rest-conta-apenas=${ca.length} escritas-rest=${es.length} funções-conta=${fnc.length} · leituras públicas rest=${pedidos.filter((p) => tabelaDeRest(p.url) && !eContaApenas(p.url) && !eEscritaRest(p.url, p.metodo)).length} · funções públicas=${funcoesPublicas().length}`);
      if (ca.length) console.log("    ❗ conta-apenas:", ca.map((p) => `${p.metodo} ${p.url.slice(0, 110)}`).join(" | "));
      if (es.length) console.log("    ❗ escritas:", es.map((p) => `${p.metodo} ${p.url.slice(0, 110)}`).join(" | "));
      if (fnc.length) console.log("    ❗ funções-conta:", fnc.map((p) => `${p.metodo} ${p.url.slice(0, 110)}`).join(" | "));
      return ca.length === 0 && es.length === 0 && fnc.length === 0;
    };

    // clique determinístico a ~2 fps de raster (padrão v57/v60)
    const clicar = async (sel, timeout = 10000) => {
      const forcado = await page.click(sel, { timeout, force: true }).then(() => true).catch(() => false);
      if (forcado) return true;
      return page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel).catch(() => false);
    };
    const kitPlays = (jogo) => page.evaluate((j) => {
      try {
        const raw = localStorage.getItem("bateu:kit-progress-v1");
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p?.games?.[j]?.plays ?? 0;
      } catch { return null; }
    }, jogo);

    try {
      console.log("— B1) o hub SEM conta: aviso honesto «o progresso fica neste aparelho»");
      await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const banner = await page.waitForSelector('[data-testid="livehub-convidado"]', { timeout: 40000 }).then(() => true).catch(() => false);
      ok("o hub mostra o aviso do convidado (não esconde o mundo)", banner);
      const textoAviso = banner ? await page.evaluate(() => document.querySelector('[data-testid="livehub-convidado"]')?.textContent ?? "") : "";
      ok("o aviso é HONESTO: diz que o progresso fica no aparelho (não «precisas de conta para guardar»)",
         ["aparelho", "device", "dispositivo", "appareil", "डिवाइस"].some((p) => textoAviso.includes(p)));
      ok("o aviso NÃO mente sobre guardar pontuações (a mentira antiga sumiu)", !textoAviso.includes("para guardar as tuas pontuações"));
      ok("aterrissagem sem conta: ZERO pedidos ao perímetro de conta", relatorioPerimetro());
      await page.screenshot({ path: `${RAIZ}/shots-v61/convidado-hub.png` }).catch(() => {});

      console.log("— B2) BATEU RPG sem conta: jogar → andar → SAIR (zero perímetro)");
      await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const menuOk = await page.waitForSelector('[data-testid="rpg-jogar"]', { timeout: 40000 }).then(() => true).catch(() => false);
      ok("o menu do RPG abre SEM login (?game=mmorpg)", menuOk);
      ok("o menu oferece NOVA LENDA (a porta do convidado não está trancada)", await page.evaluate(() => !!document.querySelector('[data-testid="rpg-jogar"]')));
      await clicar('[data-testid="rpg-jogar"]');
      await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 20000 }).catch(() => {});
      ok("NOVA LENDA → fase jogando (sem conta)", await page.evaluate(() => window.__rpg?.motor?.fase === "jogando"));
      await page.keyboard.down("w");
      await sleep(2200);
      await page.keyboard.up("w");
      ok("o herói andou pelo mundo (frente aplicada sem erros)", await page.evaluate(() => window.__rpg?.motor?.fase === "jogando"));
      const pausou = await clicar('[data-testid="rpg-btn-pausa"]');
      await sleep(700);
      const saiu = pausou && await clicar('[data-testid="rpg-sair"]');
      await sleep(1800);
      ok("SAIR devolve ao hub (a sessão do convidado termina limpa)", saiu && !!(await page.$('[data-testid="livehub-destaque-bateu-world"]')));
      ok("o save do RPG existe NO APARELHO (bateu_rpg_save)", await page.evaluate(() => !!localStorage.getItem("bateu_rpg_save")));
      const lbTemRpg = await page.evaluate(() => {
        try {
          const lb = JSON.parse(localStorage.getItem("liveLeaderboard") || "[]");
          return lb.some((e) => e.game === "BATEU RPG");
        } catch { return false; }
      });
      ok("o fim da sessão entrou no leaderboard LOCAL (não numa tabela)", lbTemRpg);
      const playsMmorpg = await kitPlays("mmorpg");
      ok("o kit universal NÃO recebeu o mmorpg (progressão própria do aparelho)", playsMmorpg === null || playsMmorpg === 0);
      ok("sessão RPG inteira: ZERO pedidos ao perímetro de conta · ZERO escritas rest · ZERO funções conta-apenas", relatorioPerimetro());
      await page.screenshot({ path: `${RAIZ}/shots-v61/rpg-convidado-hub.png` }).catch(() => {});

      console.log("— B3) o progresso do convidado SOBREVIVE ao recarregar (CONTINUAR)");
      await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const cont = await page.waitForSelector('[data-testid="rpg-continuar"]', { timeout: 40000 }).then(() => true).catch(() => false);
      ok("CONTINUAR aparece sem conta (o save do aparelho foi lido)", cont);
      await clicar('[data-testid="rpg-continuar"]');
      await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 20000 }).catch(() => {});
      ok("CONTINUAR → fase jogando (a lenda do convidado segue)", await page.evaluate(() => window.__rpg?.motor?.fase === "jogando"));
      const pausou2 = await clicar('[data-testid="rpg-btn-pausa"]');
      await sleep(700);
      await pausou2 && await clicar('[data-testid="rpg-sair"]');
      await sleep(1800);
      ok("saída limpa da 2.ª sessão (hub de volta)", !!(await page.$('[data-testid="livehub-destaque-bateu-world"]')));

      console.log("— B4) Aetheria sem conta: entrar → andar → voltar (mesmo perímetro)");
      const antesAetheria = pedidos.length;
      await page.goto(`${BASE}/lives?game=aetheria`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const entrou = await page.waitForSelector(".aetheria-enter", { timeout: 40000 }).then(() => true).catch(() => false);
      ok("a Aetheria abre sem login (?game=aetheria)", entrou);
      await clicar(".aetheria-enter");
      await sleep(1200);
      await page.keyboard.down("w");
      await sleep(1000);
      await page.keyboard.up("w");
      ok("Aetheria em mundo (sem erros no voo/andar)", (await page.$(".aetheria-exit, .aetheria-back")) !== null);
      await clicar(".aetheria-exit").catch(() => {});
      await sleep(1500);
      const ca = contaApenasFeitos().length, es = escritasRestFeitas().length, fnc = funcoesContaFeitas().length;
      ok("sessão Aetheria: ZERO pedidos ao perímetro · ZERO escritas · ZERO funções conta-apenas", ca === 0 && es === 0 && fnc === 0);
      const janela = pedidos.slice(antesAetheria);
      const janelaLimpa = janela.every((p) => !eContaApenas(p.url) && !eEscritaRest(p.url, p.metodo) && !funcaoContaApenas(p.url));
      ok(`os ${janela.length} pedidos da JANELA Aetheria são só públicos/locais`, janelaLimpa);
      await page.screenshot({ path: `${RAIZ}/shots-v61/aetheria-convidado.png` }).catch(() => {});

      console.log("— B5) as recompensas de CONTA continuam PROTEGIDAS para o convidado");
      await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      await page.waitForURL("**/login**", { timeout: 15000 }).catch(() => {});
      ok("/wallet → redireciona para /login (ProtectedRoute intacta)", page.url().includes("/login"));
      await page.goto(`${BASE}/my-points`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      await page.waitForURL("**/login**", { timeout: 15000 }).catch(() => {});
      ok("/my-points (pontos de engajamento) → /login", page.url().includes("/login"));
      ok("todo o passeio do convidado: ZERO pedidos ao perímetro de conta · ZERO escritas · ZERO funções conta-apenas", relatorioPerimetro());

      console.log("— B6) higiene da sessão inteira (convidado de ponta a ponta)");
      ok("ZERO pageerror em toda a sessão", pageErrors.length === 0);
      if (pageErrors.length) console.log("    ❗ pageerrors:", pageErrors.slice(0, 3).join(" | "));
      ok("ZERO erros de consola fora do ruído da casa", consoleErros.length === 0);
      if (consoleErros.length) console.log("    ❗ consola:", consoleErros.slice(0, 5).join(" | "));
    } catch (e) {
      failed++; fails.push("E2E explodiu: " + String(e).slice(0, 200));
      console.log("  ❌ E2E explodiu:", String(e).slice(0, 400));
      await page.screenshot({ path: `${RAIZ}/shots-v61/explosao.png` }).catch(() => {});
    } finally {
      await browser.close().catch(() => {});
    }
  }

  console.log(`\n═══ v61: ${passed} verdes · ${failed} vermelhos · ${skipped} skips ═══`);
  if (fails.length) { console.log("FALHAS:"); for (const f of fails) console.log("  · " + f); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
